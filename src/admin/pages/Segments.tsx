import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, Users } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { cohorts, SEGMENT_LABEL } from '../../lib/metrics'
import type { Segment } from '../../lib/metrics'
import { DemoNote, PageHeader, Pane } from '../ui'
import { Composer, LedgerCell, SegmentBadge, Takeaway, useCustomerStats } from '../parts/growth'
import { heat, SEGMENT_ORDER } from '../parts/growth/util'

const CAMPAIGN: Record<Segment, { ar: string; en: string }> = {
  champions: {
    ar: 'أهلًا {name}، إنتِ من أقرب عملاء نوري لقلبنا، وحابين نشكرك بهدية صغيرة على طلبك الجاي.',
    en: 'Hi {name}, you are one of NURI’s favourite customers, and we’d like to thank you with a small gift on your next order.',
  },
  loyal: {
    ar: 'أهلًا {name}، جهّزنالك روتين كامل يناسب بشرتك، وعليه خصم مخصوص ليكي.',
    en: 'Hi {name}, we put together a full routine for your skin, with a discount just for you.',
  },
  promising: {
    ar: 'أهلًا {name}، عجبك أول طلب؟ الطلب التاني عليه خصم مننا.',
    en: 'Hi {name}, enjoying your first order? Your second one comes with a discount.',
  },
  at_risk: {
    ar: 'أهلًا {name}، وحشتينا! وصل مخزون جديد من كوريا.',
    en: 'Hi {name}, we miss you! Fresh stock from Korea just landed.',
  },
  cant_lose: {
    ar: 'أهلًا {name}، معاكي نوري. حابين نطمن إن كل حاجة كانت تمام في آخر طلب.',
    en: 'Hi {name}, it’s NURI checking in. We hope everything was right with your last order.',
  },
  hibernating: {
    ar: 'أهلًا {name}، فيه جديد في نوري يناسب بشرتك.',
    en: 'Hi {name}, there’s something new at NURI for your skin.',
  },
  new: {
    ar: 'أهلًا {name}، مرحب بيكي في نوري. أول طلب عليه خصم ترحيبي.',
    en: 'Hi {name}, welcome to NURI. Your first order comes with a welcome discount.',
  },
}

export default function Segments() {
  const { tx, pick, money, num, pct, date } = useI18n()
  const stats = useCustomerStats()
  const orders = useStore((s) => s.orders)
  const [campaign, setCampaign] = useState<{ seg: Segment; n: number } | null>(null)

  const buyers = stats.filter((s) => s.orders > 0)
  const totalSpent = buyers.reduce((s, b) => s + b.spent, 0)

  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0))
    for (const b of buyers) g[b.f - 1][b.r - 1]++
    return g
  }, [buyers])
  const gridMax = Math.max(1, ...grid.flat())

  const segs = useMemo(
    () =>
      SEGMENT_ORDER.map((s) => {
        const members = stats.filter((x) => x.segment === s)
        const spent = members.reduce((a, m) => a + m.spent, 0)
        return { s, members, size: members.length, spent, share: totalSpent ? spent / totalSpent : 0, avg: members.length ? spent / members.length : 0 }
      }),
    [stats, totalSpent],
  )

  const cohortRows = useMemo(() => cohorts(orders, 6), [orders])

  // Takeaways
  const top = segs.find((x) => x.s === 'champions')!
  const lapsing = segs.filter((x) => x.s === 'at_risk' || x.s === 'cant_lose')
  const lapsingSpent = lapsing.reduce((a, x) => a + x.spent, 0)
  const lapsingSize = lapsing.reduce((a, x) => a + x.size, 0)
  const m1 = cohortRows.filter((c) => c.size > 0 && c.cells.length > 1).map((c) => c.cells[1].rate)
  const avgM1 = m1.length ? m1.reduce((a, b) => a + b, 0) / m1.length : 0
  const hotCell = (() => {
    let best = { r: 0, f: 0, n: -1 }
    grid.forEach((row, fi) => row.forEach((n, ri) => n > best.n && (best = { r: ri + 1, f: fi + 1, n })))
    return best
  })()

  const ym = (m: string) => date(`${m}-01T12:00:00`, { month: 'short', year: '2-digit' })

  return (
    <>
      <PageHeader
        title={tx('الشرائح', 'Segments')}
        description={
          <>
            {tx('تقسيم RFM: مين اشترى قريب، وكام مرة، وبكام. كل رقم بيفتح العملاء اللي وراه. ', 'RFM: who bought recently, how often, and how much. Every number opens the customers behind it. ')}
            <DemoNote />
          </>
        }
      />

      <div className="ledger" style={{ ['--cols' as string]: 4, marginBottom: 16 }}>
        <LedgerCell label={tx('عملاء اشتروا', 'Customers who bought')} value={num(buyers.length)} meta={tx(`من ${num(stats.length)} مسجّل`, `of ${num(stats.length)} registered`)} to="/admin/customers" />
        <LedgerCell label={tx('الأبطال', 'Champions')} value={num(top.size)} meta={tx(`${pct(top.share, 0)} من الإيراد`, `${pct(top.share, 0)} of revenue`)} to="/admin/customers?segment=champions" />
        <LedgerCell label={tx('إيراد في خطر', 'Revenue at risk')} value={money(lapsingSpent, { compact: true })} meta={tx(`${num(lapsingSize)} عميل معرّض للخسارة أو ما ينفعش نخسره`, `${num(lapsingSize)} at-risk or can’t-lose customers`)} to="/admin/customers?segment=at_risk" />
        <LedgerCell label={tx('رجعوا في الشهر التاني', 'Came back in month 2')} value={pct(avgM1, 0)} meta={tx('متوسط آخر الدفعات الشهرية', 'Average across recent cohorts')} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Pane
          title={tx('خريطة الحداثة والتكرار', 'Recency × frequency map')}
          description={tx('كل خانة = عدد العملاء. الضغط عليها يفتحهم.', 'Each cell is a customer count. Select one to open them.')}
        >
          <Takeaway>
            {tx('أكبر تجمّع: ', 'Largest cluster: ')}
            <strong>{tx(`${num(hotCell.n)} عميل`, `${num(hotCell.n)} customers`)}</strong>
            {tx(` بحداثة ${hotCell.r} وتكرار ${hotCell.f}. `, ` at recency ${hotCell.r}, frequency ${hotCell.f}. `)}
            {hotCell.r <= 2 ? tx('معظمهم بعيد عن آخر طلب، فرسالة استرجاع أولى من عرض جديد.', 'Most are far from their last order, so a win-back message comes before a new offer.') : tx('معظمهم اشترى قريب، فالطلب التاني هو الهدف.', 'Most bought recently, so the second order is the goal.')}
          </Takeaway>
          <div className="gr-heat gr-rfm" role="table" aria-label={tx('خريطة الحداثة والتكرار', 'Recency by frequency map')}>
            {[5, 4, 3, 2, 1].map((f) => (
              <div key={f} role="row" style={{ display: 'contents' }}>
                <span className="gr-heat__axis" role="rowheader">
                  {f}
                </span>
                {[1, 2, 3, 4, 5].map((r) => {
                  const n = grid[f - 1][r - 1]
                  return (
                    <Link
                      key={r}
                      role="cell"
                      to={`/admin/customers?r=${r}&f=${f}`}
                      className="gr-heat__cell"
                      style={heat(n / gridMax)}
                      title={tx(`حداثة ${r}، تكرار ${f}: ${n} عميل`, `Recency ${r}, frequency ${f}: ${n} customers`)}
                      aria-label={tx(`حداثة ${r}، تكرار ${f}: ${n} عميل`, `Recency ${r}, frequency ${f}: ${n} customers`)}
                    >
                      {n || ''}
                    </Link>
                  )
                })}
              </div>
            ))}
            <span />
            {[1, 2, 3, 4, 5].map((r) => (
              <span key={r} className="gr-heat__axis">
                {r}
              </span>
            ))}
          </div>
          <div className="row-between" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <span className="tiny faint">{tx('أفقي: الحداثة (5 = اشترى قريب). رأسي: التكرار (5 = الأكثر طلبات).', 'Across: recency (5 = most recent). Up: frequency (5 = most orders).')}</span>
            <span className="gr-ramp">
              0<span className="gr-ramp__bar" aria-hidden />
              {num(gridMax)}
            </span>
          </div>
        </Pane>

        <Pane title={tx('الاحتفاظ بالعملاء حسب شهر أول طلب', 'Retention by first-order month')} description={tx('نسبة كل دفعة اللي طلبت تاني في كل شهر بعد كده', 'Share of each cohort that ordered again in each later month')}>
          <Takeaway>
            {m1.length ? (
              <>
                {tx('في المتوسط ', 'On average ')}
                <strong>{pct(avgM1, 0)}</strong>
                {tx(' من العملاء الجداد بيطلبوا تاني في الشهر اللي بعده. ', ' of new customers order again the following month. ')}
                {avgM1 < 0.2 ? tx('رسالة إعادة طلب بعد 30–45 يوم من أول طلب هي أسرع مكسب.', 'A replenishment message 30–45 days after the first order is the quickest win.') : tx('معدّل صحي لمنتجات بتخلص كل شهر أو اتنين.', 'Healthy for products that run out every month or two.')}
              </>
            ) : (
              tx('مفيش بيانات كفاية لسه.', 'Not enough data yet.')
            )}
          </Takeaway>
          <div className="table-wrap">
            <table className="gr-cohort">
              <thead>
                <tr>
                  <th>{tx('الدفعة', 'Cohort')}</th>
                  <th className="t-num">{tx('عملاء', 'Customers')}</th>
                  {[0, 1, 2, 3, 4, 5].map((k) => (
                    <th key={k} style={{ textAlign: 'center' }}>
                      {tx(`ش${k}`, `M${k}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohortRows.map((row) => (
                  <tr key={row.month}>
                    <th scope="row">{ym(row.month)}</th>
                    <td className="num" style={{ textAlign: 'end', paddingInlineEnd: 8 }}>
                      {num(row.size)}
                    </td>
                    {[0, 1, 2, 3, 4, 5].map((k) => {
                      const cell = row.cells[k]
                      if (!cell) return <td key={k} />
                      return (
                        <td key={k}>
                          <span className="gr-heat__cell" style={k === 0 ? { background: 'var(--pane-2)', color: 'var(--fg-3)' } : heat(row.size ? cell.rate / 0.5 : 0)} title={`${pct(cell.rate, 0)}`}>
                            {row.size ? pct(cell.rate, 0) : '—'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row-between" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <span className="tiny faint">{tx('ش0 = شهر أول طلب (100٪ دايمًا).', 'M0 is the first-order month (always 100%).')}</span>
            <span className="gr-ramp">
              {pct(0, 0)}
              <span className="gr-ramp__bar" aria-hidden />
              {tx('50٪ أو أكتر', '50%+')}
            </span>
          </div>
        </Pane>
      </div>

      <Pane title={tx('الشرائح', 'Segments')} flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{tx('الشريحة', 'Segment')}</th>
                <th className="t-num">{tx('العدد', 'Customers')}</th>
                <th style={{ minWidth: 140 }}>{tx('نصيبها من الإيراد', 'Revenue share')}</th>
                <th className="t-num">{tx('متوسط الصرف', 'Avg spend')}</th>
                <th className="gr-hide-md">{tx('المطلوب', 'What to do')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {segs.map((x) => (
                <tr key={x.s}>
                  <td>
                    <SegmentBadge s={x.s} />
                  </td>
                  <td className="t-num">
                    <Link to={`/admin/customers?segment=${x.s}`}>{num(x.size)}</Link>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <div className="meter" style={{ flex: 1, minWidth: 60 }} aria-hidden>
                        <span style={{ width: `${x.share * 100}%`, background: 'var(--gr-s1)' }} />
                      </div>
                      <span className="num small" style={{ minWidth: 40, textAlign: 'end' }}>
                        {pct(x.share, 0)}
                      </span>
                    </div>
                  </td>
                  <td className="t-num">{x.size && x.s !== 'new' ? money(x.avg) : '—'}</td>
                  <td className="small muted gr-hide-md" style={{ maxWidth: 320 }}>
                    {pick(SEGMENT_LABEL[x.s].hint)}
                  </td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                      <Link className="btn btn--sm btn--ghost" to={`/admin/customers?segment=${x.s}`}>
                        <Users size={14} aria-hidden />
                        {tx('العملاء', 'View customers')}
                      </Link>
                      <button className="btn btn--sm" disabled={!x.size} onClick={() => setCampaign({ seg: x.s, n: Date.now() })}>
                        <Megaphone size={14} aria-hidden />
                        {tx('إنشاء حملة', 'Create campaign')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Pane>

      {campaign && (
        <Composer
          key={campaign.n}
          open
          onClose={() => setCampaign(null)}
          recipients={segs.find((x) => x.s === campaign.seg)!.members.map((m) => m.customer)}
          title={tx(`حملة: ${SEGMENT_LABEL[campaign.seg].ar}`, `Campaign: ${SEGMENT_LABEL[campaign.seg].en}`)}
          context={{ ar: SEGMENT_LABEL[campaign.seg].ar, en: SEGMENT_LABEL[campaign.seg].en }}
          defaults={CAMPAIGN[campaign.seg]}
          offerDiscount
        />
      )}
    </>
  )
}
