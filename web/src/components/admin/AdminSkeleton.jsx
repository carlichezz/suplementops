import React from 'react';

const ROWS = [0, 1, 2, 3, 4];

export function AdminListSkeleton({ variant = 'productos', rows = 5 }) {
  const n = Math.max(1, Math.min(8, rows));
  return (
    <div className={variant === 'productos' ? 'grid admin-grid' : 'cat-list'} aria-hidden="true">
      {ROWS.slice(0, n).map((i) =>
        variant === 'productos' ? (
          <div className="admin-list-item" key={i}>
            <div className="admin-list-thumb">
              <div className="skeleton w-full h-full rounded-lg" />
            </div>
            <div className="admin-list-info">
              <div className="skeleton h-4 w-3/4 rounded mb-2" />
              <div className="admin-list-meta">
                <div className="skeleton h-4 w-16 rounded" />
                <div className="skeleton h-4 w-14 rounded" />
                <div className="skeleton h-5 w-12 rounded" />
              </div>
            </div>
            <div className="admin-list-actions">
              <div className="skeleton h-8 w-14 rounded" />
              <div className="skeleton h-8 w-14 rounded" />
            </div>
          </div>
        ) : variant === 'categorias' || variant === 'notificaciones' ? (
          <div className="cat-row" key={i}>
            <div>
              <div className="skeleton h-5 w-48 rounded mb-2" />
              <div className="skeleton h-4 w-28 rounded" />
            </div>
            <div className="cat-actions">
              <div className="skeleton h-8 w-14 rounded" />
              <div className="skeleton h-8 w-14 rounded" />
            </div>
          </div>
        ) : (
          <div className="order-card" key={i}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="skeleton h-5 w-40 rounded" />
                  <div className="skeleton h-5 w-16 rounded" />
                </div>
                <div className="skeleton h-4 w-56 rounded mt-2" />
              </div>
              <div className="shrink-0">
                <div className="skeleton h-5 w-20 rounded" />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}