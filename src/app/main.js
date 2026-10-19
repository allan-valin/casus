import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

// the bookmarklet sends text to the tab named casus (src/app/lib/bookmarklet.js)
try { window.name = 'casus'; } catch { /* sandboxed */ }

mount(App, { target: document.getElementById('app') });

// the service worker serves downloaded dictionaries offline (public/sw.js); the published site only
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}
