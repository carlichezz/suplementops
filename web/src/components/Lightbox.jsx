import React, { useEffect, useRef, useState } from 'react';
import { onImgFallback } from '../lib/imageUrl';

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const MAX = 8;

export default function Lightbox({ images, index, onClose, onNavigate }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const go = (d) => onNavigate((index + d + images.length) % images.length);

  const zoomAt = (factor) => setScale((s) => clamp(s * factor, 1, MAX));

  const onWheel = (e) => {
    e.preventDefault();
    zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2);
  };

  const onPointerDown = (e) => {
    if (scale <= 1) return;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    setPos({
      x: drag.current.ox + (e.clientX - drag.current.sx),
      y: drag.current.oy + (e.clientY - drag.current.sy),
    });
  };
  const onPointerUp = (e) => {
    if (drag.current && drag.current.id === e.pointerId) drag.current = null;
  };

  const onImgClick = (e) => {
    e.stopPropagation();
    if (drag.current) return;
    const box = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    setPos((p) => ({ x: p.x - dx * 0.25, y: p.y - dy * 0.25 }));
    setScale((s) => (s > 1 ? 1 : 2.5));
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center select-none"
      onClick={onClose}
      onWheel={onWheel}
    >
      <button
        type="button"
        aria-label="Cerrar"
        className="btn btn-ghost btn-circle text-white absolute top-3 right-3 z-30"
        onClick={onClose}
      >
        ✕
      </button>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Anterior"
            className="btn btn-ghost btn-circle text-white absolute left-3 z-30 top-1/2 -translate-y-1/2"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            className="btn btn-ghost btn-circle text-white absolute right-3 z-30 top-1/2 -translate-y-1/2"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
          >
            ›
          </button>
        </>
      ) : null}

      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Acercar"
          className="btn btn-ghost btn-circle btn-sm text-white"
          onClick={(e) => {
            e.stopPropagation();
            zoomAt(1.4);
          }}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Alejar"
          className="btn btn-ghost btn-circle btn-sm text-white"
          onClick={(e) => {
            e.stopPropagation();
            zoomAt(1 / 1.4);
          }}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Restablecer zoom"
          className="btn btn-ghost btn-sm text-white"
          onClick={(e) => {
            e.stopPropagation();
            setScale(1);
            setPos({ x: 0, y: 0 });
          }}
        >
          1:1
        </button>
      </div>

      <img
        src={images[index]}
        alt=""
        draggable={false}
        className="max-w-[92vw] max-h-[88vh] object-contain transition-transform duration-200 will-change-transform"
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
          cursor: scale > 1 ? 'grab' : 'zoom-in',
        }}
        onClick={onImgClick}
        onDoubleClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onError={(e) => onImgFallback(e, images[index])}
      />
    </div>
  );
}