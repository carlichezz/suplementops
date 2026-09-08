import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../lib/cart';
import { useLang } from '../lib/i18n';
import { isSoldOut, stockOf } from '../lib/format';
import StockTag from './StockTag';
import { sdUrl, onImgFallback } from '../lib/imageUrl';

export default function ProductCard({ p, showDesc = true, showActions = true }) {
  const { add, qtyOf, flyToCart } = useCart();
  const { t, tr, catName } = useLang();
  const navigate = useNavigate();
  const tp = tr(p);
  const soldOut = isSoldOut(p);
  const stock = stockOf(p);

  const handleAdd = (e) => {
    if (qtyOf(p.id) >= stock) return;
    add(p.id, 1, stock);
    flyToCart(e.clientX, e.clientY);
  };

  const handleBuy = () => {
    add(p.id, 1);
    navigate('/checkout');
  };

return (
    <div className="card bg-base-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden">
      <Link to={`/product/${p.id}`} className="group block">
        <div className="relative aspect-[4/3] bg-base-100 mt-2">
          {p.imagen_url ? (
            <img
              loading="lazy"
              className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              src={sdUrl(p.imagen_url, 600)}
              alt={p.titulo}
              onError={(e) => onImgFallback(e, p.imagen_url)}
            />
          ) : null}
        </div>
      </Link>
      <div className="card-body p-3.5 gap-1.5">
        <h3 className="text-[0.98rem] font-semibold line-clamp-2 min-h-[2.5em] text-balance">{tp.titulo}</h3>
        {showDesc && tp.descripcion && tp.descripcion !== tp.titulo ? (
          <p className="desc-clamp text-[0.82rem] text-neutral/60 -mt-0.5">{tp.descripcion}</p>
        ) : null}
        <div className="meta text-[0.82rem] text-neutral/60 flex items-center gap-2 flex-wrap">
          {p.categoria_nombre ? <span className="badge badge-secondary border-0 font-semibold px-2 py-1 text-xs whitespace-nowrap">{catName(p.categoria_nombre)}</span> : null}
        </div>
        <div className="price mt-auto text-[1.35rem] font-bold text-accent">{p.precio}</div>
        <StockTag p={p} />
      </div>
      {showActions ? (
        <div className="flex flex-col gap-2 px-3.5 pb-3.5">
          <button className="btn btn-accent btn-sm w-full" disabled={soldOut || qtyOf(p.id) >= stock} onClick={handleAdd}>
            {soldOut ? t('sold.out') : qtyOf(p.id) >= stock ? t('add.full') : t('add.cart')}
          </button>
          <button className="btn btn-secondary btn-sm w-full" disabled={soldOut} onClick={handleBuy}>
            {t('buy.now')}
          </button>
        </div>
      ) : null}
    </div>
  );
}