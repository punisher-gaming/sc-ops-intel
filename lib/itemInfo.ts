// Tiny helper that pulls the marketing blurb + structured meta out of
// any scunpacked item's source_data. Used by ItemHover throughout the
// site, works for weapons, components, attachments, mining heads,
// scopes, lasers, anything that ships with stdItem.DescriptionText.

export interface ItemInfo {
  description: string | null;
  meta: Record<string, string>;
}

export function extractItemInfo(sourceData: unknown): ItemInfo {
  if (!sourceData || typeof sourceData !== "object") {
    return { description: null, meta: {} };
  }
  const sdAny = sourceData as Record<string, unknown>;
  const stdItem = (sdAny.stdItem ?? sdAny) as Record<string, unknown>;

  const description =
    typeof stdItem.DescriptionText === "string"
      ? (stdItem.DescriptionText as string)
      : null;

  const dd = (stdItem.DescriptionData as Record<string, string> | undefined) ?? {};
  const meta: Record<string, string> = {};
  for (const k of ["Item Type", "Manufacturer", "Size", "Grade", "Class"]) {
    if (typeof dd[k] === "string" && dd[k]) meta[k] = dd[k];
  }

  return { description, meta };
}
