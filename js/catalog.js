import { CONFIG } from './config.js';

export const CATEGORIES = { avon: 'Avon', natura: 'Natura', roupas: 'Roupas' };

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatPrice = (n) => money.format(n);

const isText = (v) => typeof v === 'string' && v.trim() !== '';

export function normalizeProduct(r) {
  if (!r || typeof r !== 'object') return null;
  const { id, name, brand, category, description, price, image, available, featured } = r;
  if (![id, name, description, image].every(isText)) return null;
  if (!Object.hasOwn(CATEGORIES, category)) return null;
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) return null;
  if (typeof available !== 'boolean') return null;
  return {
    id: id.trim(), name: name.trim(), brand: isText(brand) ? brand.trim() : '',
    category, description: description.trim(), price, image: image.trim(),
    available, featured: featured === true,
  };
}

// Carrega o JSON, descarta registros inválidos/duplicados e mantém só os disponíveis.
export async function loadCatalog() {
  const res = await fetch(CONFIG.dataUrl, { cache: 'no-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : data.products;
  if (!Array.isArray(rows)) throw new Error('Formato inválido');
  const seen = new Set();
  const list = [];
  for (const r of rows) {
    const p = normalizeProduct(r);
    if (!p) { console.warn('Produto inválido ignorado:', r && r.id); continue; }
    if (seen.has(p.id)) { console.warn('ID duplicado ignorado:', p.id); continue; }
    seen.add(p.id);
    if (p.available) list.push(p);
  }
  return list;
}
