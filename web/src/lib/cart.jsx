import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { priceNum } from './format';

const KEY = 'carrito_suplementos';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

function loadItems() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadItems);
  const [panelOpen, setPanelOpen] = useState(false);
  const [flights, setFlights] = useState([]);
  const flightId = useRef(0);

  const flyToCart = (x, y) => {
    setFlights((prev) => [...prev, { id: ++flightId.current, x, y }]);
  };

  const clearFlight = (id) => setFlights((prev) => prev.filter((f) => f.id !== id));

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      getItems: () => items.slice(),
      getCount: () => items.reduce((a, i) => a + i.cantidad, 0),
      getTotal: (catalog) =>
        items.reduce((sum, item) => {
          const p = catalog?.find((x) => x.id == item.id);
          const price = priceNum(p && p.precio);
          return sum + price * item.cantidad;
        }, 0),
      qtyOf: (id) => items.find((i) => i.id == id)?.cantidad || 0,
      add: (id, qty = 1, stock = null) =>
        setItems((prev) => {
          const ex = prev.find((i) => i.id == id);
          const max = stock != null ? stock : 99;
          const current = ex ? ex.cantidad : 0;
          const next = Math.min(Math.max(1, qty), Math.max(0, max - current));
          if (next <= 0) return prev;
          if (ex) return prev.map((i) => (i.id == id ? { ...i, cantidad: i.cantidad + next } : i));
          return [...prev, { id, cantidad: next }];
        }),
      remove: (id) => setItems((prev) => prev.filter((i) => i.id != id)),
      setQty: (id, qty, stock = null) =>
        setItems((prev) => {
          const max = stock != null ? stock : 99;
          return prev.map((i) => (i.id == id ? { ...i, cantidad: Math.min(Math.max(1, qty), max) } : i));
        }),
      clear: () => setItems([]),
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      flights,
      flyToCart,
      clearFlight,
    }),
    [items, panelOpen, flights]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}