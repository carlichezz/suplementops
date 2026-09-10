import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import StockTag from '../components/StockTag';
import ProductModal from '../components/admin/ProductModal';
import OrderModal from '../components/admin/OrderModal';
import VariantManager from '../components/admin/VariantManager';
import { AdminListSkeleton } from '../components/admin/AdminSkeleton';
import { api, adminSessionValid, estadoColor } from '../lib/api';
import { useLang } from '../lib/i18n';
import { sdUrl, onImgFallback } from '../lib/imageUrl';
import { variantGroups } from '../lib/format';
import { setSeo, DEFAULT_DESC } from '../lib/seo';

const TABS = [
  { key: 'productos', i18n: 'admin.tab.productos' },
  { key: 'categorias', i18n: 'admin.tab.categorias' },
  { key: 'variaciones', i18n: 'admin.tab.variaciones' },
  { key: 'ordenes', i18n: 'admin.tab.ordenes' },
  { key: 'notificaciones', i18n: 'admin.tab.notificaciones' },
];

const CODIGO_LEN = 6;

function OtpInput({ value, onChange, onEnter, error }) {
  const refs = useRef([]);
  const { t } = useLang();

  useEffect(() => {
    if (error) refs.current[0]?.focus?.();
  }, [error]);

  const maybeSubmit = (next) => {
    if (next.length === CODIGO_LEN && onEnter) onEnter(next);
  };

  const handle = (i, e) => {
    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '');
    if (raw.length > 1) {
      const next = raw.slice(0, CODIGO_LEN);
      onChange(next);
      refs.current[Math.min(next.length, CODIGO_LEN - 1)]?.focus?.();
      maybeSubmit(next);
      return;
    }
    const arr = value.padEnd(CODIGO_LEN, ' ').split('');
    arr[i] = raw;
    const next = arr.join('').replace(/ /g, '').slice(0, CODIGO_LEN);
    onChange(next);
    if (raw && i < CODIGO_LEN - 1) refs.current[i + 1]?.focus?.();
    maybeSubmit(next);
  };

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus?.();
    if (e.key === 'Enter' && onEnter) onEnter(value);
  };

  const onPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/[^A-Za-z0-9]/g, '');
    if (!text) return;
    e.preventDefault();
    const next = text.slice(0, CODIGO_LEN);
    onChange(next);
    refs.current[Math.min(next.length, CODIGO_LEN - 1)]?.focus?.();
    maybeSubmit(next);
  };

  return (
    <div className={`admin-otp otp${error ? ' shake' : ''}`} onPaste={onPaste}>
      {Array.from({ length: CODIGO_LEN }, (_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="otp-cell input input-bordered"
          inputMode="text"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={t('admin.digit', { n: i + 1 })}
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handle(i, e)}
          onKeyDown={(e) => onKey(i, e)}
        />
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { t, lang } = useLang();
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('productos');
  const [allProducts, setAllProducts] = useState([]);
  const [allCategorias, setAllCategorias] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [chatids, setChatids] = useState([]);
  const [filtroOrden, setFiltroOrden] = useState('');
  const [loadingTab, setLoadingTab] = useState(true);
  const [alert, setAlert] = useState(null);
  const alertTimer = useRef(null);

  const [code, setCode] = useState('');
  const [otpShake, setOtpShake] = useState(false);
  const [catInput, setCatInput] = useState('');
  const [chatInput, setChatInput] = useState({ chat_id: '', etiqueta: '' });

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [variacionesModal, setVariacionesModal] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [orderModal, setOrderModal] = useState(null);
  const catDialogRef = useRef(null);

  useEffect(() => {
    if (catModalOpen && catDialogRef.current && !catDialogRef.current.open) catDialogRef.current.showModal();
    else if (!catModalOpen && catDialogRef.current && catDialogRef.current.open) catDialogRef.current.close();
  }, [catModalOpen]);

  useEffect(() => {
    setSeo({ title: t('page.title.admin'), description: DEFAULT_DESC, noindex: true, canonical: '/admin' });
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    adminSessionValid().then((ok) => {
      if (!cancelled) setAuthed(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const showAlert = (msg, type) => {
    setAlert({ msg, type });
    clearTimeout(alertTimer.current);
    alertTimer.current = setTimeout(() => setAlert(null), 4000);
  };

  const load = async () => {
    setLoadingTab(true);
    try {
      const [prods, cats] = await Promise.all([api.list(), api.categorias.list()]);
      setAllProducts(prods);
      setAllCategorias(cats);
    } catch {
      showAlert(t('admin.alert.load'), 'error');
    } finally {
      setLoadingTab(false);
    }
  };

  const loadCategorias = async () => {
    setLoadingTab(true);
    try {
      setAllCategorias(await api.categorias.list());
    } catch {
      showAlert(t('admin.alert.load.cats'), 'error');
    } finally {
      setLoadingTab(false);
    }
  };

  const loadOrdenes = async (estado) => {
    setFiltroOrden(estado);
    setLoadingTab(true);
    try {
      setOrdenes(await api.ordenes.list(estado));
    } catch {
      showAlert(t('admin.alert.load.orders'), 'error');
    } finally {
      setLoadingTab(false);
    }
  };

  const loadChatIds = async () => {
    setLoadingTab(true);
    try {
      setChatids(await api.chatids.list());
    } catch {
      showAlert(t('admin.alert.load.chat'), 'error');
    } finally {
      setLoadingTab(false);
    }
  };

  useEffect(() => {
    if (!authed) return;
    if (tab === 'productos') load();
    else if (tab === 'categorias') loadCategorias();
    else if (tab === 'variaciones') load();
    else if (tab === 'ordenes') loadOrdenes(filtroOrden);
    else if (tab === 'notificaciones') loadChatIds();
  }, [authed, tab]);

  const [searchParams, setSearchParams] = useSearchParams();
  const openedFromUrl = useRef(false);

  useEffect(() => {
    const pendiente = searchParams.get('orden');
    if (!authed || !pendiente || openedFromUrl.current) return;
    const id = Number(pendiente);
    if (!id) return;
    if (tab !== 'ordenes') {
      setTab('ordenes');
      return;
    }
    if (ordenes.length === 0) return;
    openedFromUrl.current = true;
    openOrden(id);
    setSearchParams({}, { replace: true });
  }, [authed, tab, ordenes.length, searchParams]);

  /* ==================== LOGIN ==================== */

  const sendCode = async () => {
    showAlert('Solicitando código al bot...', 'info');
    let r;
    try {
      r = await api.adminCode();
    } catch (err) {
      showAlert('No se pudo contactar la API: ' + ((err && err.message) || err), 'error');
      return;
    }
    if (r.ok) showAlert('Código enviado a tu Telegram.', 'success');
    else showAlert(r.error || 'Error al enviar el código.', 'error');
  };

  const verify = async (valueParam) => {
    const codigo = String(valueParam ?? code).trim();
    if (!codigo) return showAlert('Ingresa el código recibido.', 'error');
    let r;
    try {
      r = await api.adminVerify(codigo);
    } catch (err) {
      showAlert('No se pudo contactar la API: ' + ((err && err.message) || err), 'error');
      return;
    }
    if (r.ok) {
      localStorage.setItem('admin_token', r.token);
      setAuthed(true);
      showAlert('Acceso concedido.', 'success');
    } else {
      setCode('');
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 500);
      showAlert(r.error || 'Código inválido.', 'error');
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setAuthed(false);
    setTab('productos');
    setOrderModal(null);
    showAlert('Sesión cerrada. Para volver a entrar, solicita un nuevo código.', 'info');
  };

  /* ==================== PRODUCTOS ==================== */

  const remove = async (id) => {
    if (!confirm(t('admin.confirm.delete.product'))) return;
    let res;
    try {
      res = await api.remove(id);
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      return;
    }
    if (res.ok) {
      showAlert(t('admin.deleted.product'), 'success');
      load();
    } else {
      showAlert(t('admin.alert.error'), 'error');
    }
  };

  /* ==================== CATEGORÍAS ==================== */

  const createCat = async (e) => {
    e.preventDefault();
    const nombre = catInput.trim();
    if (!nombre) return;
    let r;
    try {
      r = await api.categorias.create(nombre);
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      return;
    }
    if (r.ok) {
      showAlert(t('admin.created.cat'), 'success');
      setCatInput('');
      setCatModalOpen(false);
      await loadCategorias();
      await load();
    } else {
      showAlert(r.error || t('admin.alert.error'), 'error');
    }
  };

  const editCategoria = async (id) => {
    const c = allCategorias.find((x) => x.id == id);
    const name = prompt(t('admin.rename.cat'), c ? c.nombre : '');
    if (name === null) return;
    let r;
    try {
      r = await api.categorias.update(id, name.trim());
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      return;
    }
    if (r.ok) {
      showAlert(t('admin.updated.cat'), 'success');
      await loadCategorias();
      await load();
    } else {
      showAlert(r.error || t('admin.alert.error'), 'error');
    }
  };

  const deleteCategoria = async (id) => {
    const c = allCategorias.find((x) => x.id == id);
    if (!confirm(t('admin.confirm.delete.cat', { name: c ? c.nombre : '' }))) return;
    let r;
    try {
      r = await api.categorias.remove(id);
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      return;
    }
    if (r.ok) {
      showAlert(t('admin.deleted.cat'), 'success');
      await loadCategorias();
      await load();
    } else {
      showAlert(r.error || t('admin.alert.error'), 'error');
    }
  };

  /* ==================== ÓRDENES ==================== */

  const orderItemsCount = (o) => {
    try {
      const items = JSON.parse(o.productos || '[]');
      return items.reduce((a, i) => a + (Number(i.cantidad) || 0), 0);
    } catch {
      return 0;
    }
  };

  const openOrden = async (id) => {
    let o;
    try {
      o = await api.ordenes.get(id);
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      return;
    }
    if (!o || o.error) {
      showAlert(t('admin.alert.load.order'), 'error');
      return;
    }
    setOrderModal(o);
  };

  const navOrden = (dir) => {
    if (!orderModal) return;
    const idx = ordenes.findIndex((o) => String(o.id) === String(orderModal.id));
    const next = ordenes[idx + dir];
    if (next) {
      openOrden(next.id);
      setSearchParams({ orden: next.id }, { replace: true });
    }
  };

  const setEstado = async (id, estado, ev) => {
    if (ev) ev.stopPropagation();
    let r;
    try {
      r = await api.ordenes.setEstado(id, estado);
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      return null;
    }
    if (r.ok) {
      showAlert(t('admin.order.marked', { estado: t('estado.' + estado) }), 'success');
      loadOrdenes(filtroOrden);
      setOrderModal((m) => (m && m.id === id ? { ...m, estado } : m));
      return null;
    }
    return r.error || t('admin.alert.error');
  };

  const saveProductos = async (id, items) => {
    let r;
    try {
      r = await api.ordenes.updateProductos(id, items);
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      return { error: true };
    }
    if (r.ok) {
      loadOrdenes(filtroOrden);
      const fresh = await api.ordenes.get(id).catch(() => null);
      if (fresh && !fresh.error) setOrderModal(fresh);
      return { ok: true };
    }
    return { error: r.error || t('admin.alert.error') };
  };

  const orderActions = (o, setEstado) => {
    if (o.estado === 'entregada') return <span className="od-done">{t('admin.done')}</span>;
    if (o.estado === 'despachada') {
      return (
        <>
          <button className="btn btn-secondary btn-sm" onClick={(e) => setEstado(o.id, 'entregada', e)}>{t('admin.deliver')}</button>
          <button className="btn btn-error btn-sm" onClick={(e) => setEstado(o.id, 'pendiente', e)}>{t('admin.cancel.dispatch')}</button>
        </>
      );
    }
    return <button className="btn btn-secondary btn-sm" onClick={(e) => setEstado(o.id, 'despachada', e)}>{t('admin.dispatch')}</button>;
  };

  /* ==================== NOTIFICACIONES ==================== */

  const addChatId = async (e) => {
    e.preventDefault();
    const chat_id = chatInput.chat_id.trim();
    if (!chat_id) return;
    let r;
    try {
      r = await api.chatids.create(chat_id, chatInput.etiqueta.trim());
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      return;
    }
    if (r.ok) {
      showAlert(t('admin.added.chat'), 'success');
      setChatInput({ chat_id: '', etiqueta: '' });
      loadChatIds();
    } else {
      showAlert(r.error || t('admin.alert.error'), 'error');
    }
  };

  const deleteChatId = async (id) => {
    let r;
    try {
      r = await api.chatids.remove(id);
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      return;
    }
    if (r.ok) {
      showAlert(t('admin.deleted.chat'), 'success');
      loadChatIds();
    } else {
      showAlert(r.error || t('admin.alert.error'), 'error');
    }
  };

  /* ==================== RENDER ==================== */

  return (
    <>
      <Header admin onLogout={logout} />
      <main className="page">
        {alert ? <div className={`alert ${alert.type}`}>{alert.msg}</div> : null}

        {!authed ? (
          <div className="admin-login py-10 px-4" style={{ maxWidth: 480, margin: '0 auto' }}>
              <div className="card bg-base-100 shadow-md w-full p-6">
                <h2 className="font-bold text-xl mb-1">{t('admin.restricted')}</h2>
                <p style={{ margin: '0 0 16px', color: 'var(--muted)' }}>
                  {t('admin.request.code')}
                </p>
                <button type="button" className="btn btn-secondary w-full" onClick={sendCode}>
                  {t('admin.send.code')}
                </button>
                <div className="divider my-4">{t('admin.code.received')}</div>
                <OtpInput value={code} onChange={setCode} onEnter={verify} error={otpShake} />
                <Link to="/" className="btn btn-ghost w-full mt-8 hover:bg-transparent">{t('admin.back.catalog')}</Link>
              </div>
            </div>
        ) : (
          <>
            <div className="toolbar flex items-center gap-3" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Link to="/" className="btn btn-ghost btn-sm bg-transparent text-base-content">
                {t('admin.view.catalog')}
              </Link>
              {tab === 'categorias' ? (
                <button className="btn btn-secondary btn-sm" onClick={() => setCatModalOpen(true)}>
                  + {t('admin.create.cat')}
                </button>
              ) : null}
              {tab === 'productos' ? (
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditingProduct(null); setProductModalOpen(true); }}>
                  {t('admin.add.product')}
                </button>
              ) : null}
              {tab === 'variaciones' ? (
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditingProduct(null); setVariacionesModal({ type: 'pick' }); }}>
                  {t('admin.vm.edit.product')}
                </button>
              ) : null}
            {tab === 'ordenes' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="select select-sm shrink-0 min-w-[7rem] w-auto"
                    value={filtroOrden}
                    onChange={(e) => loadOrdenes(e.target.value)}
                  >
                    <option value="">{t('admin.all')}</option>
                    <option value="pendiente">{t('estado.pendiente')}</option>
                    <option value="despachada">{t('estado.despachada')}</option>
                    <option value="entregada">{t('estado.entregada')}</option>
                  </select>
                </div>
              ) : null}
            </div>

            {tab === 'variaciones' ? (
              <div className="tab-panel active">
                {loadingTab && allProducts.length === 0 ? (
                  <AdminListSkeleton variant="productos" rows={6} />
                ) : allProducts.length === 0 ? (
                  <div className="empty">{t('admin.no.products')}</div>
                ) : (
                  <div className="cat-list">
                    {allProducts.map((p) => {
                      const gs = variantGroups(p);
                      return (
                        <div className="cat-row" key={p.id} onClick={() => setVariacionesModal({ type: 'edit', id: p.id, product: p })}>
                          <div className="vm-avatar">
                            {p.imagen_url ? <img loading="lazy" src={sdUrl(p.imagen_url, 100)} alt="" onError={(e) => onImgFallback(e, p.imagen_url)} /> : null}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="cat-name">{p.titulo}</div>
                            <div className="cat-count">
                              {gs.length > 0
                                ? gs.map((g) => g.nombre).join(' · ')
                                : t('vm.no.groups')} · {Array.isArray(p.variaciones) ? p.variaciones.length : 0} {t('vm.variants')}
                            </div>
                          </div>
                          <div className="cat-actions">
                            <button className="btn btn-secondary btn-sm" onClick={(ev) => { ev.stopPropagation(); setVariacionesModal({ type: 'edit', id: p.id, product: p }); }}>
                              {t('admin.edit')}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <div className="toolbar mb-1 flex items-center gap-3">
              <div className="cats flex gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
                {TABS.map((tb) => (
                  <button
                    key={tb.key}
                    className={`cat-chip btn btn-sm rounded-full${tab === tb.key ? ' btn-accent text-white' : ' bg-base-100 text-base-content border-0 shadow-sm'}`}
                    onClick={() => setTab(tb.key)}
                  >
                    {t(tb.i18n)}
                  </button>
                ))}
              </div>
            </div>

            {tab === 'productos' ? (
              <div className="tab-panel active">
                <div className="grid admin-grid">
                  {loadingTab && allProducts.length === 0 ? (
                    <AdminListSkeleton variant="productos" rows={6} />
                  ) : allProducts.length === 0 ? (
                    <div className="empty">{t('admin.no.products')}</div>
                  ) : (
                    allProducts.map((p) => (
                      <div className="admin-list-item" key={p.id}>
                        <div className="admin-list-thumb">
                          {p.imagen_url ? <img loading="lazy" src={sdUrl(p.imagen_url, 200)} alt="" onError={(e) => onImgFallback(e, p.imagen_url)} /> : null}
                        </div>
                        <div className="admin-list-info">
                          <div className="admin-list-title">{p.titulo}</div>
                          <div className="admin-list-meta">
                            {p.publicado === 0 ? <span className="badge badge-ghost badge-sm">{t('admin.hidden')}</span> : null}
                            {p.categoria_nombre ? <span className="cat-chip">{p.categoria_nombre}</span> : null}
                            <span className="admin-list-price">{p.precio}</span>
                            <StockTag p={p} />
                          </div>
                        </div>
                        <div className="admin-list-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditingProduct(p); setProductModalOpen(true); }}>
                            {t('admin.edit')}
                          </button>
                          <button className="btn btn-error btn-sm" onClick={() => remove(p.id)}>{t('admin.delete')}</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            {tab === 'categorias' ? (
              <div className="tab-panel active">
                <div className="cat-list">
                  {loadingTab && allCategorias.length === 0 ? (
                    <AdminListSkeleton variant="categorias" rows={4} />
                  ) : allCategorias.length === 0 ? (
                    <div className="empty">{t('admin.no.cats')}</div>
                  ) : (
                    allCategorias.map((c) => (
                        <div className="cat-row" key={c.id}>
                          <div>
                            <div className="cat-name">{c.nombre}</div>
                            <div className="cat-count">{c.num_productos || 0} {t('count.products')}</div>
                          </div>
                          <div className="cat-actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => editCategoria(c.id)}>{t('admin.edit')}</button>
                            <button className="btn btn-error btn-sm" onClick={() => deleteCategoria(c.id)}>{t('admin.delete')}</button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            ) : null}

            {tab === 'ordenes' ? (
              <div className="tab-panel active">
                {loadingTab && ordenes.length === 0 ? (
                  <AdminListSkeleton variant="ordenes" rows={4} />
                ) : ordenes.length === 0 ? (
                  <div className="empty">{t('admin.no.orders')}</div>
                ) : (
                  ordenes.map((o) => (
                    <div className="order-card" key={o.id} onClick={() => openOrden(o.id)}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 w-full">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="order-title">#{o.id} · {o.nombre}</span>
                            <span className="badge border-0 font-semibold px-2 py-1 text-xs whitespace-nowrap" style={{ background: estadoColor(o.estado), color: '#fff' }}>
                              {t('estado.' + o.estado)}
                            </span>
                          </div>
                          <div className="order-sub">
                            {o.telefono || t('admin.no.phone')} · {orderItemsCount(o)} {t('count.products')}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-start sm:items-end gap-2">
                          <div className="order-total">{o.total}</div>
                          <div className="order-actions">{orderActions(o, setEstado)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}

            {tab === 'notificaciones' ? (
              <div className="tab-panel active">
                <div className="toolbar" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <p style={{ color: 'var(--muted)', margin: 0 }}>
                    {t('admin.chat.header')}
                  </p>
                </div>
                <form className="cat-form" onSubmit={addChatId}>
                  <input
                    className="input flex-1"
                    placeholder={t('admin.chat.ph')}
                    required
                    value={chatInput.chat_id}
                    onChange={(e) => setChatInput({ ...chatInput, chat_id: e.target.value })}
                  />
                  <input
                    className="input flex-1"
                    placeholder={t('admin.chat.etiqueta.ph')}
                    value={chatInput.etiqueta}
                    onChange={(e) => setChatInput({ ...chatInput, etiqueta: e.target.value })}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm">{t('admin.add')}</button>
                </form>
                <div className="cat-list">
                  {loadingTab && chatids.length === 0 ? (
                    <AdminListSkeleton variant="notificaciones" rows={3} />
                  ) : chatids.length === 0 ? (
                    <div className="empty">{t('admin.no.chat')}</div>
                  ) : (
                    chatids.map((c) => (
                      <div className="cat-row" key={c.id}>
                        <div>
                          <div className="cat-name">
                            {c.chat_id}
                            {c.etiqueta ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {c.etiqueta}</span> : null}
                          </div>
                          <div className="cat-count">{t('admin.chat.added', { date: c.creado_en || '—' })}</div>
                        </div>
                        <div className="cat-actions">
                          <button className="btn btn-error btn-sm" onClick={() => deleteChatId(c.id)}>{t('admin.delete')}</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <ProductModal
              open={productModalOpen}
              product={editingProduct}
              categorias={allCategorias}
              onClose={() => setProductModalOpen(false)}
              onShowAlert={showAlert}
              onSaved={load}
            />
            {variacionesModal ? (
              <dialog
                className="modal"
                open
                onCancel={(ev) => { ev.preventDefault(); setVariacionesModal(null); }}
                onClick={(ev) => { if (ev.target === ev.currentTarget) setVariacionesModal(null); }}
              >
                <div className="modal-box modal-card modal-card-wide" style={{ maxWidth: 760 }}>
                  <h2>{t('vm.title')}</h2>
                  {variacionesModal.type === 'pick' ? (
                    <div className="cat-list">
                      {allProducts.map((p) => (
                        <div className="cat-row" key={p.id} onClick={() => { const prod = allProducts.find((x) => x.id === p.id); setVariacionesModal({ type: 'edit', id: p.id, product: prod }); }}>
                          <div>
                            <div className="cat-name">{p.titulo}</div>
                            <div className="cat-count">{variantGroups(p).length} {t('vm.groups')} · {Array.isArray(p.variaciones) ? p.variaciones.length : 0} {t('vm.variants')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <VariantManager
                      product={variacionesModal.product || allProducts.find((x) => String(x.id) === String(variacionesModal.id)) || {}}
                      onDone={() => { setVariacionesModal(null); load(); }}
                      showAlert={showAlert}
                    />
                  )}
                  <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setVariacionesModal(null)}>{t('pm.cancel')}</button>
                  </div>
                </div>
              </dialog>
            ) : null}
            <OrderModal
              order={orderModal}
              orders={ordenes}
              onClose={() => setOrderModal(null)}
              onEstadoChange={setEstado}
              onShowAlert={showAlert}
              onNavigate={navOrden}
              catalog={allProducts}
              onSaveProductos={saveProductos}
            />
            <dialog
              ref={catDialogRef}
              className="modal"
              onCancel={(ev) => { ev.preventDefault(); setCatModalOpen(false); }}
              onClick={(ev) => { if (ev.target === ev.currentTarget) setCatModalOpen(false); }}
            >
              <div className="modal-box modal-card">
                <h2>{t('cat.title')}</h2>
                <form className="cat-modal-form" onSubmit={createCat}>
                  <input
                    className="input w-full"
                    placeholder={t('admin.new.cat')}
                    required
                    autoFocus
                    value={catInput}
                    onChange={(e) => setCatInput(e.target.value)}
                  />
                  <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setCatModalOpen(false)}>{t('cat.cancel')}</button>
                    <button type="submit" className="btn btn-secondary">{t('admin.create.cat')}</button>
                  </div>
                </form>
              </div>
            </dialog>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}