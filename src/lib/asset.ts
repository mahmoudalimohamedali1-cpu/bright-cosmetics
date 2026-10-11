/** Public-folder URL that also works when the app is served from a sub-path (GitHub Pages). */
export function asset(path: string | undefined): string {
  if (!path) return ''
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
