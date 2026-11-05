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
