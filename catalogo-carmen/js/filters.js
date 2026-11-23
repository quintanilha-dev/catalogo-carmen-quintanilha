const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Busca por nome e marca (sem acento, sem diferenciar maiúsculas) + categoria.
export function filterProducts(list, { category = '', query = '' } = {}) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  return list.filter((p) =>
    (!category || p.category === category) &&
    terms.every((t) => norm(p.name + ' ' + p.brand).includes(t)));
}
