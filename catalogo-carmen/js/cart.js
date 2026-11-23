import { CONFIG } from './config.js';

const MAX_QTY = 99;
const listeners = new Set();
let items = load();

function load() {
  try {
    const raw = localStorage.getItem(CONFIG.cartKey);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('invalid');
    const seen = new Set();
    return data.map((i) => {
      if (!i || typeof i.id !== 'string' || !Number.isInteger(i.qty) || i.qty < 1 || seen.has(i.id)) throw new Error('invalid');
      seen.add(i.id);
      return { id: i.id, qty: Math.min(i.qty, MAX_QTY) };
    });
  } catch {
    try { localStorage.removeItem(CONFIG.cartKey); } catch { /* storage indisponível */ }
    return [];
  }
}

function commit() {
  try { localStorage.setItem(CONFIG.cartKey, JSON.stringify(items)); } catch { /* segue sem persistir */ }
  listeners.forEach((fn) => fn());
}

export const subscribe = (fn) => { listeners.add(fn); };
export const count = () => items.reduce((n, i) => n + i.qty, 0);

export function add(id, qty = 1) {
  const it = items.find((i) => i.id === id);
  if (it) it.qty = Math.min(it.qty + qty, MAX_QTY);
  else items.push({ id, qty: Math.min(qty, MAX_QTY) });
  commit();
}

export function setQty(id, qty) {
  const it = items.find((i) => i.id === id);
  if (!it || !Number.isInteger(qty)) return;
  it.qty = Math.max(1, Math.min(qty, MAX_QTY));
  commit();
}

export function remove(id) {
  items = items.filter((i) => i.id !== id);
  commit();
}

// Cruza o carrinho com o catálogo atual: itens válidos e ids que não estão mais disponíveis.
export function lines(products) {
  const map = new Map(products.map((p) => [p.id, p]));
  const valid = [];
  const invalid = [];
  for (const i of items) {
    const p = map.get(i.id);
    if (p) valid.push({ product: p, qty: i.qty, subtotal: Math.round(p.price * i.qty * 100) / 100 });
    else invalid.push(i.id);
  }
  const total = Math.round(valid.reduce((s, l) => s + l.subtotal, 0) * 100) / 100;
  return { valid, invalid, total };
}
