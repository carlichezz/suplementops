import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { useLang } from '../lib/i18n';
import { money, priceNum, variantOf, variantPrice, variantStock } from '../lib/format';
import { sdUrl, onImgFallback, resUrl } from '../lib/imageUrl';

function CartFly({ x, y, onDone }) {
  const elRef = useRef(null);
  useEffect(() => {
    const el = elRef.current;
    const badge = document.getElementById('cart-badge');
    if (el && badge) {
      const a = el.getBoundingClientRect();
      const b = badge.getBoundingClientRect();
      el.style.setProperty('--dx', `${b.left + b.width / 2 - (a.left + a.width / 2)}px`);
      el.style.setProperty('--dy', `${b.top + b.height / 2 - (a.top + a.height / 2)}px`);
    }
  }, []);
  return (
    <span ref={elRef} className="cart-fly" style={{ left: x, top: y }} onAnimationEnd={onDone}>
      +1
    </span>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export default function CartUI({ catalog = [] }) {
  const { items, getCount, getTotal, setQty, remove, panelOpen, openPanel, closePanel, flights, clearFlight } = useCart();
  const { t, tr } = useLang();
  const navigate = useNavigate();
  const count = getCount();
  const total = getTotal(catalog);
  const empty = items.length === 0;
  const [bump, setBump] = useState(0);

  // El número visible sólo avanza cuando los vuelos (+1) "chocan" con el badge.
  const displayCount = Math.max(0, count - flights.length);

  const handleFlyEnd = (id) => {
    clearFlight(id);
    setBump((b) => b + 1);
  };

  const goCheckout = () => {
    if (count === 0) return;
    navigate('/checkout');
  };

  const increment = (item, p) => {
    const max = variantStock(p, item.variante_id);
    if (item.cantidad < max) setQty(item.id, item.cantidad + 1, max, item.variante_id);
  };

  return (
    <>
      <div className="drawer drawer-end z-[95]">
        <input
          id="cart-drawer"
          type="checkbox"
          className="drawer-toggle"
          checked={panelOpen}
          onChange={(e) => (e.target.checked ? openPanel() : closePanel())}
        />

        <div className="drawer-side z-[95]">
          <label htmlFor="cart-drawer" aria-label="close sidebar" className="drawer-overlay bg-black/50" />
          <aside className="bg-base-100 min-h-full w-[400px] max-w-[92vw] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
              <h2 className="font-bold text-lg">{t('cart.title')}</h2>
              <label htmlFor="cart-drawer" className="btn btn-square btn-sm btn-ghost" aria-label={t('cart.close')}>✕</label>
            </div>

            <div className="cart-items flex-1 overflow-y-auto px-4 py-2">
              {empty ? (
                <div className="cart-empty">{t('cart.empty')}</div>
              ) : (
                items.map((item) => {
                  const p = catalog.find((x) => x.id == item.id);
                  if (!p) return null;
                  const tp = tr(p);
                  const v = variantOf(p, item.variante_id);
                  const thumb = (v && v.imagen) || p.imagen_url;
                  const subtotal = priceNum(variantPrice(p, item.variante_id)) * item.cantidad;
                  return (
                    <div className="cart-item" key={`${p.id}:${item.variante_id || ''}`}>
                      <Link className="cart-thumb" to={`/product/${p.id}`}>
                        {thumb ? (
                          <img
                            src={resUrl(sdUrl(thumb, 200))}
                            alt=""
                            loading="lazy"
                            onError={(e) => onImgFallback(e, thumb)}
                          />
                        ) : null}
                      </Link>
                      <div className="cart-info">
                        <Link className="cart-name" to={`/product/${p.id}`}>{tp.titulo}</Link>
                        {v && v.nombre ? <div className="cart-variant">{v.nombre}</div> : null}
                        <div className="cart-price">{variantPrice(p, item.variante_id)}</div>
                        <div className="cart-qty">
                          <button className="btn btn-xs btn-ghost" onClick={() => setQty(item.id, item.cantidad - 1, null, item.variante_id)} aria-label={t('cart.less')}>−</button>
                          <span className="qty-num">{item.cantidad}</span>
                          <button className="btn btn-xs btn-ghost" onClick={() => increment(item, p)} aria-label={t('cart.more')}>+</button>
                          <button className="btn btn-xs btn-ghost text-error" onClick={() => remove(item.id, item.variante_id)}>{t('cart.remove')}</button>
                        </div>
                      </div>
                      <div className="cart-subtotal">{money(subtotal)}</div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-5 border-t border-base-300">
              <div className="flex justify-between items-center font-bold text-lg mb-3">
                <span>{t('cart.total')}</span>
                <span className="text-accent">{empty ? '' : money(total)}</span>
              </div>
              <button className="btn btn-accent w-full" disabled={empty} onClick={goCheckout}>{t('cart.buy')}</button>
            </div>
          </aside>
        </div>
      </div>

      {!panelOpen ? (
      <div className="sticky bottom-6 z-[96] w-full flex justify-end px-4 pointer-events-none mb-4 mr-2">
        <span key={bump} className="indicator indicator-shake pointer-events-auto">
          <label
            htmlFor="cart-drawer"
            className="btn btn-circle btn-accent btn-lg shadow-lg shadow-accent/40 cursor-pointer"
            aria-label={t('cart.open')}
          >
            <CartIcon />
          </label>
          <span id="cart-badge" className="indicator-item badge bg-white text-accent border-accent border-2 rounded-full min-w-6 h-6 px-1.5 font-bold text-xs shadow" style={{ transform: 'translate(-20%, 20%)' }}>{displayCount}</span>
        </span>
      </div>
      ) : null}

      {flights.map((f) => (
        <CartFly key={f.id} x={f.x} y={f.y} onDone={() => handleFlyEnd(f.id)} />
      ))}
    </>
  );
}