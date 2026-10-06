/*
 * Limit OpenFL asset requests so HTTP/2 flow-control errors do not abort the
 * preload with an uncaught haxe.ValueException. Failed requests are retried
 * with backoff; non-asset requests are left untouched.
 */
// Mobile browsers can terminate the tab when too many decoded assets are
// requested at once. Keep the queue deliberately small and avoid long retry
// storms that make the loading screen appear stuck.
const MAX_CONCURRENT = 3;
const MAX_RETRIES = 2;
let active = 0;
const pending = [];

function isGameAsset(url) {
  return url.pathname.includes('/assets/') ||
    url.pathname.includes('/flixel/') ||
    url.pathname.includes('/flxanimate/');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadAsset(request) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(request, { cache: 'default' });
      if (response.ok || response.status === 304) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < MAX_RETRIES) await wait(250 * Math.pow(2, attempt));
  }
  throw lastError || new Error('Asset request failed');
}

function pump() {
  while (active < MAX_CONCURRENT && pending.length) {
    const job = pending.shift();
    active++;
    loadAsset(job.request)
      .then(job.resolve, job.reject)
      .finally(() => { active--; pump(); });
  }
}

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || !isGameAsset(url)) return;
  event.respondWith(new Promise((resolve, reject) => {
    pending.push({ request: event.request, resolve, reject });
    pump();
  }));
});
