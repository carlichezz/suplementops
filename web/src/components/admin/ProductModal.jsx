import React, { useEffect, useRef, useState } from 'react';
import { api, uploadImage } from '../../lib/api';
import { useLang } from '../../lib/i18n';

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  categoria_id: '',
  precio: '',
  stock: '',
  publicado: 1,
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
        categoria_id: product.categoria_id ?? '',
        precio: product.precio || '',
        stock: product.stock != null ? product.stock : '',
        publicado: product.publicado == null ? 1 : Number(product.publicado),
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
      titulo: form.titulo,
      descripcion: form.descripcion,
      titulo_es: form.titulo,
      descripcion_es: form.descripcion,
      categoria_id: form.categoria_id || null,
      precio: form.precio,
      stock: parseInt(form.stock, 10),
      publicado: form.publicado === 1 ? 1 : 0,
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
          <div className="field-float">
            <input className="input w-full" required placeholder=" " value={form.titulo} onChange={set('titulo')} />
            <label>{t('pm.titulo')}</label>
          </div>
          <div className="field-float">
            <textarea className="textarea w-full" placeholder=" " value={form.descripcion} onChange={set('descripcion')} />
            <label>{t('pm.desc')}</label>
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
          <div className="field-float">
            <input className="input w-full" placeholder=" " value={form.precio} onChange={set('precio')} />
            <label>{t('pm.price')}</label>
          </div>
          <div className="field-float">
            <input type="number" min="0" className="input w-full" placeholder=" " value={form.stock} onChange={set('stock')} />
            <label>{t('pm.stock')}</label>
          </div>
          <div className="field-check">
            <label className="check-row">
              <input type="checkbox" checked={form.publicado === 1} onChange={(e) => setForm((f) => ({ ...f, publicado: e.target.checked ? 1 : 0 }))} />
              <span>{t('pm.publicado')}</span>
            </label>
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