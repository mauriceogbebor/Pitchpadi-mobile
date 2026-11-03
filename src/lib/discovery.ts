/** Presentation only: retain the API's ranking and every loaded pitch. */
export function groupVenues<
  T extends { pitch: { id: string; facilityId: string } },
>(results: T[]) {
  const groups = new Map<string, { id: string; pitches: T[] }>();
  const seen = new Set<string>();
  for (const result of results) {
    if (seen.has(result.pitch.id)) continue;
    seen.add(result.pitch.id);
    const id = result.pitch.facilityId;
    const group = groups.get(id) ?? { id, pitches: [] };
    group.pitches.push(result);
    groups.set(id, group);
  }
  return [...groups.values()];
}

/** Search names and slugs, ignoring spaces/hyphens, case and accents. */
export function matchingAreas<T extends { name: string; slug: string }>(
  areas: T[],
  text: string,
): T[] {
  const normalise = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[\s-]+/g, "");
  const query = normalise(text.trim());
  return areas.filter(
    (area) =>
      normalise(area.name).includes(query) ||
      normalise(area.slug).includes(query),
  );
}
