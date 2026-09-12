import { createRoot } from 'react-dom/client';
import '../css/main.css';
import App from '../App';

createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
