import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { priceNum, variantPrice, variantStock, lineKey } from './format';

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

function mergeLine(list, item) {
  const k = lineKey(item.id, item.variante_id);
  const idx = list.findIndex((i) => lineKey(i.id, i.variante_id) === k);
  if (idx >= 0) {
    const copy = list.slice();
    copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + item.cantidad };
    return copy;
  }
  return [...list, item];
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
          const price = priceNum(variantPrice(p, item.variante_id));
          return sum + price * item.cantidad;
        }, 0),
      qtyOf: (id, varianteId) =>
        items.find((i) => lineKey(i.id, i.variante_id) === lineKey(id, varianteId))?.cantidad || 0,
      add: (id, qty = 1, stock = null, varianteId = null) =>
        setItems((prev) => {
          const k = lineKey(id, varianteId);
          const ex = prev.find((i) => lineKey(i.id, i.variante_id) === k);
          const max = stock != null ? stock : 99;
          const current = ex ? ex.cantidad : 0;
          const next = Math.min(Math.max(1, qty), Math.max(0, max - current));
          if (next <= 0) return prev;
          if (ex) return mergeLine(prev, { id, variante_id: varianteId ? Number(varianteId) : null, cantidad: next });
          return [...prev, { id: Number(id), variante_id: varianteId ? Number(varianteId) : null, cantidad: next }];
        }),
      remove: (id, varianteId) => setItems((prev) => prev.filter((i) => lineKey(i.id, i.variante_id) !== lineKey(id, varianteId))),
      setQty: (id, qty, stock = null, varianteId = null) =>
        setItems((prev) => {
          const k = lineKey(id, varianteId);
          const max = stock != null ? stock : 99;
          return prev.map((i) =>
            lineKey(i.id, i.variante_id) === k ? { ...i, cantidad: Math.min(Math.max(1, qty), max) } : i
          );
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