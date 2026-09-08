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

const EMPTY_GRUPO = { nombre: '', opciones: '' };

function comboKey(atributos) {
  return Object.entries(atributos || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join(';');
}

function parseGrupos(grupos) {
  return grupos
    .map((g) => ({
      nombre: (g.nombre || '').trim(),
      opciones: String(g.opciones || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }))
    .filter((g) => g.nombre && g.opciones.length);
}

// Todas las combinaciones de opciones (producto cartesiano)
function cartesian(gruposRaw) {
  const groups = parseGrupos(gruposRaw);
  if (!groups.length) return [];
  let combos = [{}];
  for (const g of groups) {
    const next = [];
    for (const combo of combos) {
      for (const op of g.opciones) next.push({ ...combo, [g.nombre]: op });
    }
    combos = next;
  }
  return combos.map((atributos) => ({
    atributos,
    nombre: Object.values(atributos).join(' · '),
    precio: '',
    stock: '',
    imagen: '',
  }));
}

function mergeWithDefaults(variantes, defaults) {
  const byKey = new Map(variantes.map((v) => [comboKey(v.atributos), v]));
  return defaults.map((d) => {
    const ex = byKey.get(comboKey(d.atributos));
    return ex
      ? { ...ex, atributos: d.atributos, nombre: d.nombre }
      : d;
  });
}

export default function ProductModal({ open, product, categorias, onClose, onShowAlert, onSaved }) {
  const { t } = useLang();
  const [form, setForm] = useState(EMPTY_FORM);
  const [imgs, setImgs] = useState(['']);
  const [grupos, setGrupos] = useState([{ ...EMPTY_GRUPO }]);
  const [variantes, setVariantes] = useState([]);
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
      const g = Array.isArray(product.atributos) && product.atributos.length
        ? product.atributos.map((ag) => ({ nombre: ag.nombre, opciones: (ag.opciones || []).join(', ') }))
        : [{ ...EMPTY_GRUPO }];
      setGrupos(g);
      setVariantes(
        (Array.isArray(product.variaciones) ? product.variaciones : []).map((v) => ({
          id: v.id,
          nombre: v.nombre,
          atributos: { ...(v.atributos || {}) },
          precio: v.precio || '',
          stock: v.stock != null ? v.stock : '',
          imagen: v.imagen || '',
        }))
      );
    } else {
      setForm(EMPTY_FORM);
      setImgs(['']);
      setGrupos([{ ...EMPTY_GRUPO }]);
      setVariantes([]);
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

  const setGrupo = (i) => (e) => {
    const n = [...grupos];
    n[i] = { ...n[i], [e.target.name]: e.target.value };
    setGrupos(n);
  };

  const addGrupo = () => setGrupos((prev) => [...prev, { ...EMPTY_GRUPO }]);

  const removeGrupo = (i) => setGrupos((prev) => prev.filter((_, j) => j !== i));

  const regenerate = () => {
    const defaults = cartesian(grupos);
    setVariantes(defaults.length ? mergeWithDefaults(variantes, defaults) : []);
  };

  const setVariante = (i) => (e) => {
    const n = [...variantes];
    n[i] = { ...n[i], [e.target.name]: e.target.value };
    setVariantes(n);
  };

  const uploadVarianteImg = async (i) => {
    setUploadingIdx(`v${i}`);
    try {
      const url = await uploadImage();
      if (url) {
        const n = [...variantes];
        n[i] = { ...n[i], imagen: url };
        setVariantes(n);
      }
    } catch (e) {
      onShowAlert(t('pm.alert.upload', { err: (e && e.message) || e }), 'error');
    } finally {
      setUploadingIdx(null);
    }
  };

  const removeVariante = (i) => setVariantes((prev) => prev.filter((_, j) => j !== i));

  const onSubmit = async (e) => {
    e.preventDefault();
    const id = product && product.id;
    const attrGroups = parseGrupos(grupos);
    const finalVariantes = variantes.map((v) => ({
      nombre: v.nombre || Object.values(v.atributos || {}).join(' · '),
      atributos: v.atributos || {},
      precio: v.precio ? String(v.precio).trim() : null,
      stock: v.stock !== '' && v.stock != null ? parseInt(v.stock, 10) : null,
      imagen: (v.imagen || '').trim() || null,
    }));
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
      atributos: JSON.stringify(attrGroups),
      variaciones: finalVariantes,
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

          <details className="vars-editor">
            <summary>{t('pm.vars.title')}</summary>
            <p className="vars-hint">{t('pm.vars.hint')}</p>
            {grupos.map((g, i) => (
              <div className="var-group-row" key={i}>
                <input
                  className="input rel-1"
                  name="nombre"
                  placeholder={t('pm.vars.group.name')}
                  value={g.nombre}
                  onChange={setGrupo(i)}
                />
                <input
                  className="input rel-2"
                  name="opciones"
                  placeholder={t('pm.vars.group.opts')}
                  value={g.opciones}
                  onChange={setGrupo(i)}
                />
                {grupos.length > 1 ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeGrupo(i)}>×</button>
                ) : null}
              </div>
            ))}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <button type="button" className="btn btn-secondary btn-sm" onClick={addGrupo}>{t('pm.vars.add.group')}</button>
              <button type="button" className="btn btn-accent btn-sm" onClick={regenerate}>{t('pm.vars.generate')}</button>
            </div>
            {variantes.length > 0 ? (
              <div className="vars-table">
                <div className="vars-table-head">
                  <span>{t('pm.vars.combo')}</span>
                  <span>{t('pm.price')}</span>
                  <span>{t('pm.stock')}</span>
                  <span>{t('pm.vars.image')}</span>
                  <span />
                </div>
                {variantes.map((v, i) => (
                  <div className="vars-table-row" key={comboKey(v.atributos)}>
                    <span className="vars-combo-name">{v.nombre}</span>
                    <input className="input rel-1" name="precio" placeholder="base" value={v.precio} onChange={setVariante(i)} />
                    <input className="input rel-1" name="stock" placeholder="base" value={v.stock} onChange={setVariante(i)} />
                    <div className="vars-img">
                      {v.imagen ? <img src={v.imagen} alt="" className="vars-img-thumb" /> : null}
                      <button type="button" className="btn btn-xs btn-ghost" disabled={uploadingIdx === `v${i}`} onClick={() => uploadVarianteImg(i)}>
                        {uploadingIdx === `v${i}` ? t('pm.uploading') : v.imagen ? t('pm.vars.change') : t('pm.vars.add.img')}
                      </button>
                      {v.imagen ? <button type="button" className="btn btn-xs btn-ghost text-error" onClick={() => setVariante(i)({ target: { name: 'imagen', value: '' } })}>×</button> : null}
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeVariante(i)}>×</button>
                  </div>
                ))}
              </div>
            ) : null}
          </details>

          <div className="field-check mb-5">
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
            <button type="submit" className="btn btn-accent">{t('pm.save')}</button>
          </div>
        </form>
      </div>
    </dialog>
  );
}