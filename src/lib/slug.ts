export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return base || "bill";
}

export function uniqueSlug(title: string, id: string): string {
  return `${slugify(title)}-${id.slice(0, 6)}`;
}
