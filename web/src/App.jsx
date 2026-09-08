import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './lib/i18n';
import { CartProvider } from './lib/cart';
import ErrorBoundary from './components/ErrorBoundary';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CheckoutPage from './pages/CheckoutPage';

const AdminPage = lazy(() => import('./pages/AdminPage'));

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <CartProvider>
          <ErrorBoundary>
            <Suspense
            fallback={
              <div className="page flex items-center justify-center" style={{ minHeight: '60vh' }}>
                <span className="loading loading-spinner loading-lg text-accent"></span>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<CatalogPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </CartProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
