import Link from "next/link";
import { PageShell } from "@/components/PageShell";

// New-player guide. Distilled from common knowledge on r/starcitizen,
// r/starcitizen_guilds, the SC Wiki, and the in-game tutorials. Goal:
// anyone who just installed the game can read this in 5 minutes and
// not be lost on their first flight.
//
// Deliberately opinionated — we pick ONE recommended path for each
// question rather than listing every possibility, because choice
// paralysis is the #1 new-player complaint. Advanced players can
// always find the other options themselves.

export const metadata = {
  title: "New Player Guide · CitizenDex",
  description:
    "Star Citizen from zero: keybinds, first aUEC, where to buy armor, 30k errors, and what nobody tells you in the tutorial.",
};

export default function NewPlayersPage() {
  return (
    <PageShell>
      <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem" }}>
        <div className="page-header">
          <div className="accent-label">For new citizens</div>
          <h1>Your first hour in Star Citizen</h1>
          <p style={{ maxWidth: "70ch" }}>
            Star Citizen doesn&apos;t tutorial well. This is the stuff everyone
            Googles on day one — keybinds, how to make your first money,
            what crime stat means, which errors are yours vs the server&apos;s.
            Read top-to-bottom once, then bookmark it for reference.
          </p>
        </div>

        <TableOfContents />

        <Section id="start" title="1. Getting in-game" num="01">
          <p>
            After the launcher finishes downloading (expect 100+ GB), pick{" "}
            <strong>Stanton</strong> as your starting system on first login —
            it&apos;s safer, has a working tutorial, and every lifesaving
            service (medical, ship claims, loadout terminals) is one tram ride
            away. Pyro is playable but lawless and will get you killed before
            you understand the UI.
          </p>
          <p>
            You spawn in your hab at one of the four Stanton cities. Hit{" "}
            <Kbd>F</Kbd> to open the door. Walk to an elevator, take it to the{" "}
            <em>Transit</em> level, then the tram to the <em>Spaceport</em>.
            Ship services terminals at the spaceport let you retrieve, store,
            and customize your ships.
          </p>
          <Callout>
            <strong>30k errors are not your fault.</strong> If the game kicks
            you with a "30k" code, that&apos;s the entire server crashing.
            Reload the launcher, pick a new shard, keep going. It&apos;s an
            alpha.
          </Callout>
        </Section>

        <Section id="keybinds" title="2. Essential keybinds" num="02">
          <p>
            You can rebind anything in <Kbd>Esc</Kbd> → Options → Keybindings.
            These are the ones you&apos;ll use constantly.
          </p>
          <div className="kb-grid">
            <Kb keys="F" desc="Interact — doors, elevators, terminals, pick-ups, seats. The single most-used key in the game." />
            <Kb keys="U" desc="Toggle your mobiGlas (wrist computer). Missions, map, banking, contracts, and ship loadouts all live here." />
            <Kb keys="F1" desc="Emote wheel. Also handy for the RSI salute (o7)." />
            <Kb keys="F2" desc="Mission manager — what contracts you have, where to go next, who pays what." />
            <Kb keys="F11" desc="Starmap. Plan quantum jumps between planets, moons, stations." />
            <Kb keys="N" desc="Helmet on / off. Keep it on in space. Take it off indoors — oxygen tank lasts longer." />
            <Kb keys="B (hold)" desc="Quantum travel. Align toward a target on your HUD, hold B, wait for spool-up." />
            <Kb keys="I" desc="Personal / ship inventory transfer panel." />
            <Kb keys="R" desc="Ready weapon or put it away. Also toggles multi-tool mode." />
            <Kb keys="Left Alt + Mouse" desc="Freelook. Move your head independent of flight direction." />
            <Kb keys="V" desc="Toggle flight mode ON and land / take off (replaces the old N/gear-down key)." />
            <Kb keys="T" desc="Auto-land at any station you're close enough to. Saves real-world minutes." />
            <Kb keys="Backspace (hold)" desc="Suicide / respawn. Useful when stuck in geometry or unable to reach a medical bed." />
          </div>
          <Callout>
            <strong>One keybind that everyone forgets: <Kbd>F</Kbd>.</strong>{" "}
            If you&apos;re standing in front of a door / button / chair and
            nothing happens, it&apos;s always F. Look at the object; when the
            cursor highlights it, press F. Hold F for multi-option interactions.
          </Callout>
        </Section>

        <Section id="money" title="3. Making your first aUEC" num="03">
          <p>
            You start with 20,000 aUEC (in-game credits, reset each patch).
            That&apos;s enough for basic armor + a helmet but not much else.
            Here&apos;s how to go from broke to ~200,000 aUEC in your first
            evening, ranked by risk/reward:
          </p>

          <Rung
            tier="EASIEST"
            title="ECN Protect Our Client (escort missions)"
            body="Mission Manager (F2) → Security Contracts → Protect Our Client. Drive a cart to a hab, escort an NPC to an elevator, defend them from 3 NPCs. Pays ~30k aUEC for 10 minutes of work and doesn't require weapons skill. Start here."
          />
          <Rung
            tier="EASY"
            title="Bunker missions"
            body="Mission Manager → Mercenary → Clear Underground Facility. Fly to a planet-side bunker, clear NPCs inside, loot them. 40–80k aUEC per bunker. Bring a medium armor set + a rifle. Your equipped armor and weapons are persistent — they stay with you when you die — but anything in your backpack (loot, MedPens, spare mags, ammo boxes) can be lost on the body. Loot, then stash back at your ship often."
          />
          <Rung
            tier="MEDIUM"
            title="Hauling"
            body="Contract Manager → Hauling. Pick up boxes at Station A, deliver to Station B. Easy aUEC per hour but you need a ship with cargo space (Cutlass Black, Freelancer, Hull-A all work). No combat. Stanton routes are safer; don't accept Pyro-ending routes yet."
          />
          <Rung
            tier="MEDIUM"
            title="Salvage (C8R Pisces → Vulture upgrade path)"
            body="Rent or buy a Drake Vulture (~3.5M aUEC or in-cash pledge). Fly to shipwrecks, scrape hulls with the tractor beam and reclaim panels. 100–200k per hour in a solo Vulture, much more in a Reclaimer. Peaceful and profitable."
          />
          <Rung
            tier="MEDIUM"
            title="Mining (ROC ground / Prospector space)"
            body="ROC is a ground vehicle that fits inside a Cutlass Black. Drive to surface deposits on Daymar/Aberdeen/Lyria, mine gems, sell at refineries. ~150k/hour. Space mining in a Prospector is more complex but scales higher."
          />
          <Rung
            tier="HARD"
            title="Bounty hunting"
            body="Need a combat-capable ship (Arrow, Gladius, Buccaneer, Cutlass Black). Accept VLRT/MRT/HRT bounties. Pays well but you WILL die learning; budget for the loss."
          />
        </Section>

        <Section id="navigation" title="4. Basic navigation" num="04">
          <ul style={listStyle}>
            <li>
              <strong>Leaving your hangar:</strong> power up the ship (shortcut{" "}
              <Kbd>U</Kbd> outside the ship, or the button inside). Request
              takeoff on comms (<Kbd>F9</Kbd> or via mobiGlas). Wait for the
              hangar doors to fully open.
            </li>
            <li>
              <strong>Quantum travel:</strong> open your starmap (<Kbd>F11</Kbd>
              ), click the target moon/station, click <em>Set Route</em>. Back
              in the cockpit, align the target marker in your HUD, hold{" "}
              <Kbd>B</Kbd> until spool completes, release. You&apos;ll arrive in
              8–60 seconds depending on distance.
            </li>
            <li>
              <strong>Landing:</strong> within 20 km of a station, press{" "}
              <Kbd>N</Kbd> or <Kbd>F9</Kbd> to request landing. ATC assigns a
              pad. You can <strong>hold <Kbd>T</Kbd></strong> to auto-land once
              cleared — saves a lot of manual hover time.
            </li>
            <li>
              <strong>Claiming a lost ship:</strong> any Ship Services terminal
              at any major station. It takes 5–15 in-game minutes by default;
              you can pay extra for <em>Expedite</em> if you&apos;re in a hurry.
            </li>
          </ul>
        </Section>

        <Section id="gotchas" title="5. Things nobody tells you" num="05">
          <Gotcha
            title="Crime Stat is serious"
            body="Shooting NPCs at stations, trespassing in restricted areas, or accepting illegal missions raises your Crime Stat. CS2+ locks you out of most lawful stations. To clear it, you have to hack terminals in Kareah prison or serve time. Don't get cocky at Grim HEX."
          />
          <Gotcha
            title="Your personal inventory is local to each station"
            body="If you die at microTech and respawn at Lorville, your armor didn't come with you. Put important gear in your ship's inventory (persistent) or pick a single home station and keep stuff there."
          />
          <Gotcha
            title="Ship claims destroy the ship's cargo"
            body="If you claim a destroyed ship at a terminal, ANY cargo it was carrying is gone. If the ship is merely stuck, use Retrieve (free) not Claim (resets everything)."
          />
          <Gotcha
            title="Quantum fuel vs hydrogen fuel"
            body="They're different. Hydrogen is your main engines — refuels free at any station (takes ~60 sec). Quantum fuel is for jumps — refuels free too, but some ships drain it stupidly fast (Avenger Titan is famous for this)."
          />
          <Gotcha
            title="The bed-log trick"
            body="Log out in a bed inside your ship or hab, and you'll spawn back there next session instead of at the default spawn. Critical if you're parked at a remote outpost."
          />
          <Gotcha
            title="Party play uses the Contact app"
            body="mobiGlas → Contacts → friend's handle → Invite to Party. Then use the Star Map to sync your quantum jumps. Voice chat is best handled outside the game (Discord)."
          />
        </Section>

        <Section id="buy-first" title="6. What to buy with your first money" num="06">
          <p>
            These are all in-game purchases (aUEC, reset per patch — not real
            dollars). In rough priority order:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>A decent medium armor set</strong> — Odyssey, Novikov,
              Pembroke, or Reliant. ~15–40k aUEC. Protects from small-arms fire
              long enough to get out of a bad situation. Skip light armor,
              heavy is overkill until you&apos;re doing Xenothreat-tier content.
            </li>
            <li>
              <strong>A primary rifle</strong> — Karna or FS-9 LMG are solid
              starters. ~15k aUEC each. The pistol you spawn with is fine as
              backup.
            </li>
            <li>
              <strong>Cambio-SRT multi-tool + attachments</strong> — the
              Tractor Beam and Medical attachments are basically mandatory.
              Salvage attachment unlocks C8R-style panel scraping on foot.
              ~12k aUEC base + 8k each attachment.
            </li>
            <li>
              <strong>MedPens</strong> — buy a stack of 10 from any medical
              kiosk. They self-inject to revive you from unconscious and heal
              wounds. ~500 aUEC each, life-saving.
            </li>
            <li>
              <strong>A cargo/mission ship (optional)</strong> — if you hit
              1M+ aUEC, a rental Cutlass Black or Freelancer opens up hauling
              and salvage loops. Otherwise keep grinding with your starter ship
              until you hit 3.5M and rent/buy a Vulture for the salvage grind.
            </li>
          </ul>
        </Section>

        <Section id="tools" title="7. Tools that make everything easier" num="07">
          <p>
            Star Citizen&apos;s UI is still a work in progress. These
            community-built tools fill the gaps:
          </p>
          <ul style={listStyle}>
            <li>
              <strong><a href="https://citizendex.com" style={linkStyle}>CitizenDex</a></strong> — this
              site. Ship specs, blueprints, crafting, commodity prices, fleet
              tracker, your private notes.
            </li>
            <li>
              <strong><a href="https://uexcorp.space" target="_blank" rel="noopener noreferrer" style={linkStyle}>UEX
              Corp</a></strong> — live commodity prices. When you&apos;re
              hauling, check UEX to see which routes are profitable right now.
              Community-submitted, usually accurate to within a day.
            </li>
            <li>
              <strong><a href="https://erkul.games" target="_blank" rel="noopener noreferrer" style={linkStyle}>Erkul
              DPS</a></strong> — ship loadout calculator. Pick components,
              weapons, shields; see actual DPS, shield HP, power draw, alpha
              strike. Essential if you PvP or bounty-hunt.
            </li>
            <li>
              <strong><a href="https://starcitizen.tools" target="_blank" rel="noopener noreferrer" style={linkStyle}>SC
              Wiki</a></strong> — lore, mission details, NPC locations. Deeper
              than the in-game mobiGlas entries.
            </li>
            <li>
              <strong><a href="https://www.reddit.com/r/starcitizen/" target="_blank" rel="noopener noreferrer" style={linkStyle}>r/starcitizen</a></strong>{" "}
              and <strong><a href="https://www.reddit.com/r/starcitizen_guilds/" target="_blank" rel="noopener noreferrer" style={linkStyle}>r/starcitizen_guilds</a></strong> —
              patch-day pinned threads always contain the latest
              money-making and bug-avoidance tips.
            </li>
          </ul>
        </Section>

        <Section id="help" title="8. When you&apos;re stuck" num="08">
          <p>
            Every new player hits a moment where the game just stops working
            for them. It&apos;s almost always one of these:
          </p>
          <ul style={listStyle}>
            <li>
              <strong>Ship won&apos;t power on</strong> — sit down, press <Kbd>R</Kbd>{" "}
              to put away your weapon first, then press the power button (<Kbd>U</Kbd>{" "}
              by default). If still nothing, the ship may be glitched — claim it.
            </li>
            <li>
              <strong>Stuck in a loading screen</strong> — 30k inbound. Force-quit
              the client and reconnect.
            </li>
            <li>
              <strong>Mission won&apos;t complete</strong> — common bug, not your
              fault. Abandon the mission in F2, take a new one.
            </li>
            <li>
              <strong>Can&apos;t interact with anything</strong> — you may be
              mid-animation. Wait, or press <Kbd>Y</Kbd> to force the inner-thought
              prompt.
            </li>
            <li>
              <strong>Random other weirdness</strong> — post a screenshot in the{" "}
              <Link href="/community" style={linkStyle}>community forum</Link>{" "}
              here on CitizenDex. Our Admins are active.
            </li>
          </ul>
        </Section>

        <div className="card" style={{ padding: "1.75rem", marginTop: "2rem", background: "linear-gradient(135deg, rgba(77,217,255,0.05), transparent)", border: "1px solid rgba(77,217,255,0.2)" }}>
          <div className="accent-label" style={{ marginBottom: 8 }}>Ready to fly?</div>
          <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Bookmark this page. Then jump into the rest of CitizenDex:{" "}
            <Link href="/ships" style={linkStyle}>every flyable hull</Link>,{" "}
            <Link href="/blueprints" style={linkStyle}>every crafting recipe</Link>,{" "}
            <Link href="/commodities" style={linkStyle}>commodity prices</Link>, and{" "}
            <Link href="/resources" style={linkStyle}>mining spawn locations</Link>{" "}
            — auto-synced every patch so nothing goes stale. o7, citizen.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

// ────── components + styles (inline, single-file on purpose) ──────

function TableOfContents() {
  const entries: Array<[string, string]> = [
    ["start", "Getting in-game"],
    ["keybinds", "Essential keybinds"],
    ["money", "Making your first aUEC"],
    ["navigation", "Basic navigation"],
    ["gotchas", "Things nobody tells you"],
    ["buy-first", "What to buy first"],
    ["tools", "Community tools"],
    ["help", "When you're stuck"],
  ];
  return (
    <nav
      className="card"
      style={{
        padding: "1rem 1.25rem",
        marginBottom: "2rem",
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
      }}
      aria-label="Jump to section"
    >
      <div className="label-mini" style={{ width: "100%" }}>Jump to</div>
      {entries.map(([id, label], i) => (
        <a
          key={id}
          href={`#${id}`}
          style={{
            padding: "4px 10px",
            borderRadius: 14,
            fontSize: "0.82rem",
            background: "rgba(255,255,255,0.03)",
            color: "var(--text-muted)",
            border: "1px solid rgba(255,255,255,0.08)",
            textDecoration: "none",
          }}
        >
          <span style={{ color: "var(--text-dim)", marginRight: 6 }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          {label}
        </a>
      ))}
    </nav>
  );
}

function Section({
  id,
  title,
  num,
  children,
}: {
  id: string;
  title: string;
  num: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{ marginBottom: "2.5rem", scrollMarginTop: 80 }}
    >
      <h2
        style={{
          fontSize: "1.35rem",
          fontWeight: 600,
          marginBottom: "0.85rem",
          display: "flex",
          alignItems: "baseline",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--accent)",
            fontSize: "0.85rem",
          }}
        >
          {num}
        </span>
        {title}
      </h2>
      <div style={{ color: "var(--text)", lineHeight: 1.7, fontSize: "0.95rem" }}>
        {children}
      </div>
    </section>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.82em",
        padding: "1px 6px",
        border: "1px solid rgba(255,255,255,0.2)",
        borderBottomWidth: 2,
        borderRadius: 4,
        background: "rgba(255,255,255,0.04)",
        color: "var(--text)",
      }}
    >
      {children}
    </kbd>
  );
}

function Kb({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 6,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
        fontSize: "0.88rem",
      }}
    >
      <div>
        <Kbd>{keys}</Kbd>
      </div>
      <div style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 14,
        padding: "12px 16px",
        borderRadius: 6,
        background: "rgba(245,185,71,0.06)",
        border: "1px solid rgba(245,185,71,0.25)",
        color: "var(--text)",
        fontSize: "0.9rem",
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

function Rung({ tier, title, body }: { tier: string; title: string; body: string }) {
  const tierColor =
    tier === "EASIEST"
      ? "var(--success)"
      : tier === "EASY"
        ? "var(--accent)"
        : tier === "MEDIUM"
          ? "var(--warn)"
          : "var(--alert)";
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 6,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", marginBottom: 4 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
            padding: "2px 8px",
            borderRadius: 3,
            background: "rgba(255,255,255,0.04)",
            color: tierColor,
            border: `1px solid ${tierColor}40`,
          }}
        >
          {tier}
        </span>
        <strong style={{ fontSize: "0.95rem" }}>{title}</strong>
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
        {body}
      </div>
    </div>
  );
}

function Gotcha({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠ {title}</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
        {body}
      </div>
    </div>
  );
}

const listStyle: React.CSSProperties = {
  listStyle: "disc",
  paddingLeft: "1.5rem",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "var(--text-muted)",
};

const linkStyle: React.CSSProperties = {
  color: "var(--accent)",
  textDecoration: "none",
};
