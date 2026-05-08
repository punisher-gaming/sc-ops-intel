// Patch version is displayed in the nav. This is a hand-bumped constant
// for now, the data ingest auto-syncs each patch from scunpacked-data +
// SC Wiki, but the version label has no canonical machine-readable source
// we trust. TODO: auto-detect from RSI status feed or scunpacked release tag.
export const CURRENT_PATCH = "4.7.2";

export function PatchPill() {
  return null;
}
