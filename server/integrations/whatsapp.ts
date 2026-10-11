import { env } from '../env'
import { ProviderError } from '../http'

/*
  WhatsApp Business Cloud API (Meta).
  Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
  POST https://graph.facebook.com/{version}/{phone-number-id}/messages
  Free-form text is only delivered inside the 24-hour customer service window;
  outside it Meta requires an approved template message.
*/

export const WHATSAPP_VARS = ['WA_TOKEN', 'WA_PHONE_ID']

/** 01xxxxxxxxx → 201xxxxxxxxx (E.164 without +) */
export function toWaNumber(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.startsWith('0')) return '2' + d
  return d
}

export async function sendText(to: string, text: string) {
  const r = await fetch(`https://graph.facebook.com/${env.whatsapp.apiVersion}/${env.whatsapp.phoneId}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.whatsapp.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: toWaNumber(to), type: 'text', text: { preview_url: false, body: text } }),
  })
  const data = (await r.json().catch(() => undefined)) as { messages?: { id: string }[]; error?: { message?: string } } | undefined
  if (!r.ok || !data?.messages?.[0]?.id) throw new ProviderError(data?.error?.message ?? 'WhatsApp send failed', r.status, data)
  return { messageId: data.messages[0].id }
}
