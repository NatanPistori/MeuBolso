'use strict';
const API_URL = '/api';

const API = {
  async get(path) {
    const r = await fetch(API_URL + path);
    if (!r.ok) { const t = await r.text(); throw new Error(t); }
    return r.json();
  },
  async post(path, body) {
    const r = await fetch(API_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) { const t = await r.text(); throw new Error(t); }
    return r.json();
  },
  async put(path, body) {
    const r = await fetch(API_URL + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) { const t = await r.text(); throw new Error(t); }
    return r.json();
  },
  async patch(path, body) {
    const r = await fetch(API_URL + path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) { const t = await r.text(); throw new Error(t); }
    return r.json();
  },
  async del(path) {
    const r = await fetch(API_URL + path, { method: 'DELETE' });
    if (!r.ok) { const t = await r.text(); throw new Error(t); }
    return r.json();
  },
};

