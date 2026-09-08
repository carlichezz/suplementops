import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckIcon, PinIcon, CheckMiniIcon } from '../components/Icons';
import { api, getLocation } from '../lib/api';
import { useCart } from '../lib/cart';
import { useLang } from '../lib/i18n';
import { money, priceNum, variantPrice, variantOf } from '../lib/format';

const DATOS_KEY = 'checkout_datos';

function loadDatos() {
  try {
    return JSON.parse(localStorage.getItem(DATOS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDatos(form) {
  localStorage.setItem(
    DATOS_KEY,
    JSON.stringify({
      nombre: (form.nombre || '').trim(),
      direccion: (form.direccion || '').trim(),
      telefono: (form.telefono || '').trim(),
      telefono_alt: (form.telefono_alt || '').trim(),
      nota: (form.nota || '').trim(),
    })
  );
}

function Toast({ state }) {
  if (!state) return null;
  return <div className={`toast ${state.type} show`}>{state.msg}</div>;
}

function Stepper({ t, done }) {
  const upTo = (n) => (done ? true : n <= 2);
  return (
    <div className="flex justify-center w-full mb-6">
      <ul className="steps steps-horizontal text-xs">
        <li className={'step' + (upTo(1) ? ' step-secondary' : '')}>{t('co.step.cart')}</li>
        <li className={'step' + (upTo(2) ? ' step-secondary' : '')}>{t('co.step.data')}</li>
        <li className={'step' + (done ? ' step-secondary' : '')}>{t('co.step.confirm')}</li>
      </ul>
    </div>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, getTotal, clear } = useCart();
  const { t, tr, lang } = useLang();
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState(loadDatos);
  const [ubicacion, setUbicacion] = useState(null);
  const [locStatus, setLocStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [toast, setToast] = useState(null);
  const total = getTotal(catalog);

  useEffect(() => {
    api
      .list()
      .then((d) => setCatalog(d))
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    document.title = t('page.title.checkout');
  }, [lang]);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onLocation = async () => {
    setLocStatus('');
    try {
      const pos = await getLocation();
      setUbicacion(pos);
      setLocStatus('ok');
    } catch {
      setUbicacion(null);
      setLocStatus('err');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const nombre = (form.nombre || '').trim();
    const direccion = (form.direccion || '').trim();
    const telefono = (form.telefono || '').trim();

    if (!nombre || !direccion || !telefono) {
      showToast(t('co.err.required'), 'error');
      return;
    }
    if (items.length === 0) {
      showToast(t('co.err.empty'), 'error');
      return;
    }

    saveDatos(form);

    const productos = items
      .map((item) => {
        const p = catalog.find((x) => x.id == item.id);
        if (!p) return null;
        const v = variantOf(p, item.variante_id);
        return {
          id: p.id,
          titulo: tr(p).titulo,
          precio: variantPrice(p, item.variante_id),
          cantidad: item.cantidad,
          imagen_url: p.imagen_url,
          variante_id: item.variante_id || null,
          variante_nombre: v ? v.nombre : null,
        };
      })
      .filter(Boolean);

    setSubmitting(true);
    try {
      const res = await api.ordenes.create({
        nombre,
        direccion,
        lat: ubicacion ? ubicacion.lat : null,
        lon: ubicacion ? ubicacion.lon : null,
        telefono,
        telefono_alt: (form.telefono_alt || '').trim(),
        nota: (form.nota || '').trim(),
        productos,
        total: money(getTotal(catalog)),
      });

      if (res && res.ok) {
        clear();
        setDone({ id: res.id, telefono });
      } else {
        showToast((res && res.error) || t('co.err.conn'), 'error');
        setSubmitting(false);
      }
    } catch (err) {
      showToast(t('co.err.conn'), 'error');
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="page flex-1">
        <h1 className="page-title text-2xl font-bold text-center mt-5 mb-2">{t('co.title')}</h1>

        <div className={`checkout-wrap${done ? ' checkout-wrap-full' : ''}`}>
          <div className="checkout-card">
            <Stepper t={t} done={!!done} />
            {done ? (
              <div className="aura aura-rainbow">
                <div className="card bg-base-100">
                  <div className="card-body items-center text-center">
                    <div style={{ fontSize: '3rem', display: 'flex', justifyContent: 'center' }}>
                      <CheckIcon />
                    </div>
                    <h2 style={{ margin: '10px 0' }}>{t('co.created', { id: done.id })}</h2>
                    <p style={{ color: 'var(--muted)' }}>{t('co.contact', { tel: done.telefono })}</p>
                    <div style={{ marginTop: '20px' }}>
                      <button className="btn btn-secondary" onClick={() => navigate('/')}>{t('co.back.catalog')}</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2>{t('co.summary')}</h2>
                <div className="checkout-summary">
                  {items.length === 0 ? (
                    <div className="cart-empty">{t('co.empty')}</div>
                  ) : (
                    items.map((item) => {
                      const p = catalog.find((x) => x.id == item.id);
                      if (!p) return null;
                      const v = variantOf(p, item.variante_id);
                      const price = parseFloat(String(variantPrice(p, item.variante_id) || '').replace(/[^0-9.]/g, ''));
                      const subtotal = isNaN(price) ? 0 : price * item.cantidad;
                      return (
                        <div className="checkout-line" key={`${item.id}:${item.variante_id || ''}`}>
                          <span className="cl-name">{tr(p).titulo} × {item.cantidad}{v && v.nombre ? <span className="cl-variant"> · {v.nombre}</span> : null}</span>
                          <span>{money(subtotal)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="total-big">{total ? money(total) : ''}</div>

                <div className="divider my-4"></div>

                <form onSubmit={onSubmit} noValidate>
                  <div className="field-float">
                    <input className="input w-full" required autoComplete="name" placeholder=" " value={form.nombre || ''} onChange={set('nombre')} />
                    <label>{t('co.name')}</label>
                  </div>

                  <div className="field-float">
                    <textarea className="textarea w-full" required placeholder=" " value={form.direccion || ''} onChange={set('direccion')} />
                    <label>{t('co.address')}</label>
                  </div>

                  <div className="field">
                    <label>{t('co.location')}</label>
                    <button type="button" className="btn btn-secondary btn-sm location-btn" onClick={onLocation}>
                      <PinIcon /> {locStatus === 'ok' ? t('co.loc.shared') : t('co.loc.send')}
                    </button>
                    <div className={`loc-info${locStatus ? ` ${locStatus}` : ''}`}>
                      {locStatus === 'ok' && ubicacion ? (
                        <>
                          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                            <CheckMiniIcon />
                            {t('co.loc.ok', { coords: `${ubicacion.lat.toFixed(5)}, ${ubicacion.lon.toFixed(5)}` })}
                          </span>
                          {' · '}
                          <a
                            href={`https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lon}`}
                            target="_blank"
                            rel="noopener"
                          >
                            {t('co.loc.map')}
                          </a>
                        </>
                      ) : locStatus === 'err' ? (
                        t('co.loc.err')
                      ) : null}
                    </div>
                  </div>

                  <div className="field-float">
                    <input className="input w-full" type="tel" required autoComplete="tel" placeholder=" " value={form.telefono || ''} onChange={set('telefono')} />
                    <label>{t('co.phone')}</label>
                  </div>

                  <div className="field-float">
                    <input className="input w-full" type="tel" autoComplete="tel" placeholder=" " value={form.telefono_alt || ''} onChange={set('telefono_alt')} />
                    <label>{t('co.phone_alt')}</label>
                  </div>

                  <div className="field-float">
                    <textarea className="textarea w-full" placeholder=" " value={form.nota || ''} onChange={set('nota')} />
                    <label>{t('co.nota')}</label>
                  </div>

                  <p className="required-note">{t('co.required')}</p>

                  <div className="modal-actions">
                    <Link to="/" className="btn btn-ghost">{t('co.continue')}</Link>
                    <button type="submit" className="btn btn-accent" disabled={submitting}>
                      {submitting ? t('co.sending') : t('co.submit')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
      <Toast state={toast} />
    </>
  );
}