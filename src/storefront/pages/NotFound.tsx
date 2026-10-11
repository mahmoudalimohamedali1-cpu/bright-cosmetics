import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useTitle } from '../lib'
import { Forward, Sticker } from '../components/bits'

export default function NotFound() {
  const { tx } = useI18n()
  useTitle(tx('الصفحة مش موجودة', 'Page not found'))
  return (
    <div className="sf-wrap sf-page sf-404">
      <div className="sf-404__mark" aria-hidden="true">
        <Sticker size={240}>
          <span className="sf-404__n">404</span>
        </Sticker>
      </div>
      <div className="sf-404__copy">
        <h1 className="sf-display">{tx('الصفحة دي مش هنا', 'This page wandered off')}</h1>
        <p className="sf-pagehead__lede">
          {tx('يمكن اللينك اتغيّر أو المنتج اتشال. جرّبي واحدة من دول:', 'The link may have changed or the product was removed. Try one of these:')}
        </p>
        <ul className="sf-404__links">
          <li><Link to="/shop">{tx('كل المنتجات', 'All products')}<Forward /></Link></li>
          <li><Link to="/routine">{tx('اعرفي روتينك', 'Find your routine')}<Forward /></Link></li>
          <li><Link to="/account">{tx('تابعي طلبك', 'Track your order')}<Forward /></Link></li>
          <li><Link to="/">{tx('الصفحة الرئيسية', 'Home')}<Forward /></Link></li>
        </ul>
      </div>
    </div>
  )
}
