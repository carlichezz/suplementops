import React from 'react';
import { useLang } from '../lib/i18n';

const SORTS = [
  { key: 'ranking', i18n: 'sort.ranking' },
  { key: 'price-asc', i18n: 'sort.price-asc' },
  { key: 'price-desc', i18n: 'sort.price-desc' },
  { key: 'name', i18n: 'sort.name' },
  { key: 'rating', i18n: 'sort.rating' },
];

export default function SortMenu({ currentSort, onChange }) {
  const { t } = useLang();
  return (
    <select
      className="select select-sm shrink-0 min-w-[7rem] w-auto"
      value={currentSort}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t('sort.title')}
    >
      {SORTS.map((s) => (
        <option key={s.key} value={s.key}>{t(s.i18n)}</option>
      ))}
    </select>
  );
}