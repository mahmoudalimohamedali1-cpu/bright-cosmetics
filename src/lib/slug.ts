/** URL part for a brand: "Dr.Althea" → "dr-althea". Shared by the shop links and the sitemap. */
export function brandSlug(b: string) {
  return b
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
