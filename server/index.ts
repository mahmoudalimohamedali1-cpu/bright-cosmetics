/*
  Bright API server.
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
const { bootstrapOwner } = await import('./auth')

if (seed()) console.log(`[db] started a fresh database (${env.seed === 'starter' ? 'store catalogue, no sample orders' : 'demo data'})`)

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

if (await bootstrapOwner()) console.log(`[admin] created the owner sign-in for ${env.adminEmail} (password from ADMIN_PASSWORD)`)
else if (!env.adminPassword) {
  const { allAuth } = await import('./auth')
  if (!allAuth().length) console.warn('[admin] no staff accounts and ADMIN_PASSWORD is not set: admin sign-in is disabled until it is')
}

serve({ fetch: app.fetch, port: env.port, ...(env.host ? { hostname: env.host } : {}) }, (info) => {
  console.log(`[api] Bright ${env.production ? 'production' : 'dev'} server on http://${env.host ?? 'localhost'}:${info.port}`)
})
