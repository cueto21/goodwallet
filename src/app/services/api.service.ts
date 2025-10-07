// Update API_BASE to use HTTPS for the backend
export const API_BASE = (window as any)?.API_BASE || 'https://backwallet.jorgemauricio.site';

let accessToken: string | null = localStorage.getItem('access_token');
let isRefreshing = false;

async function rawRequest(path: string, opts: RequestInit = {}) {
  const url = API_BASE + path;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any || {}) };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(url, { ...opts, headers, credentials: 'include' });
  return res;
}

async function request(path: string, opts: RequestInit = {}) {
  let res = await rawRequest(path, opts);
  if (res.status === 401) {
    // try refreshing once
    try {
      if (!isRefreshing) {
        isRefreshing = true;
        const r = await fetch(API_BASE + '/auth/refresh', { method: 'POST', credentials: 'include' });
        isRefreshing = false;
        if (r.ok) {
          const body = await r.json();
          accessToken = body.access_token;
          if (accessToken) {
            localStorage.setItem('access_token', accessToken);
          }
        } else {
          accessToken = null;
          localStorage.removeItem('access_token');
        }
      }
    } catch (e) {
      isRefreshing = false;
      accessToken = null;
    }
    // retry once
    res = await rawRequest(path, opts);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export const ApiService = {
  setAccessToken: (t: string | null) => { 
    accessToken = t; 
    if (t) {
      localStorage.setItem('access_token', t);
    } else {
      localStorage.removeItem('access_token');
    }
  },
  getAccessToken: () => accessToken,
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body?: any) => request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string) => request(path, { method: 'DELETE' })
};
