/*
  NURI API server.
    dev:   tsx watch server/index.ts          (API only, Vite proxies /api)
    prod:  tsx server/index.ts --prod         (API + built dist/ with SPA fallback)
  node:sqlite still prints an ExperimentalWarning on Node 24; silence only that
  one before the database module loads (hence the dynamic imports below).
*/

const original = process.listeners('warning')
process.removeAllListeners('warning')
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && /SQLite/i.test(w.message)) return
  for (const l of original) l(w)
})

const { readFileSync, existsSync } = await import('node:fs')
const { relative, resolve } = await import('node:path')
const { serve } = await import('@hono/node-server')
const { serveStatic } = await import('@hono/node-server/serve-static')
const { env } = await import('./env')
const { seed } = await import('./db')
const { app } = await import('./app')

if (seed()) console.log('[db] seeded a fresh database from buildSeed()')

if (env.production) {
  const dist = resolve(env.root, 'dist')
  const indexFile = resolve(dist, 'index.html')
  if (!existsSync(indexFile)) {
    console.error('[web] dist/index.html missing: run `npm run build` first')
    process.exit(1)
  }
  const html = readFileSync(indexFile, 'utf8')
  const root = relative(process.cwd(), dist) || '.'
  app.use('/assets/*', async (c, next) => {
    await next()
    if (c.res.ok) c.header('cache-control', 'public, max-age=31536000, immutable')
  })
  app.use('*', serveStatic({ root }))
  // SPA fallback: any other GET renders the app shell and the client router takes over.
  app.get('*', (c) => c.html(html))
}

if (!env.adminPassword) console.warn('[admin] ADMIN_PASSWORD is not set: admin sign-in is disabled until it is')

serve({ fetch: app.fetch, port: env.port }, (info) => {
  console.log(`[api] NURI ${env.production ? 'production' : 'dev'} server on http://localhost:${info.port}`)
})
