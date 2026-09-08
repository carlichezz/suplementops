import React, { useEffect, useRef, useState } from 'react';
import { PinIcon } from '../Icons';
import { useLang } from '../../lib/i18n';
import { ESTADOS_ORDEN, estadoColor } from '../../lib/api';
import { money, priceNum } from '../../lib/format';
import { sdUrl, onImgFallback } from '../../lib/imageUrl';

function formatFecha(v) {
  if (!v) return '—';
  const d = new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T'));
  if (isNaN(d)) return String(v);
  return d.toLocaleString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function parseItems(raw) {
  let arr = raw;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr || '[]');
    } catch {
      arr = [];
    }
  }
  return Array.isArray(arr) ? arr : [];
}

// Campo de solo lectura con el mismo estilo de inputs flotantes
function ReadField({ label, value, textarea = false }) {
  const common = {
    className: textarea ? 'textarea w-full' : 'input w-full',
    value: value ?? '',
    readOnly: true,
    disabled: true,
    placeholder: ' ',
    tabIndex: -1,
    'aria-label': label,
  };
  return (
    <div className="field-float">
      {textarea ? <textarea {...common} /> : <input type="text" {...common} />}
      <label>{label}</label>
    </div>
  );
}

export default function OrderModal({
  order,
  orders = [],
  onClose,
  onEstadoChange,
  onShowAlert,
  onNavigate,
  catalog = [],
  onSaveProductos,
}) {
  const { t } = useLang();
  const dialogRef = useRef(null);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [addSel, setAddSel] = useState('');

  useEffect(() => {
    if (order) {
      setItems(parseItems(order.productos));
      setPendingAction(null);
      setAddSel('');
      setSaving(false);
    }
  }, [order && order.id]);

  useEffect(() => {
    if (order && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    else if (!order && dialogRef.current && dialogRef.current.open) dialogRef.current.close();
  }, [order]);

  if (!order) return null;

  const origItems = parseItems(order.productos);
  const origKey = JSON.stringify(origItems.map((i) => [String(i.id), Number(i.cantidad) || 1]));
  const curKey = JSON.stringify(items.map((i) => [String(i.id), Number(i.cantidad) || 1]));
  const dirty = origKey !== curKey;

  const mapsUrl =
    order.lat != null && order.lon != null
      ? `https://www.google.com/maps?q=${order.lat},${order.lon}`
      : null;
  const label = (estado) => t('estado.' + estado);
  const subtotal = (i) => money(priceNum(i.precio) * Number(i.cantidad || 1));
  const totalCalc = money(items.reduce((a, i) => a + priceNum(i.precio) * Number(i.cantidad || 1), 0));

  const myIdx = orders.findIndex((o) => String(o.id) === String(order.id));
  const hasPrev = myIdx > 0;
  const hasNext = myIdx >= 0 && myIdx < orders.length - 1;

  const doNavigate = (dir) => {
    if (onNavigate) onNavigate(dir);
  };

  const requestClose = () => {
    if (dirty) setPendingAction({ type: 'close' });
    else onClose();
  };

  const requestNav = (dir) => {
    if (dirty) setPendingAction({ type: 'nav', dir });
    else doNavigate(dir);
  };

  const finishAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'nav') doNavigate(pendingAction.dir);
    else onClose();
  };

  const save = async () => {
    setSaving(true);
    let res;
    try {
      res = onSaveProductos ? await onSaveProductos(order.id, items) : { ok: true };
    } catch (err) {
      onShowAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
      setSaving(false);
      return false;
    }
    setSaving(false);
    if (res && res.ok) {
      onShowAlert(t('om.saved'), 'success');
      return true;
    }
    onShowAlert((res && res.error) || t('admin.alert.error'), 'error');
    return false;
  };

  const saveAndThen = async () => {
    const ok = await save();
    if (ok) finishAction();
  };

  const discardAndThen = () => {
    setItems(origItems.map((i) => ({ ...i })));
    finishAction();
  };

  const cambiarEstado = async (estado) => {
    const res = await onEstadoChange(order.id, estado);
    if (res) onShowAlert(res, 'error');
  };

  const changeQty = (idx, delta) => {
    setItems((prev) => prev.map((i, n) => (n === idx ? { ...i, cantidad: Math.max(1, Number(i.cantidad || 1) + delta) } : i)));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, n) => n !== idx));
  };

  const addable = catalog.filter((p) => !items.some((i) => String(i.id) === String(p.id)));
  const addSelected = () => {
    const p = catalog.find((c) => String(c.id) === String(addSel));
    if (!p) return;
    setItems((prev) => [...prev, { id: p.id, titulo: p.titulo, precio: p.precio, cantidad: 1, imagen_url: p.imagen_url || null, variante_id: null, variante_nombre: null }]);
    setAddSel('');
  };

  const estadoActions = () => {
    if (order.estado === 'entregada') return <span className="od-done">{t('admin.done')}</span>;
    if (order.estado === 'despachada') {
      return (
        <>
          <button className="btn btn-secondary btn-sm" onClick={() => cambiarEstado('entregada')}>{t('admin.deliver')}</button>
          <button className="btn btn-error btn-sm" onClick={() => cambiarEstado('pendiente')}>{t('admin.cancel.dispatch')}</button>
        </>
      );
    }
    return <button className="btn btn-secondary btn-sm" onClick={() => cambiarEstado('despachada')}>{t('admin.dispatch')}</button>;
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onCancel={(e) => { e.preventDefault(); requestClose(); }}
      onClick={(ev) => { if (ev.target === ev.currentTarget) requestClose(); }}
    >
      <div className="modal-box modal-card">
        <div className="order-header">
          <button type="button" className="order-nav-btn" disabled={!hasPrev} onClick={() => requestNav(-1)} aria-label={t('om.prev')}>‹</button>
          <div className="order-header-center">
            <div className="order-oid">
              #{order.id}
              {myIdx >= 0 ? <span className="order-nav-count">({myIdx + 1}/{orders.length})</span> : null}
            </div>
            <div className="order-date">Creada: {formatFecha(order.creado_en)}</div>
            <span className="order-status-badge" style={{ background: estadoColor(order.estado), color: '#fff' }}>
              ● {label(order.estado)}
            </span>
          </div>
          <button type="button" className="order-nav-btn" disabled={!hasNext} onClick={() => requestNav(1)} aria-label={t('om.next')}>›</button>
        </div>

        <div className="divider my-2" style={{ color: 'var(--muted)' }}>{t('om.client')}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 gap-x-6">
          <ReadField label={t('om.client')} value={order.nombre} />
          <ReadField label={t('om.phone')} value={order.telefono} />
        </div>
        {order.telefono_alt ? (
          <ReadField label={t('om.phone_alt')} value={order.telefono_alt} />
        ) : null}

        <div className="divider my-2" style={{ color: 'var(--muted)' }}>{t('om.address')}</div>
        <ReadField label={t('om.address')} value={order.direccion} textarea />
        {mapsUrl ? (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <a className="btn btn-secondary btn-sm" href={mapsUrl} target="_blank" rel="noopener">
              <PinIcon /> {t('om.map')}
            </a>
          </div>
        ) : null}
        {order.nota ? (
          <ReadField label={t('om.nota')} value={order.nota} textarea />
        ) : null}

        <div className="divider my-2" style={{ color: 'var(--muted)' }}>{t('om.products')} ({items.length})</div>
        {items.length === 0 ? (
          <div className="cart-empty">{t('om.no.products')}</div>
        ) : (
          <div className="od-items">
            {items.map((i, idx) => (
              <div className="od-item" key={i.id != null ? i.id : idx}>
                {i.imagen_url ? <img src={sdUrl(i.imagen_url, 200)} alt="" onError={(e) => onImgFallback(e, i.imagen_url)} /> : <span className="od-thumb-empty" />}
                <div className="od-main">
                  <div className="od-title">
                    {i.titulo}
                    {i.variante_nombre ? <span className="cl-variant"> · {i.variante_nombre}</span> : null}
                  </div>
                  <div className="od-unit">{i.precio}</div>
                  <div className="om-qty-row">
                    <button type="button" className="btn btn-secondary btn-om-qs" onClick={() => changeQty(idx, -1)} disabled={Number(i.cantidad || 1) <= 1}>−</button>
                    <span className="om-qty">{i.cantidad}</span>
                    <button type="button" className="btn btn-secondary btn-om-qs" onClick={() => changeQty(idx, 1)}>+</button>
                    <button type="button" className="btn btn-ghost btn-sm om-remove" onClick={() => removeItem(idx)}>{t('om.remove')}</button>
                  </div>
                </div>
                <div className="od-sub">{subtotal(i)}</div>
              </div>
            ))}
          </div>
        )}

        {addable.length > 0 ? (
          <div className="om-add">
            <select className="select flex-1" value={addSel} onChange={(e) => setAddSel(e.target.value)}>
              <option value="">{t('om.select.product')}</option>
              {addable.map((p) => (
                <option key={p.id} value={p.id}>{p.titulo}</option>
              ))}
            </select>
            <button type="button" className="btn btn-secondary btn-sm" disabled={!addSel} onClick={addSelected}>{t('admin.add')}</button>
          </div>
        ) : null}

        <div className="total-big">{t('om.total')}: {dirty ? totalCalc : (order.total || totalCalc)}</div>

        <div className="divider my-2" style={{ color: 'var(--muted)' }}>{t('om.estado')}</div>

        <ul className="steps steps-horizontal text-xs w-full mt-3">
          {ESTADOS_ORDEN.map((e) => (
            <li key={e} className={`step${ESTADOS_ORDEN.indexOf(order.estado) >= ESTADOS_ORDEN.indexOf(e) ? ' step-primary' : ''}`}>
              {label(e)}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 mt-3">{estadoActions()}</div>

        {pendingAction ? (
          <div className="om-confirm">
            <p>{t('om.unsaved.title')}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => saveAndThen()} disabled={saving}>
                {t('om.unsaved.save')}
              </button>
              <button type="button" className="btn btn-error btn-sm" onClick={() => discardAndThen()} disabled={saving}>
                {t('om.unsaved.discard')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPendingAction(null)} disabled={saving}>
                {t('om.unsaved.cancel')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}