import { Link } from 'react-router-dom'
import { NuriMark } from '../../components/Lattice'
import { Changsal } from './Changsal'
import { CATEGORY_LABEL } from '../../data/catalog'
import { useI18n } from '../../i18n'
import { useStore } from '../../store'
import { CATEGORIES, IMPORTED_ORIGINS } from '../lib'

export function Footer() {
  const { tx, pick, money } = useI18n()
  const zones = useStore((s) => s.zones)
  const settings = useStore((s) => s.settings)
  const cairo = zones[0]
  return (
    <footer className="sf-footer">
      <div className="sf-footer__lattice" aria-hidden="true">
        <Changsal cell={96} stroke="var(--lacquer-700)" width={2} />
      </div>
      <div className="sf-wrap sf-footer__grid">
        <div className="sf-footer__brand">
          <Link to="/" className="sf-brand" aria-label={tx('نوري، الصفحة الرئيسية', 'NURI home')}>
            <NuriMark size={40} frame="var(--lacquer-950)" pane="var(--paper-lit)" />
            <span className="sf-brand__word" aria-hidden="true">
              <span lang="ar">نوري</span>
              <span lang="en">NURI</span>
            </span>
          </Link>
          <h2 className="sf-footer__promise">{tx('وعد الأصالة', 'Our authenticity promise')}</h2>
          <p>
            {tx(
              'كل منتج بيوصل من موزّع معتمد، وكل عبوة عليها رقم التشغيلة وتاريخ الانتهاء. تقدري تشوفي سجل التشغيلة اللي هتوصلك في صفحة المنتج قبل ما تطلبي.',
              'Every product comes through an authorised supplier, and every unit carries its lot number and expiry. You can see the lot you will receive on the product page before you order.',
            )}
          </p>
        </div>
        <nav aria-label={tx('الأقسام', 'Categories')}>
          <h2 className="sf-footer__h">{tx('تسوّقي', 'Shop')}</h2>
          <ul className="sf-footer__list">
            {CATEGORIES.slice(0, 7).map((c) => (
              <li key={c}>
                <Link to={`/shop/${c}`}>{pick(CATEGORY_LABEL[c])}</Link>
              </li>
            ))}
            <li><Link to="/shop?origin=KR">{tx('كوري', 'K-beauty')}</Link></li>
            <li><Link to={`/shop?origin=${IMPORTED_ORIGINS.join(',')}`}>{tx('مستورد', 'Imported')}</Link></li>
          </ul>
        </nav>
        <nav aria-label={tx('المساعدة', 'Help')}>
          <h2 className="sf-footer__h">{tx('مساعدة', 'Help')}</h2>
          <ul className="sf-footer__list">
            <li><Link to="/routine">{tx('اعرفي روتينك', 'Routine finder')}</Link></li>
            <li><Link to="/account">{tx('تتبّعي طلبك', 'Track your order')}</Link></li>
            <li><Link to="/wishlist">{tx('المفضلة', 'Wishlist')}</Link></li>
            <li><a href={`mailto:${settings.email}`}>{settings.email}</a></li>
            <li><span dir="ltr" className="tabular">{settings.whatsapp}</span></li>
          </ul>
        </nav>
        <div>
          <h2 className="sf-footer__h">{tx('الدفع والتوصيل', 'Payment and delivery')}</h2>
          <p>
            {tx(
              `الدفع عند الاستلام متاح في كل المحافظات. التوصيل في ${cairo.name.ar} خلال ${cairo.etaDays[0]}–${cairo.etaDays[1]} يوم، ومجاني فوق ${money(cairo.freeOver)}.`,
              `Cash on delivery in every governorate. Delivery in ${cairo.name.en} takes ${cairo.etaDays[0]}–${cairo.etaDays[1]} days and is free over ${money(cairo.freeOver)}.`,
            )}
          </p>
          <p className="sf-footer__fine">
            {tx('الكروت والمحافظ وإنستاباي في وضع تجريبي حاليًا.', 'Cards, wallets and InstaPay are in demo mode for now.')}
          </p>
        </div>
      </div>
      <div className="sf-wrap sf-footer__base">
        <p>
          {tx(
            'متجر تجريبي: الأسعار والمخزون والتقييمات بيانات للعرض فقط.',
            'Demo store: prices, stock and reviews are sample data.',
          )}
        </p>
        <Link to="/admin" className="sf-footer__admin">
          {tx('لوحة التحكم', 'Admin')}
        </Link>
      </div>
    </footer>
  )
}
