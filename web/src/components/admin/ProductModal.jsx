import React, { useEffect, useRef, useState } from 'react';
import { api, uploadImage } from '../../lib/api';
import { useLang } from '../../lib/i18n';

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  titulo_es: '',
  descripcion_es: '',
  categoria_id: '',
  precio: '',
  ranking: '',
  rating: '',
  num_reviews: '',
  num_ofertas: '',
  stock: '',
  asin: '',
  url_producto: '',
};

export default function ProductModal({ open, product, categorias, onClose, onShowAlert, onSaved }) {
  const { t } = useLang();
  const [form, setForm] = useState(EMPTY_FORM);
  const [imgs, setImgs] = useState(['']);
  const [uploadingIdx, setUploadingIdx] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
    else if (!open && dialogRef.current && dialogRef.current.open) dialogRef.current.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (product) {
      const imgs = [];
      if (product.imagen_url) imgs.push(product.imagen_url);
      if (product.imagenes_extra) {
        String(product.imagenes_extra)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((u) => imgs.push(u));
      }
      setImgs(imgs.length ? imgs : ['']);
      setForm({
        titulo: product.titulo || '',
        descripcion: product.descripcion || '',
        titulo_es: product.titulo_es || '',
        descripcion_es: product.descripcion_es || '',
        categoria_id: product.categoria_id ?? '',
        precio: product.precio || '',
        ranking: product.ranking || '',
        rating: product.rating || '',
        num_reviews: product.num_reviews || '',
        num_ofertas: product.num_ofertas || '',
        stock: product.stock != null ? product.stock : '',
        asin: product.asin || '',
        url_producto: product.url_producto || '',
      });
    } else {
      setForm(EMPTY_FORM);
      setImgs(['']);
    }
  }, [open, product]);

  if (!open) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setImg = (i) => (e) => {
    const n = [...imgs];
    n[i] = e.target.value;
    setImgs(n);
  };

  const onUpload = async (i) => {
    setUploadingIdx(i);
    try {
      const url = await uploadImage();
      if (url) {
        const n = [...imgs];
        n[i] = url;
        setImgs(n);
      }
    } catch (e) {
      onShowAlert(t('pm.alert.upload', { err: (e && e.message) || e }), 'error');
    } finally {
      setUploadingIdx(null);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const id = product && product.id;
    const data = {
      titulo: form.titulo || form.titulo_es,
      descripcion: form.descripcion || form.descripcion_es,
      titulo_es: form.titulo_es,
      descripcion_es: form.descripcion_es,
      categoria_id: form.categoria_id || null,
      precio: form.precio,
      ranking: form.ranking,
      rating: form.rating,
      num_reviews: form.num_reviews,
      num_ofertas: form.num_ofertas,
      stock: parseInt(form.stock, 10),
      asin: form.asin,
      url_producto: form.url_producto,
      imagen_url: (imgs[0] || '').trim(),
      imagenes_extra: imgs.slice(1).map((s) => s.trim()).filter(Boolean).join(',') || null,
    };

    let res;
    try {
      res = id ? await api.update(id, data) : await api.create(data);
    } catch (e) {
      onShowAlert(t('pm.net.error', { err: (e && e.message) || e }), 'error');
      return;
    }
    if (res.ok) {
      onShowAlert(t('pm.saved'), 'success');
      onClose();
      onSaved();
    } else {
      onShowAlert(res.error || t('admin.alert.error'), 'error');
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-box modal-card">
        <h2>{product ? t('pm.edit') : t('pm.new')}</h2>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label>{t('pm.titulo')}</label>
            <input className="input w-full" required value={form.titulo_es} onChange={set('titulo_es')} />
          </div>
          <div className="field">
            <label>{t('pm.desc')}</label>
            <textarea className="textarea w-full" value={form.descripcion_es} onChange={set('descripcion_es')} />
          </div>
          <div className="field">
            <label>{t('pm.cat')}</label>
            <select className="select w-full" value={form.categoria_id} onChange={set('categoria_id')}>
              <option value="">{t('pm.no.cat')}</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t('pm.price')}</label>
            <input className="input w-full" placeholder="$24.00" value={form.precio} onChange={set('precio')} />
          </div>
          <div className="field">
            <label>{t('pm.ranking')}</label>
            <input className="input w-full" placeholder="#1" value={form.ranking} onChange={set('ranking')} />
          </div>
          <div className="field">
            <label>{t('pm.rating')}</label>
            <input className="input w-full" placeholder="4.6 out of 5 stars" value={form.rating} onChange={set('rating')} />
          </div>
          <div className="field">
            <label>{t('pm.reviews')}</label>
            <input className="input w-full" placeholder="6,435" value={form.num_reviews} onChange={set('num_reviews')} />
          </div>
          <div className="field">
            <label>{t('pm.offers')}</label>
            <input className="input w-full" placeholder="2" value={form.num_ofertas} onChange={set('num_ofertas')} />
          </div>
          <div className="field">
            <label>{t('pm.stock')}</label>
            <input type="number" min="0" className="input w-full" placeholder="10" value={form.stock} onChange={set('stock')} />
          </div>
          <div className="field">
            <label>{t('pm.asin')}</label>
            <input className="input w-full" placeholder="B07SH31T9V" value={form.asin} onChange={set('asin')} />
          </div>
          <div className="field">
            <label>{t('pm.url')}</label>
            <input className="input w-full" value={form.url_producto} onChange={set('url_producto')} />
          </div>
          <div className="field">
            <label>{t('pm.images')}</label>
            <div className="img-inputs">
              {imgs.map((u, i) => (
                <div className="img-input-row" key={i}>
                  <input
                    className="img-link"
                    value={u}
                    placeholder="https://..."
                    onChange={setImg(i)}
                  />
                  <button
                    type="button"
                    className="img-upload"
                    disabled={uploadingIdx === i}
                    onClick={() => onUpload(i)}
                  >
                    {uploadingIdx === i ? t('pm.uploading') : t('pm.upload')}
                  </button>
                  {imgs.length > 1 ? (
                    <button
                      type="button"
                      className="img-remove"
                      onClick={() => setImgs(imgs.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setImgs([...imgs, ''])}>
              {t('pm.add.img')}
            </button>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>{t('pm.cancel')}</button>
            <button type="submit" className="btn btn-secondary">{t('pm.save')}</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}