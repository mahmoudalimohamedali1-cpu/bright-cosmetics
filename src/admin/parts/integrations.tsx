import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { api } from '../../lib/api'
import { Badge, Pane, useAdmin } from '../ui'
import { Note } from './growth'

/* Which third-party services the server has keys for. Booleans only: keys never reach the browser. */

export type IntegrationStatus = Record<'paymob' | 'bosta' | 'whatsapp', { configured: boolean; vars: string[] }>

let cache: Promise<IntegrationStatus | undefined> | undefined

/** Shared, cached per page load; undefined when offline or not signed in. */
export function useIntegrations(): IntegrationStatus | undefined {
  const { online } = useAdmin()
  const [s, setS] = useState<IntegrationStatus>()
  useEffect(() => {
    if (!online) return
    cache ??= api<IntegrationStatus>('/api/admin/integrations', { admin: true }).catch(() => {
      cache = undefined
      return undefined
    })
    let live = true
    void cache.then((v) => live && setS(v))
    return () => {
      live = false
    }
  }, [online])
  return s
}

export function IntegrationsPane() {
  const { tx } = useI18n()
  const { online } = useAdmin()
  const st = useIntegrations()

  const rows: { key: keyof IntegrationStatus; name: string; what: string }[] = [
    { key: 'paymob', name: 'Paymob', what: tx('دفع بالكارت والمحافظ في صفحة الدفع، وبيأكد الدفع تلقائيًا', 'Card and wallet payments at checkout, confirmed automatically') },
    { key: 'bosta', name: 'Bosta', what: tx('إنشاء شحنة ورقم تتبع من صفحة الطلب', 'Create a delivery and tracking number from the order page') },
    { key: 'whatsapp', name: 'WhatsApp Cloud API', what: tx('إرسال رسالة التأكيد من السيرفر بدل فتح واتساب', 'Send the confirmation from the server instead of opening WhatsApp') },
  ]

  return (
    <Pane title={tx('الربط مع الخدمات', 'Integrations')} description={tx('المفاتيح بتتحط كمتغيرات بيئة على السيرفر، ومش بتظهر هنا أبدًا', 'Keys are set as environment variables on the server and never shown here')} flush>
      <ul className="list">
        {rows.map((r) => {
          const s = st?.[r.key]
          return (
            <li key={r.key} style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="small strong">{r.name}</div>
                <div className="tiny faint">{r.what}</div>
                {s && !s.configured && (
                  <div className="tiny" style={{ marginTop: 4 }}>
                    {tx('للتفعيل: ', 'To enable, set: ')}
                    <code dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                      {s.vars.join(', ')}
                    </code>
                  </div>
                )}
              </div>
              {!online ? (
                <Badge tone="hollow">{tx('محتاج السيرفر', 'Needs the server')}</Badge>
              ) : !s ? (
                <Badge tone="hollow">…</Badge>
              ) : s.configured ? (
                <Badge tone="ok">{tx('متصل', 'Connected')}</Badge>
              ) : (
                <Badge tone="hollow">{tx('غير متصل', 'Not connected')}</Badge>
              )}
            </li>
          )
        })}
      </ul>
      <div className="pane__foot">
        <Note>
          {online
            ? tx('بعد ضبط المتغيرات لازم السيرفر يتعمله إعادة تشغيل. القائمة الكاملة في README.', 'Restart the server after setting the variables. The full list is in the README.')
            : tx('اللوحة شغالة في وضع العرض من غير سيرفر، فمفيش خدمات ممكن تتربط.', 'The dashboard is in demo mode without a server, so no services can be connected.')}
        </Note>
      </div>
    </Pane>
  )
}
