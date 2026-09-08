import React from 'react';
import { useLang } from '../lib/i18n';
import { stockOf } from '../lib/format';

export default function StockTag({ p }) {
  const { t } = useLang();
  const s = stockOf(p);
  if (s <= 0) return <span className="badge badge-error badge-outline gap-1 font-semibold">{t('stock.soldout')}</span>;
  if (s <= 5) return <span className="badge badge-warning badge-outline gap-1 font-semibold">{t('stock.left', { n: s })}</span>;
  return <span className="badge badge-success badge-outline gap-1 font-semibold">{t('stock.in', { n: s })}</span>;
}