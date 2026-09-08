import React, { useEffect, useMemo, useRef, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CartUI from '../components/CartUI';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import SortMenu from '../components/SortMenu';
import { api } from '../lib/api';
import { useLang } from '../lib/i18n';
import { priceNum, rankNum, ratingNum } from '../lib/format';

const INITIAL_COUNT = 8;
const LOAD_CHUNK = 4;

export default function CatalogPage() {
  const { t, tr, catName, lang } = useLang();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(INITIAL_COUNT);
  const [q, setQ] = useState('');
  const [currentCat, setCurrentCat] = useState('');
  const [currentSort, setCurrentSort] = useState('ranking');
  const [alert, setAlert] = useState(null);
  const alertTimer = useRef(null);
  const sentinelRef = useRef(null);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    clearTimeout(alertTimer.current);
    alertTimer.current = setTimeout(() => setAlert(null), 2000);
  };

  useEffect(() => {
    setLoading(true);
    api
      .list()
      .then((data) => setAll(data))
      .catch(() => showAlert(t('load.error'), 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setShown(INITIAL_COUNT);
  }, [q, currentCat, currentSort]);

  useEffect(() => {
    document.title = t('page.title');
  }, [lang]);

  const cats = useMemo(() => {
    const m = {};
    all.forEach((p) => {
      if (p.categoria_id && !m[p.categoria_id]) {
        m[p.categoria_id] = catName(p.categoria_nombre || t('cats.fallback', { n: p.categoria_id }));
      }
    });
    return Object.entries(m).sort((a, b) => a[1].localeCompare(b[1]));
  }, [all, lang, t]);

  const items = useMemo(() => {
    const query = q.toLowerCase();
    const filtered = all.filter((p) => {
      const tp = tr(p);
      return (
        (((tp.titulo || '').toLowerCase().includes(query) ||
          (tp.descripcion || '').toLowerCase().includes(query)) &&
          (!currentCat || String(p.categoria_id) === currentCat))
      );
    });
    filtered.sort((a, b) => {
      switch (currentSort) {
        case 'price-asc':
          return priceNum(a.precio) - priceNum(b.precio);
        case 'price-desc':
          return priceNum(b.precio) - priceNum(a.precio);
        case 'name':
          return (tr(a).titulo || '').localeCompare(tr(b).titulo || '');
        case 'rating':
          return ratingNum(b.rating) - ratingNum(a.rating);
        default:
          return rankNum(a.ranking) - rankNum(b.ranking);
      }
    });
    return filtered;
  }, [all, q, currentCat, currentSort, lang]);

  const visible = items.slice(0, shown);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || shown >= items.length) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown((s) => Math.min(items.length, s + LOAD_CHUNK));
        }
      },
      { rootMargin: '300px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [items.length, shown]);

  const chipClass = (active) =>
    `cat-chip btn btn-sm rounded-full ${active ? 'btn-accent text-white' : 'bg-base-100 text-base-content border-0 shadow-sm'}`;

  return (
    <>
      <Header showSearch searchValue={q} onSearchChange={setQ} />
      <main className="page max-w-[1200px] w-full mx-auto px-4 py-5 flex-1">
        <section
          className="hero rounded-box overflow-hidden mb-5 shadow-lg min-h-[220px] md:min-h-[300px]"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(26,26,46,0.45) 0%, rgba(15,52,96,0.35) 55%, rgba(233,69,96,0.25) 140%), url(/young-sports-man-training-gym.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="hero-overlay bg-black/10"></div>
          <div className="hero-content text-center text-neutral-content py-10 lg:py-14 px-4">
            <div className="max-w-2xl">
              <h1 className="text-white text-3xl lg:text-3xl font-black mb-2 tracking-tight drop-shadow font-semibold">
                {t('page.title')}
              </h1>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-2 mb-3 md:hidden">
          <input
            type="text"
            className="input h-9 min-h-9 flex-1 min-w-0 text-sm"
            placeholder={t('search.ph')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <SortMenu currentSort={currentSort} onChange={setCurrentSort} />
        </div>

        {alert ? (
          <div className={`alert shadow-sm mb-4 alert-${alert.type}`} role="status">{alert.msg}</div>
        ) : null}

        <div className="toolbar mb-1 flex items-center gap-3">
          <div className="cats flex gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
            <button className={chipClass(!currentCat)} onClick={() => setCurrentCat('')}>{t('cats.all')}</button>
            {cats.map(([id, name]) => (
              <button
                key={id}
                className={chipClass(String(currentCat) === id)}
                onClick={() => setCurrentCat(id)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="hidden md:block shrink-0">
            <SortMenu currentSort={currentSort} onChange={setCurrentSort} />
          </div>
        </div>

        <p className="count text-sm text-neutral/60 mb-3">
          {items.length} {t('count.products')}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: INITIAL_COUNT }).map((_, i) => <ProductCardSkeleton key={i} />)
          ) : (
            visible.map((p) => <ProductCard key={p.id} p={p} />)
          )}
        </div>
        {!loading && !visible.length && items.length === 0 ? (
          <div className="empty text-center text-neutral/60 py-16">{t('no.products')}</div>
        ) : null}
        {!loading && visible.length > 0 && visible.length < items.length ? (
          <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-2" aria-hidden="true">
            <span className="loading loading-spinner loading-sm text-accent" />
          </div>
        ) : null}
      </main>
      <CartUI catalog={all} />
      <Footer />
    </>
  );
}