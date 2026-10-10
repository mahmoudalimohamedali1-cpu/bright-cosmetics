import { Link } from 'react-router-dom'
import { Changsal } from '../components/Changsal'
import { useI18n } from '../../i18n'
import { useTitle } from '../lib'
import { Forward } from '../components/bits'

export default function NotFound() {
  const { tx } = useI18n()
  useTitle(tx('الصفحة مش موجودة', 'Page not found'))
  return (
    <div className="sf-wrap sf-page sf-404">
      <div className="sf-404__window" aria-hidden="true">
        <Changsal cell={96} stroke="var(--lacquer-700)" width={3} />
      </div>
      <div className="sf-404__copy">
        <h1 className="sf-h1">{tx('الشبّاك ده مقفول', 'This window is shut')}</h1>
        <p className="sf-muted">
          {tx('الصفحة اللي بتدوّري عليها مش هنا، يمكن اللينك اتغيّر أو المنتج اتشال. جرّبي واحدة من دول:', 'The page you are looking for is not here; the link may have changed or the product was removed. Try one of these:')}
        </p>
        <ul className="sf-404__links">
          <li><Link to="/shop" className="sf-textbtn">{tx('كل المنتجات', 'All products')}<Forward /></Link></li>
          <li><Link to="/routine" className="sf-textbtn">{tx('اعرفي روتينك', 'Find your routine')}<Forward /></Link></li>
          <li><Link to="/account" className="sf-textbtn">{tx('تابعي طلبك', 'Track your order')}<Forward /></Link></li>
          <li><Link to="/" className="sf-textbtn">{tx('الصفحة الرئيسية', 'Home')}<Forward /></Link></li>
        </ul>
      </div>
    </div>
  )
}
