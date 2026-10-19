import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/*
  Configuration comes from the process environment. For local development a
  git-ignored `.env` file in the project root is loaded first (real env vars
  win). Secrets are only ever read here and never returned by the API.
*/

const root = resolve(import.meta.dirname, '..')
const envFile = resolve(root, '.env')
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile)
  } catch {
    /* malformed .env: fall back to the real environment */
  }
}

const v = (k: string) => {
  const x = process.env[k]?.trim()
  return x ? x : undefined
}

function argValue(flag: string) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

const production = process.argv.includes('--prod') || v('NODE_ENV') === 'production'

export const env = {
  root,
  // `--port N` wins over env so dev tooling that exports PORT for the web server can't collide.
  port: Number(argValue('--port') ?? v('API_PORT') ?? v('PORT') ?? 8787),
  production,
  /** Listen address. Production behind nginx: 127.0.0.1, so the app port is not reachable from outside. */
  host: v('HOST') ?? '0.0.0.0',
  /** What an empty database starts with: `starter` (real store, the production default) or `demo` (sample data). */
  seed: (v('SEED') === 'demo' || v('SEED') === 'starter' ? v('SEED') : production ? 'starter' : 'demo') as 'demo' | 'starter',
  dataDir: resolve(root, v('DATA_DIR') ?? 'server/data'),
  adminPassword: v('ADMIN_PASSWORD'),
  /** Bootstrap owner login, used only while no staff accounts exist */
  adminEmail: v('ADMIN_EMAIL') ?? 'owner@bright.example',
  /** Public origin of the shop, used for payment redirect and webhook URLs */
  appUrl: v('APP_URL'),
  paymob: {
    secretKey: v('PAYMOB_SECRET_KEY'),
    publicKey: v('PAYMOB_PUBLIC_KEY'),
    integrationIds: v('PAYMOB_INTEGRATION_IDS'),
    hmac: v('PAYMOB_HMAC'),
    baseUrl: v('PAYMOB_BASE_URL') ?? 'https://accept.paymob.com',
  },
  bosta: {
    apiKey: v('BOSTA_API_KEY'),
    baseUrl: v('BOSTA_BASE_URL') ?? 'https://app.bosta.co/api/v2',
  },
  whatsapp: {
    token: v('WA_TOKEN'),
    phoneId: v('WA_PHONE_ID'),
    apiVersion: v('WA_API_VERSION') ?? 'v21.0',
  },
}

export const configured = {
  paymob: () => !!(env.paymob.secretKey && env.paymob.publicKey && env.paymob.integrationIds && env.paymob.hmac),
  bosta: () => !!env.bosta.apiKey,
  whatsapp: () => !!(env.whatsapp.token && env.whatsapp.phoneId),
}
