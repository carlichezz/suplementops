import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CartUI from '../components/CartUI';
import ProductCard from '../components/ProductCard';
import StockTag from '../components/StockTag';
import Lightbox from '../components/Lightbox';
import { api } from '../lib/api';
import { useCart } from '../lib/cart';
import { useLang } from '../lib/i18n';
import { isSoldOut, stockOf, variantPrice, variantStock, variantOf, variantGroups } from '../lib/format';
import { sdUrl, onImgFallback } from '../lib/imageUrl';

function galleryImages(p, selectedVariant) {
  const imgs = [];
  if (!p) return imgs;
  if (selectedVariant && selectedVariant.imagen) imgs.push(selectedVariant.imagen);
  if (p.imagen_url) imgs.push(p.imagen_url);
  if (p.imagenes_extra) {
    String(p.imagenes_extra)
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean)
      .forEach((u) => imgs.push(u));
  }
  return imgs;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function findRelated(product, all, n) {
  const words = new Set(tokenize(product.titulo));
  const scored = all
    .filter((p) => p.id != product.id)
    .map((p) => {
      const pwords = tokenize(p.titulo);
      const overlap = pwords.filter((w) => words.has(w)).length;
      const bigrams = pwords.filter(
        (w) => words.size > 0 && [...words].some((x) => x.length > 3 && w.includes(x))
      ).length;
      return { p, score: overlap + bigrams };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, n).map((x) => x.p);
}

export default function ProductPage() {
  const { add, qtyOf, flyToCart } = useCart();
  const { t, tr, catName, lang } = useLang();
  const navigate = useNavigate();
  const { id } = useParams();
  const [all, setAll] = useState([]);
  const [current, setCurrent] = useState(null);
  const [status, setStatus] = useState('loading');
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [sel, setSel] = useState({});
  const trackRef = useRef(null);
  const trackDrag = useRef(null);

  // Elegir la primera opción de cada grupo por defecto
  const preselect = (groups) => {
    const out = {};
    (Array.isArray(groups) ? groups : []).forEach((g) => {
      if (Array.isArray(g.opciones) && g.opciones.length) out[g.nombre] = g.opciones[0];
    });
    return out;
  };

  // Encontrar la variación que coincide con la selección actual
  const matchVariant = (p, selection) => {
    const vs = Array.isArray(p && p.variaciones) ? p.variaciones : [];
    const keys = Object.keys(selection);
    if (keys.length === 0 || vs.length === 0) return null;
    const a = vs.find((v) => {
      const va = v.atributos || {};
      return keys.every((k) => va[k] === selection[k]);
    });
    return a || null;
  };

  // Sincroniza activeIdx con el scroll horizontal del carrusel
  const onTrackScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== activeIdx) setActiveIdx(Math.min(imgs.length - 1, Math.max(0, i)));
  };

  const onTrackPointerDown = () => {
    trackDrag.current = { left: trackRef.current?.scrollLeft ?? 0 };
  };

  // Ignora el click que sigue a un swipe (todo el track no cambió de slide)
  const onTrackClickCapture = (e) => {
    const d = trackDrag.current;
    if (d && Math.abs((trackRef.current?.scrollLeft ?? 0) - d.left) > 4) {
      e.stopPropagation();
      e.preventDefault();
    }
    trackDrag.current = null;
  };

  // Al cambiar índice programáticamente (click en thumb/lightbox), scrollea el carrusel
  useEffect(() => {
    const el = trackRef.current;
    if (el && el.clientWidth > 0) {
      el.scrollTo({ left: activeIdx * el.clientWidth });
    }
  }, [activeIdx]);

  useEffect(() => {
    document.title = t('page.title.product');
  }, [lang]);

  useEffect(() => {
    if (!id) {
      setStatus('notfound');
      return;
    }
    api
      .list()
      .then((data) => {
        const found = data.find((p) => p.id == id);
        if (!found) {
          setStatus('notfound');
          return;
        }
        setAll(data);
        setCurrent(found);
        setActiveIdx(0);
        const groups = variantGroups(found);
        setSel(preselect(groups));
        setStatus('loaded');
      })
      .catch(() => setStatus('error'));
  }, [id]);

  const imgs = useMemo(
    () => galleryImages(current, matchVariant(current, sel)),
    [current, sel]
  );
  const related = useMemo(
    () => (current ? findRelated(tr(current), all.map((x) => tr(x)), 4) : []),
    [current, all, lang]
  );

  if (status !== 'loaded') {
    return (
      <>
        <Header />
        <main className="page max-w-[1100px] w-full mx-auto px-4 py-5 flex-1">
          {status === 'loading' ? (
            <div className="flex flex-col gap-4">
              <div className="skeleton h-64 md:h-96 rounded-box" />
              <div className="skeleton h-8 w-3/4 rounded" />
              <div className="skeleton h-4 w-1/2 rounded" />
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-12 w-40 rounded" />
            </div>
          ) : (
            <div className="empty">{status === 'error' ? t('prod.error') : t('prod.notfound')}</div>
          )}
        </main>
        <CartUI catalog={all} />
      </>
    );
  }

  const p = current;
  const tp = tr(p);
  const groups = variantGroups(p);
  const hasGroups = groups.length > 0;
  const selectedVariant = matchVariant(p, sel);
  const displayPrice = hasGroups ? variantPrice(p, selectedVariant && selectedVariant.id) : p.precio;
  const effStock = hasGroups ? variantStock(p, selectedVariant && selectedVariant.id) : stockOf(p);
  const soldOut = hasGroups ? effStock <= 0 : isSoldOut(p);

  const handleAdd = (e) => {
    if (qtyOf(p.id, selectedVariant && selectedVariant.id) >= effStock) return;
    add(p.id, 1, effStock, selectedVariant && selectedVariant.id);
    flyToCart(e.clientX, e.clientY);
  };

  const handleBuy = () => {
    if (qtyOf(p.id, selectedVariant && selectedVariant.id) >= effStock) return;
    add(p.id, 1, effStock, selectedVariant && selectedVariant.id);
    navigate('/checkout');
  }; 
  return (
    <>
      <Header />
      <main className="page max-w-[1100px] w-full mx-auto px-4 py-5 flex-1">
        <div className="breadcrumb mb-3.5">
          <Link to="/" className="link link-hover">{t('prod.back')}</Link>
        </div>
        <div className="product-main">
          <div className="product-gallery">
            {imgs.length === 0 ? (
              <div className="empty">{t('prod.noimage')}</div>
            ) : (
              <>
                <div className="img-wrap cursor-zoom-in" onClick={() => setLightbox(true)}>
                  <div
                    className="gallery-track"
                    ref={trackRef}
                    onScroll={onTrackScroll}
                    onPointerDown={onTrackPointerDown}
                    onClickCapture={onTrackClickCapture}
                  >
                    {imgs.map((u, i) => (
                      <div key={i} className="gallery-slide">
                        {i <= activeIdx + 1 ? (
                          <img
                            src={sdUrl(u, 900)}
                            alt=""
                            draggable={false}
                            onError={(e) => onImgFallback(e, u)}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                {imgs.length > 1 ? (
                  <div className="thumbs">
                    {imgs.map((u, i) => (
                      <img
                        key={i}
                        className={`thumb ${i === activeIdx ? 'active' : ''}`}
                        src={sdUrl(u, 120)}
                        alt=""
                        onClick={() => setActiveIdx(i)}
                        onError={(e) => onImgFallback(e, u)}
                      />
                    ))}
                  </div>
                ) : null}
              </>
            )}
            {lightbox && imgs.length > 0 ? (
              <Lightbox
                images={imgs}
                index={activeIdx}
                onClose={() => setLightbox(false)}
                onNavigate={setActiveIdx}
              />
            ) : null}
          </div>
          <div className="product-info">
            <h1 className="text-2xl font-bold mt-2">{tp.titulo}</h1>
            <div className="product-price">{displayPrice}</div>
            <div className="product-meta flex items-center gap-2 flex-wrap">
              {p.categoria_nombre ? <span className="badge badge-secondary border-0 font-semibold px-2 py-1 text-xs whitespace-nowrap">{catName(p.categoria_nombre)}</span> : null}
            </div>
            <StockTag p={{ ...p, stock: effStock }} />
            {tp.descripcion && tp.descripcion !== tp.titulo ? <div className="product-desc">{tp.descripcion}</div> : null}
            {hasGroups ? (
              <div className="product-options">
                {groups.map((g) => (
                  <div className="var-group" key={g.nombre}>
                    <span className="var-group-label">{g.nombre}</span>
                    <div className="var-chips">
                      {(g.opciones || []).map((op) => (
                        <button
                          type="button"
                          key={op}
                          className={`var-chip${sel[g.nombre] === op ? ' active' : ''}`}
                          onClick={() => setSel((s) => ({ ...s, [g.nombre]: op }))}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {selectedVariant && selectedVariant.nombre ? (
                  <div className="var-summary">{t('prod.variant', { name: selectedVariant.nombre })}</div>
                ) : null}
                <button className="btn btn-accent" disabled={soldOut} onClick={handleAdd}>
                  {soldOut ? t('sold.out') : t('add.cart')}
                </button>
                <button className="btn btn-secondary" disabled={soldOut} onClick={handleBuy}>
                  {t('buy.now')}
                </button>
              </div>
            ) : (
              <div className="product-options">
                <button className="btn btn-accent" disabled={soldOut} onClick={handleAdd}>
                  {soldOut ? t('sold.out') : t('add.cart')}
                </button>
                <button className="btn btn-secondary" disabled={soldOut} onClick={handleBuy}>
                  {t('buy.now')}
                </button>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 ? (
          <section className="related">
            <h2>{t('related.interest')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {related.map((rp) => (
                <ProductCard key={rp.id} p={rp} showDesc={false} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <CartUI catalog={all} />
      <Footer />
    </>
  );
}