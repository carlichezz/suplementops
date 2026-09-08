import React, { useState } from 'react';
import { api, uploadImage } from '../../lib/api';
import { useLang } from '../../lib/i18n';

function comboKey(atributos) {
  return Object.entries(atributos || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join(';');
}

function parseGrupos(raw) {
  return raw
    .map((g) => ({
      nombre: (g.nombre || '').trim(),
      opciones: String(g.opciones || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }))
    .filter((g) => g.nombre && g.opciones.length);
}

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
    return ex ? { ...ex, atributos: d.atributos, nombre: d.nombre } : d;
  });
}

const EMPTY_GRUPO = { nombre: '', opciones: '' };

export default function VariantManager({ product, onDone, showAlert }) {
  const { t } = useLang();
  const [grupos, setGrupos] = useState(() => {
    const existing = Array.isArray(product.variaciones) && product.variaciones.length
      ? (() => {
          const g = new Map();
          for (const v of product.variaciones) {
            const a = v.atributos || {};
            for (const k of Object.keys(a)) {
              const val = String(a[k] ?? '').trim();
              if (!val) continue;
              if (!g.has(k)) g.set(k, []);
              const arr = g.get(k);
              if (!arr.includes(val)) arr.push(val);
            }
          }
          return [...g.entries()].map(([nombre, opciones]) => ({ nombre, opciones: opciones.join(', ') }));
        })()
      : [{ ...EMPTY_GRUPO }];
    return existing.length ? existing : [{ ...EMPTY_GRUPO }];
  });

  const [variantes, setVariantes] = useState(() =>
    (Array.isArray(product.variaciones) ? product.variaciones : []).map((v) => ({
      id: v.id,
      nombre: v.nombre,
      atributos: { ...(v.atributos || {}) },
      precio: v.precio || '',
      stock: v.stock != null ? v.stock : '',
      imagen: v.imagen || '',
    }))
  );
  const [gruposDirty, setGruposDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);

  const setGrupo = (i) => (e) => {
    setGruposDirty(true);
    const n = [...grupos];
    n[i] = { ...n[i], [e.target.name]: e.target.value };
    setGrupos(n);
  };

  const addGrupo = () => {
    setGruposDirty(true);
    setGrupos((prev) => [...prev, { ...EMPTY_GRUPO }]);
  };

  const removeGrupo = (i) => {
    setGruposDirty(true);
    setGrupos((prev) => prev.filter((_, j) => j !== i));
  };

  const regenerate = () => {
    const defaults = cartesian(grupos);
    setVariantes(defaults.length ? mergeWithDefaults(variantes, defaults) : []);
  };

  const setVariante = (i) => (e) => {
    const n = [...variantes];
    n[i] = { ...n[i], [e.target.name]: e.target.value };
    setVariantes(n);
  };

  const removeVariante = (i) => setVariantes((prev) => prev.filter((_, j) => j !== i));

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
      showAlert(t('pm.alert.upload', { err: (e && e.message) || e }), 'error');
    } finally {
      setUploadingIdx(null);
    }
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const attrGroups = parseGrupos(grupos);
      const finalVariantes = variantes.map((v) => ({
        nombre: v.nombre || Object.values(v.atributos || {}).join(' · '),
        atributos: v.atributos || {},
        precio: v.precio ? String(v.precio).trim() : null,
        stock: v.stock !== '' && v.stock != null ? parseInt(v.stock, 10) : null,
        imagen: (v.imagen || '').trim() || null,
      }));
      const res = await api.variaciones.save(product.id, attrGroups, finalVariantes);
      if (res && res.ok) {
        showAlert(t('vm.saved'), 'success');
        if (onDone) onDone();
      } else {
        showAlert((res && res.error) || t('admin.alert.error'), 'error');
      }
    } catch (err) {
      showAlert(t('admin.net.error', { err: (err && err.message) || err }), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="vars-editor" onSubmit={onSave}>
      <div className="cat-list mb-3">
        <div
          className="cat-row"
          style={{ border: 0, padding: '12px 0' }}
        >
          <div>
            <div className="cat-name">{product.titulo}</div>
            <div className="cat-count">
              {variantes.length} {variantes.length === 1 ? t('vm.variant') : t('vm.variants')}
            </div>
          </div>
        </div>
      </div>

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
      <div className="flex items-center gap-2 flex-wrap mt-2 mb-3">
        <button type="button" className="btn btn-secondary btn-sm" onClick={addGrupo}>{t('pm.vars.add.group')}</button>
        <button type="button" className="btn btn-accent btn-sm" onClick={regenerate}>{t('pm.vars.generate')}</button>
        {gruposDirty && variantes.length > 0 ? (
          <span className="vm-hint-dirty">{t('vm.regenerate.hint')}</span>
        ) : null}
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
              <input className="input rel-1" name="precio" placeholder={t('vm.base')} value={v.precio} onChange={setVariante(i)} />
              <input className="input rel-1" name="stock" placeholder={t('vm.base')} value={v.stock} onChange={setVariante(i)} />
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
      ) : (
        <div className="vm-empty">{t('vm.no.variants')}</div>
      )}

      <div className="flex items-center gap-2 mt-3">
        <button type="submit" className="btn btn-accent" disabled={saving}>
          {saving ? t('vm.saving') : t('vm.save')}
        </button>
      </div>
    </form>
  );
}