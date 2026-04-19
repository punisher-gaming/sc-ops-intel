"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  bodyPartFromClass,
  capitalize,
  dismantleReturns,
  dismantleTimeSeconds,
  displayName,
  fetchBlueprint,
  fetchBlueprintIdsWithSources,
  fetchBlueprintMissionFamilies,
  fetchBlueprintSystems,
  fetchBlueprints,
  fetchBlueprintSources,
  fetchBlueprintsThatYield,
  fetchKnownDismantleMaterials,
  weaponKindFromBlueprint,
  fetchOwnedBlueprintIds,
  formatCraftTime,
  markBlueprintOwned,
  prettySource,
  prettyType,
  unmarkBlueprintOwned,
  uniqueValues,
  type Blueprint,
  type BlueprintSource,
  type SystemName,
} from "@/lib/blueprints";
import { useUser } from "@/lib/supabase/hooks";
import { tokenMatch } from "@/lib/search";
import { FilterMultiSelect } from "./FilterMultiSelect";
import { CURRENT_PATCH } from "./PatchPill";
import { IntelPanel } from "./IntelPanel";
import { ItemImage, ItemImageCredit } from "./ItemImage";

type SortKey = "name" | "output_item_type" | "output_grade" | "craft_time_seconds";

const PAGE_SIZE = 50;

export function BlueprintsBrowser() {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <BlueprintDetail id={id} />;
  return <BlueprintList />;
}

function BlueprintList() {
  const { user } = useUser();
  const [rows, setRows] = useState<Blueprint[] | null>(null);
  const [idsWithSources, setIdsWithSources] = useState<Set<string>>(new Set());
  const [systems, setSystems] = useState<{
    byBlueprint: Map<string, Set<SystemName>>;
    systems: SystemName[];
  }>({ byBlueprint: new Map(), systems: [] });
  const [selectedSystem, setSelectedSystem] = useState<SystemName | "">("");
  const [missionFamilies, setMissionFamilies] = useState<{
    byBlueprint: Map<string, Set<string>>;
    families: string[];
  }>({ byBlueprint: new Map(), families: [] });
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [selectedSubtypes, setSelectedSubtypes] = useState<Set<string>>(new Set());
  const [selectedBodyParts, setSelectedBodyParts] = useState<Set<string>>(new Set());
  const [selectedFamilies, setSelectedFamilies] = useState<Set<string>>(new Set());
  const [selectedWeaponKinds, setSelectedWeaponKinds] = useState<Set<string>>(new Set());
  const [grade, setGrade] = useState("");
  // Material-yield filter: pick a refined material (Aluminum, Tungsten, …)
  // and the list narrows to blueprints whose dismantle returns it. We load
  // the materials catalog once on mount, and on selection fetch the matching
  // blueprint IDs (server-side jsonb containment) into a Set we intersect
  // with the in-memory row list.
  const [materials, setMaterials] = useState<Array<{ name: string; count: number }>>([]);
  const [yieldsMaterial, setYieldsMaterial] = useState("");
  const [yieldsMatchIds, setYieldsMatchIds] = useState<Set<string> | null>(null);
  const [yieldsLoading, setYieldsLoading] = useState(false);
  const [onlyObtainable, setOnlyObtainable] = useState(false);
  const [hideOwned, setHideOwned] = useState(false);
  // Inverse of hideOwned — narrow the list to ONLY blueprints the user has
  // marked owned. Mutually exclusive with hideOwned (toggling one auto-clears
  // the other below) since you can't both show only owned and hide owned.
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchBlueprints()
      .then(setRows)
      .catch((e) => setErr(e.message ?? String(e)));
    fetchBlueprintIdsWithSources()
      .then(setIdsWithSources)
      .catch(() => {});
    fetchBlueprintMissionFamilies()
      .then(setMissionFamilies)
      .catch(() => {});
    fetchBlueprintSystems()
      .then(setSystems)
      .catch(() => {});
    fetchKnownDismantleMaterials()
      .then((ms) => setMaterials(ms.map((m) => ({ name: m.name, count: m.count }))))
      .catch(() => {});
  }, []);

  // When the material filter changes, re-fetch the matching blueprint IDs.
  useEffect(() => {
    if (!yieldsMaterial) {
      setYieldsMatchIds(null);
      return;
    }
    setYieldsLoading(true);
    fetchBlueprintsThatYield(yieldsMaterial)
      .then((bps) => setYieldsMatchIds(new Set(bps.map((b) => b.id))))
      .catch(() => setYieldsMatchIds(new Set()))
      .finally(() => setYieldsLoading(false));
  }, [yieldsMaterial]);

  useEffect(() => {
    if (!user) {
      setOwned(new Set());
      return;
    }
    fetchOwnedBlueprintIds(user.id).then(setOwned).catch(() => {});
  }, [user?.id]);

  async function toggleOwned(bpId: string) {
    if (!user) return;
    const next = new Set(owned);
    if (next.has(bpId)) {
      next.delete(bpId);
      setOwned(next);
      try {
        await unmarkBlueprintOwned(user.id, bpId);
      } catch {
        // revert on failure
        next.add(bpId);
        setOwned(new Set(next));
      }
    } else {
      next.add(bpId);
      setOwned(next);
      try {
        await markBlueprintOwned(user.id, bpId);
      } catch {
        next.delete(bpId);
        setOwned(new Set(next));
      }
    }
  }

  const types = useMemo(
    () => (rows ? uniqueValues(rows, "output_item_type") : []),
    [rows],
  );
  const subtypes = useMemo(
    () => (rows ? uniqueValues(rows, "output_item_subtype") : []),
    [rows],
  );
  const bodyParts = useMemo(() => {
    if (!rows) return [];
    const set = new Set<string>();
    for (const r of rows) {
      const p = bodyPartFromClass(r.output_item_class);
      if (p) set.add(p);
    }
    return Array.from(set).sort();
  }, [rows]);
  // Derive weapon kinds present in the catalog so the filter dropdown
  // only shows categories that actually have hits.
  const weaponKinds = useMemo(() => {
    if (!rows) return [];
    const set = new Set<string>();
    for (const r of rows) {
      const k = weaponKindFromBlueprint(r);
      if (k) set.add(k);
    }
    return Array.from(set).sort();
  }, [rows]);
  const grades = useMemo(
    () => (rows ? uniqueValues(rows, "output_grade") : []),
    [rows],
  );

  const filtered = useMemo(() => {
    if (!rows) return [];
    const qLower = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (selectedTypes.size > 0 && !selectedTypes.has(r.output_item_type ?? "")) return false;
      if (selectedSubtypes.size > 0 && !selectedSubtypes.has(r.output_item_subtype ?? "")) return false;
      if (selectedBodyParts.size > 0) {
        const part = bodyPartFromClass(r.output_item_class);
        if (!part || !selectedBodyParts.has(part)) return false;
      }
      if (selectedWeaponKinds.size > 0) {
        const kind = weaponKindFromBlueprint(r);
        if (!kind || !selectedWeaponKinds.has(kind)) return false;
      }
      if (grade && r.output_grade !== grade) return false;
      if (yieldsMatchIds && !yieldsMatchIds.has(r.id)) return false;
      if (hideOwned && owned.has(r.id)) return false;
      if (onlyOwned && !owned.has(r.id)) return false;
      if (onlyObtainable) {
        const hasSource = idsWithSources.has(r.id);
        const isDefault = r.available_by_default === true;
        if (!hasSource && !isDefault) return false;
      }
      if (selectedFamilies.size > 0) {
        const fams = missionFamilies.byBlueprint.get(r.id);
        if (!fams) return false;
        let match = false;
        for (const f of selectedFamilies) {
          if (fams.has(f)) {
            match = true;
            break;
          }
        }
        if (!match) return false;
      }
      if (selectedSystem) {
        // System inferred from source_name/source_key keywords. If a
        // blueprint has no system tags at all, hide it under a system
        // filter (we have no signal it belongs there).
        const sys = systems.byBlueprint.get(r.id);
        if (!sys || !sys.has(selectedSystem)) return false;
      }
      if (qLower) {
        const hay = `${displayName(r)} ${r.output_item_class ?? ""} ${r.output_item_type ?? ""} ${r.key}`;
        if (!tokenMatch(hay, qLower)) return false;
      }
      return true;
    });
    const mul = sortDir === "asc" ? 1 : -1;
    out.sort((a, b) => {
      let av: unknown;
      let bv: unknown;
      if (sortKey === "name") {
        av = displayName(a).toLowerCase();
        bv = displayName(b).toLowerCase();
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * mul;
      return String(av).localeCompare(String(bv)) * mul;
    });
    return out;
  }, [rows, idsWithSources, missionFamilies, systems, selectedSystem, owned, q, selectedTypes, selectedSubtypes, selectedBodyParts, selectedFamilies, selectedWeaponKinds, grade, yieldsMatchIds, onlyObtainable, hideOwned, onlyOwned, sortKey, sortDir]);

  useEffect(() => {
    setPage(0);
  }, [q, selectedTypes, selectedSubtypes, selectedBodyParts, selectedFamilies, selectedWeaponKinds, grade, yieldsMaterial, onlyObtainable, hideOwned, onlyOwned, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir(k === "craft_time_seconds" ? "asc" : "asc");
    }
  }

  return (
    <div className="container-wide">
      <div className="page-header">
        <div className="accent-label">Catalog</div>
        <h1>Blueprints</h1>
        <p>
          Every crafting recipe from patch {CURRENT_PATCH}. Search or filter,
          click any row to see required materials and where to obtain it.
        </p>
      </div>

      {/* filters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search blueprints…"
          className="input"
          style={{ flex: "1 1 260px", minWidth: 240 }}
        />
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="select" style={{ width: 140 }}>
          <option value="">All grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        {/* Star system filter — inferred from source_name + source_key
            keywords on blueprint_sources rows. "All systems" is the
            default; picking one hides blueprints with no system tag. */}
        {systems.systems.length > 0 && (
          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value as SystemName | "")}
            className="select"
            style={{ width: 160 }}
            title="Show only blueprints obtainable in this star system"
          >
            <option value="">All systems</option>
            {systems.systems.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        {/* Yields-this-material filter — derived from blueprint Dismantle.Returns.
            Counts in parens are blueprints known to yield each material. */}
        <select
          value={yieldsMaterial}
          onChange={(e) => setYieldsMaterial(e.target.value)}
          className="select"
          style={{ width: 220 }}
          title="Show only blueprints that dismantle into this ore/material"
        >
          <option value="">Yields any material</option>
          {materials.map((m) => (
            <option key={m.name} value={m.name}>
              Yields {m.name} ({m.count})
            </option>
          ))}
        </select>
        {yieldsLoading && (
          <span style={{ alignSelf: "center", color: "var(--text-dim)", fontSize: "0.8rem" }}>
            Searching…
          </span>
        )}
      </div>

      {/* Filter dropdowns — collapses what used to be 4–5 rows of pills
          into a single flex row. Each shows its label + selection count
          and opens to a checkbox list. */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        {types.length > 0 && (
          <FilterMultiSelect
            label="Types"
            options={types.map((t) => ({ value: t, label: prettyType(t) }))}
            selected={selectedTypes}
            onChange={setSelectedTypes}
          />
        )}
        {weaponKinds.length > 0 && (
          <FilterMultiSelect
            label="Weapon kinds"
            options={weaponKinds.map((k) => ({ value: k, label: capitalize(k) }))}
            selected={selectedWeaponKinds}
            onChange={setSelectedWeaponKinds}
          />
        )}
        {subtypes.length > 0 && (
          <FilterMultiSelect
            label="Subtypes"
            options={subtypes.map((s) => ({ value: s, label: s }))}
            selected={selectedSubtypes}
            onChange={setSelectedSubtypes}
          />
        )}
        {bodyParts.length > 0 && (
          <FilterMultiSelect
            label="Armor parts"
            options={bodyParts.map((p) => ({ value: p, label: capitalize(p) }))}
            selected={selectedBodyParts}
            onChange={setSelectedBodyParts}
          />
        )}
        {missionFamilies.families.length > 0 && (
          <FilterMultiSelect
            label="Mission families"
            options={missionFamilies.families.slice(0, 30).map((f) => ({ value: f, label: f }))}
            selected={selectedFamilies}
            onChange={setSelectedFamilies}
          />
        )}
      </div>

      {/* Boolean toggles */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <ToggleChip
          label="Only with known source"
          checked={onlyObtainable}
          onChange={setOnlyObtainable}
          count={rows ? rows.filter((r) => idsWithSources.has(r.id) || r.available_by_default).length : null}
        />
        {user && (
          <>
            <ToggleChip
              label="Only show mine"
              checked={onlyOwned}
              onChange={(v) => {
                setOnlyOwned(v);
                if (v) setHideOwned(false); // Mutually exclusive with hideOwned
              }}
              count={owned.size > 0 ? owned.size : null}
              countLabel="owned"
            />
            <ToggleChip
              label="Hide owned"
              checked={hideOwned}
              onChange={(v) => {
                setHideOwned(v);
                if (v) setOnlyOwned(false);
              }}
              count={owned.size > 0 ? owned.size : null}
              countLabel="owned"
            />
          </>
        )}
      </div>

      {/* result count + pagination info */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          color: "var(--text-dim)",
          fontSize: "0.8rem",
        }}
      >
        <div>
          {rows ? `${filtered.length.toLocaleString()} of ${rows.length.toLocaleString()} blueprints` : "…"}
        </div>
        {pageCount > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="btn btn-ghost"
              style={{ height: 28, padding: "0 10px", fontSize: "0.8rem" }}
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Prev
            </button>
            <span>
              Page {page + 1} / {pageCount}
            </span>
            <button
              className="btn btn-ghost"
              style={{ height: 28, padding: "0 10px", fontSize: "0.8rem" }}
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {err && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.3)",
            color: "var(--alert)",
            marginBottom: 16,
          }}
        >
          Couldn&apos;t load blueprints: {err}
        </div>
      )}

      {!rows && !err && (
        <div style={{ color: "var(--text-muted)", padding: "2rem 0" }}>Loading…</div>
      )}

      {rows && (
        <div className="table-shell">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {user && (
                  <th
                    style={{
                      padding: "12px 8px",
                      width: 44,
                      color: "var(--text-dim)",
                      fontSize: "0.7rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontWeight: 500,
                    }}
                    title="Mark as owned"
                  >
                    ✓
                  </th>
                )}
                <Th onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir}>
                  Name
                </Th>
                <Th
                  onClick={() => toggleSort("output_item_type")}
                  active={sortKey === "output_item_type"}
                  dir={sortDir}
                  width={180}
                >
                  Type
                </Th>
                <Th
                  onClick={() => toggleSort("output_grade")}
                  active={sortKey === "output_grade"}
                  dir={sortDir}
                  width={90}
                >
                  Grade
                </Th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-dim)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", width: 100, fontWeight: 500 }}>
                  Groups
                </th>
                <Th
                  onClick={() => toggleSort("craft_time_seconds")}
                  active={sortKey === "craft_time_seconds"}
                  dir={sortDir}
                  width={100}
                  align="right"
                >
                  Craft
                </Th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((b) => (
                <tr key={b.id} style={owned.has(b.id) ? { opacity: 0.55 } : undefined}>
                  {user && (
                    <td
                      style={{
                        padding: "14px 8px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        textAlign: "center",
                      }}
                    >
                      <button
                        type="button"
                        aria-label={owned.has(b.id) ? "Mark as not owned" : "Mark as owned"}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleOwned(b.id);
                        }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          border: `1px solid ${owned.has(b.id) ? "var(--success)" : "rgba(255,255,255,0.2)"}`,
                          background: owned.has(b.id) ? "rgba(74,222,128,0.15)" : "transparent",
                          color: owned.has(b.id) ? "var(--success)" : "transparent",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          lineHeight: 1,
                          padding: 0,
                        }}
                      >
                        ✓
                      </button>
                    </td>
                  )}
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.875rem" }}>
                    <Link
                      href={`/blueprints?id=${encodeURIComponent(b.id)}`}
                      style={{ color: "var(--accent)", fontWeight: 500 }}
                    >
                      {displayName(b)}
                    </Link>
                    {b.output_item_class && b.output_item_class !== displayName(b) && (
                      <div style={{ color: "var(--text-dim)", fontSize: "0.75rem", marginTop: 2 }}>
                        {b.output_item_class}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {prettyType(b.output_item_type)}
                    {b.output_item_subtype && (
                      <div style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>
                        {b.output_item_subtype}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.875rem" }}>
                    <GradeBadge grade={b.output_grade} />
                  </td>
                  <td style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                    {b.required_groups?.length ?? 0}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      fontSize: "0.875rem",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                      textAlign: "right",
                    }}
                  >
                    {formatCraftTime(b.craft_time_seconds)}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={user ? 6 : 5} style={{ padding: "3rem 0", textAlign: "center", color: "var(--text-dim)" }}>
                    No blueprints match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  width,
  align = "left",
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  width?: number;
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: "12px 16px",
        textAlign: align,
        color: active ? "var(--accent)" : "var(--text-dim)",
        fontSize: "0.7rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: "pointer",
        userSelect: "none",
        width,
        fontWeight: 500,
      }}
    >
      {children}
      {active && <span style={{ marginLeft: 6 }}>{dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span style={{ color: "var(--text-dim)" }}>—</span>;
  const map: Record<string, string> = {
    "1": "badge-muted",
    "2": "badge-success",
    "3": "badge-accent",
    "4": "badge-warn",
    "5": "badge-alert",
  };
  const cls = map[grade] ?? "badge-muted";
  return <span className={`badge ${cls}`}>G{grade}</span>;
}

function BlueprintDetail({ id }: { id: string }) {
  const [blueprint, setBlueprint] = useState<Blueprint | null | undefined>(undefined);
  const [sources, setSources] = useState<BlueprintSource[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bp, srcs] = await Promise.all([
          fetchBlueprint(id),
          fetchBlueprintSources(id),
        ]);
        if (cancelled) return;
        setBlueprint(bp);
        setSources(srcs);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (err) {
    return (
      <div className="container">
        <div
          style={{
            margin: "3rem 0",
            padding: "1rem 1.25rem",
            borderRadius: 6,
            background: "rgba(255,107,107,0.08)",
            border: "1px solid rgba(255,107,107,0.3)",
            color: "var(--alert)",
          }}
        >
          {err}
        </div>
      </div>
    );
  }

  if (blueprint === undefined) {
    return (
      <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>
        Loading…
      </div>
    );
  }

  if (blueprint === null) {
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ color: "var(--alert)", marginBottom: 12 }}>Blueprint not found</div>
          <Link href="/blueprints" style={{ color: "var(--accent)" }}>← Back to all blueprints</Link>
        </div>
      </div>
    );
  }

  const groups = blueprint.required_groups ?? [];

  return (
    <div className="container-wide">
      <div style={{ paddingTop: "1.5rem" }}>
        <Link href="/blueprints" className="label-mini" style={{ color: "var(--accent)" }}>
          ← All blueprints
        </Link>
      </div>

      <div
        className="page-header"
        style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "220px 1fr", alignItems: "start" }}
      >
        <div>
          <ItemImage
            kind="item"
            candidates={[
              blueprint.output_item_name,
              displayName(blueprint),
              blueprint.output_item_class,
            ]}
            alt={displayName(blueprint)}
            size={400}
          />
          <ItemImageCredit />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="accent-label">
            {prettyType(blueprint.output_item_type)}
            {blueprint.output_item_subtype && ` · ${blueprint.output_item_subtype}`}
            {blueprint.output_grade && ` · Grade ${blueprint.output_grade}`}
          </div>
          <h1>{displayName(blueprint)}</h1>
          {blueprint.output_item_class && blueprint.output_item_class !== displayName(blueprint) && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-dim)" }}>
              {blueprint.output_item_class}
            </p>
          )}
        </div>
      </div>

      {/* HOW TO OBTAIN — prominent, answers the first question */}
      <HowToObtainPanel blueprint={blueprint} sources={sources} />

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginBottom: "1rem" }}>
        <Stat label="Craft time" value={formatCraftTime(blueprint.craft_time_seconds)} />
        <Stat label="Grade" value={blueprint.output_grade ?? "—"} />
        <Stat label="Material groups" value={String(groups.length)} />
        <Stat label="Kind" value={blueprint.kind ?? "—"} />
      </div>

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 14 }}>
            Required material groups
          </div>
          {groups.length === 0 ? (
            <div style={{ color: "var(--text-dim)" }}>No material requirements recorded.</div>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none" }}>
              {groups.map((g, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{g.name ?? g.key ?? "—"}</div>
                    {g.modifier_count > 0 && (
                      <div className="label-mini" style={{ marginTop: 2 }}>
                        {g.modifier_count} stat modifier{g.modifier_count === 1 ? "" : "s"}
                      </div>
                    )}
                  </div>
                  <div style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
                    ×{g.required_count ?? "?"}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p style={{ color: "var(--text-dim)", fontSize: "0.78rem", marginTop: 14, lineHeight: 1.5 }}>
            Each group is a slot — the game lets you fill it with one of
            several compatible parts. The part you pick affects output stats.
          </p>
        </div>

        <DismantlePanel blueprint={blueprint} />
      </div>

      <IntelPanel entityType="blueprint" entityId={blueprint.id} entityName={displayName(blueprint)} />

      <div className="label-mini" style={{ marginTop: "2rem", textAlign: "center" }}>
        Last synced{" "}
        {blueprint.last_synced_at
          ? new Date(blueprint.last_synced_at).toISOString().replace("T", " ").slice(0, 19) + " UTC"
          : "—"}
        {" · "}
        Patch {blueprint.game_version ?? CURRENT_PATCH}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      <div className="label-mini" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function HowToObtainPanel({ blueprint, sources }: { blueprint: Blueprint; sources: BlueprintSource[] }) {
  const hasSources = sources.length > 0;
  const isDefault = blueprint.available_by_default === true;

  // Title + top-line state
  let state: "default" | "sources" | "unknown";
  if (hasSources) state = "sources";
  else if (isDefault) state = "default";
  else state = "unknown";

  const headline =
    state === "default"
      ? "Available by default"
      : state === "sources"
        ? `Obtainable from ${sources.length} known source${sources.length === 1 ? "" : "s"}`
        : "Obtain method unknown";

  const badgeClass =
    state === "default" ? "badge-success" : state === "sources" ? "badge-accent" : "badge-warn";
  const badgeText = state === "default" ? "Default" : state === "sources" ? "Drops" : "Unmapped";

  return (
    <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <span className={`badge ${badgeClass}`} style={{ fontSize: "0.75rem" }}>{badgeText}</span>
        <div style={{ fontSize: "1rem", fontWeight: 600 }}>{headline}</div>
      </div>

      {state === "default" && (
        <p style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          This blueprint is unlocked from the start — anyone can craft it at a
          compatible fabricator without a mission reward or drop.
        </p>
      )}

      {state === "sources" && (
        <ul style={{ display: "flex", flexDirection: "column", gap: 8, listStyle: "none" }}>
          {sources.map((s) => (
            <li
              key={s.id}
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: "rgba(77,217,255,0.05)",
                border: "1px solid rgba(77,217,255,0.2)",
                fontSize: "0.9rem",
              }}
            >
              {prettySource(s)}
            </li>
          ))}
        </ul>
      )}

      {state === "unknown" && (
        <div>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 10 }}>
            Star Citizen&apos;s game files don&apos;t record an obtain method
            for this blueprint — it may be a cosmetic variant, an event
            reward, or tied to store purchase. We&apos;ll fill this in via
            community field reports once intel submission is live.
          </p>
          <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", lineHeight: 1.5 }}>
            Know where this drops? Log in and{" "}
            <span style={{ color: "var(--accent)" }}>log field intel</span> to
            share it with the org. Coming in the next update.
          </p>
        </div>
      )}
    </div>
  );
}

function FilterPillGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  function toggle(v: string) {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(next);
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div className="label-mini">{label}</div>
        {selected.size > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ height: 22, padding: "0 8px", fontSize: "0.75rem" }}
            onClick={() => onChange(new Set())}
          >
            Clear ({selected.size})
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((o) => {
          const active = selected.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              style={{
                padding: "5px 10px",
                borderRadius: 14,
                fontSize: "0.8rem",
                cursor: "pointer",
                background: active ? "rgba(77,217,255,0.15)" : "rgba(255,255,255,0.04)",
                color: active ? "var(--accent)" : "var(--text-muted)",
                border: `1px solid ${active ? "rgba(77,217,255,0.45)" : "rgba(255,255,255,0.1)"}`,
                transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  checked,
  onChange,
  count,
  countLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  count?: number | null;
  countLabel?: string;
}) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        padding: "7px 12px",
        borderRadius: 6,
        background: checked ? "rgba(77,217,255,0.1)" : "rgba(255,255,255,0.03)",
        border: `1px solid ${checked ? "rgba(77,217,255,0.45)" : "rgba(255,255,255,0.1)"}`,
        transition: "background-color 0.15s, border-color 0.15s",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "#4dd9ff", width: 14, height: 14 }}
      />
      <span style={{ fontSize: "0.85rem", color: checked ? "var(--accent)" : "var(--text)" }}>
        {label}
      </span>
      {count != null && (
        <span className="label-mini">
          {count.toLocaleString()}
          {countLabel ? ` ${countLabel}` : ""}
        </span>
      )}
    </label>
  );
}

function DismantlePanel({ blueprint }: { blueprint: Blueprint }) {
  const returns = dismantleReturns(blueprint);
  const time = dismantleTimeSeconds(blueprint);

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: 14 }}>
        Dismantle yields
      </div>
      {returns.length === 0 ? (
        <div style={{ color: "var(--text-dim)" }}>No dismantle data recorded.</div>
      ) : (
        <>
          <ul style={{ display: "flex", flexDirection: "column", gap: 6, listStyle: "none" }}>
            {returns.map((r) => (
              <li
                key={r.UUID}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Link
                  href={`/resources?id=${encodeURIComponent(r.UUID)}`}
                  style={{ color: "var(--accent)", fontWeight: 500 }}
                >
                  {r.Name}
                </Link>
                <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}>
                  {r.QuantityScu < 0.01 ? r.QuantityScu.toExponential(1) : r.QuantityScu.toFixed(3)} SCU
                </div>
              </li>
            ))}
          </ul>
          <div className="label-mini" style={{ marginTop: 12 }}>
            {time != null && <>Dismantle time: {time}s · </>}
            Click any resource to see where it spawns
          </div>
        </>
      )}
    </div>
  );
}
