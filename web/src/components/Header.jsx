import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n';

export default function Header({ showSearch = false, searchValue = '', onSearchChange, admin = false, onLogout }) {
  const { t } = useLang();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'suplementops-dark' : 'suplementops';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <header className={`app-header${admin ? ' admin-header' : ''}`}>
      <nav className="flex items-center gap-2 max-w-[1200px] mx-auto px-4 min-h-[58px]">
        <Link to="/" className="brand select-none cursor-pointer no-underline shrink-0">
          <span className="sm:inline">Suplemen<strong>TOPS</strong></span>
          {admin ? <span className="brand-admin">admin</span> : null}
        </Link>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {showSearch ? (
            <input
              type="text"
              className="input h-9 min-h-9 w-24 md:w-48 hidden md:inline-flex bg-white/10 border-white/25! text-white placeholder:text-white/50 text-sm"
              placeholder={t('search.ph')}
              value={searchValue}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            />
          ) : null}

          <div className="flex items-center gap-1 shrink-0">
                    {admin && onLogout ? (
          <button type="button" className="btn btn-ghost btn-sm text-white/90 flex items-center gap-1.5" onClick={onLogout}>
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v5h-2V4H4v16h10v-5h2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10z" />
            </svg>
            <span className="hidden sm:inline">{t('admin.logout')}</span>
          </button>
        ) : null}
            <label className="swap swap-rotate btn btn-ghost btn-circle text-white" aria-label={t('cart.theme')}>
              <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
              <svg className="swap-off h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
              </svg>
              <svg className="swap-on h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
              </svg>
            </label>
          </div>
        </div>
      </nav>
    </header>
  );
}