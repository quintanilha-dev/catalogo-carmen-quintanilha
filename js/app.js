import { CONFIG } from './config.js';
import { loadCatalog, CATEGORIES, formatPrice } from './catalog.js';
import { filterProducts } from './filters.js';
import * as cart from './cart.js';
import { buildMessage, buildUrl } from './whatsapp.js';

const app = document.getElementById('app');
const state = { query: '' };
let products = [];
let firstRender = true;
let focusKey = null;

/* ---------- helpers de DOM (texto sempre via nós seguros, nunca innerHTML) ---------- */
function h(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return n;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function icon(d) {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('class', 'icon');
  s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  s.append(p);
  return s;
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

const label = (p) => p.brand || CATEGORIES[p.category];
const productHref = (id) => `#/produto/${encodeURIComponent(id)}`;

function productImg(p, cls) {
  const img = h('img', { src: p.image, alt: `${p.name} — ${CATEGORIES[p.category]}`, loading: 'lazy', width: 600, height: 600, class: cls });
  img.addEventListener('error', () => {
    img.replaceWith(h('div', { class: 'img-fallback', role: 'img', 'aria-label': `${p.name} (imagem indisponível)` }, 'Sem imagem'));
  });
  return img;
}

function stepper(name, initial, onChange, key) {
  let value = initial;
  const out = h('output', {}, String(value));
  const bump = (d) => {
    value = Math.max(1, Math.min(99, value + d));
    out.textContent = String(value);
    onChange(value);
  };
  return h('div', { class: 'qty', role: 'group', 'aria-label': `Quantidade de ${name}` },
    h('button', { type: 'button', 'data-k': key + '-', 'aria-label': `Diminuir quantidade de ${name}`, onclick: () => bump(-1) }, '−'),
    out,
    h('button', { type: 'button', 'data-k': key + '+', 'aria-label': `Aumentar quantidade de ${name}`, onclick: () => bump(1) }, '+'));
}

function emptyState(title, text, action) {
  return h('div', { class: 'empty' }, h('h2', {}, title), text && h('p', {}, text), action);
}

/* ---------- componentes ---------- */
function card(p) {
  return h('li', { class: 'card' },
    h('a', { class: 'card-link', href: productHref(p.id) },
      productImg(p, 'thumb'),
      h('span', { class: 'meta' }, label(p)),
      h('span', { class: 'name' }, p.name),
      h('span', { class: 'price' }, formatPrice(p.price))),
    h('button', {
      class: 'btn btn-ghost btn-sm', type: 'button', 'aria-label': `Adicionar ${p.name} à sacola`,
      onclick: () => { cart.add(p.id); toast('Adicionado à sacola'); },
    }, 'Adicionar'));
}
const grid = (list) => h('ul', { class: 'grid' }, list.map(card));

/* ---------- telas ---------- */
function homeView() {
  const featured = products.filter((p) => p.featured);
  const lead = featured[0] || products[0];
  let heroImg = null;
  if (lead) {
    heroImg = h('img', { src: lead.image, alt: '', class: 'thumb', width: 600, height: 600 });
    heroImg.addEventListener('error', () => heroImg.remove());
  }
  return h('section', { class: 'page' },
    h('div', { class: 'hero' },
      h('p', { class: 'meta' }, 'Beleza, moda e cuidado'),
      h('h1', {}, 'Encontre algo especial.'),
      h('p', { class: 'lead' }, 'Uma seleção de produtos para acompanhar o seu dia.')),
    h('a', { class: 'hero-card', href: '#/catalogo' },
      h('div', {},
        h('p', { class: 'hero-title' }, 'Carmen Quintanilha'),
        h('p', { class: 'meta' }, 'Escolhas que fazem bem a você.'),
        h('span', { class: 'hero-cta' }, 'Explorar catálogo')),
      heroImg),
    h('div', { class: 'section' },
      h('h2', {}, 'Explore por categoria'),
      h('div', { class: 'cats' }, Object.entries(CATEGORIES).map(([k, v]) => h('a', { class: 'cat', href: `#/catalogo/${k}` }, v)))),
    featured.length > 0 && h('div', { class: 'section' }, h('h2', {}, 'Destaques da semana'), grid(featured)));
}

function catalogView(cat) {
  if (!Object.hasOwn(CATEGORIES, cat)) cat = '';
  const listBox = h('div', {});
  const count = h('span', { class: 'meta' });
  const refresh = () => {
    const list = filterProducts(products, { category: cat, query: state.query });
    count.textContent = `${list.length} ${list.length === 1 ? 'produto' : 'produtos'}`;
    if (list.length) listBox.replaceChildren(grid(list));
    else if (state.query.trim()) {
      listBox.replaceChildren(emptyState('Nenhum produto encontrado', 'Tente outro nome ou veja todas as categorias.',
        h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => { state.query = ''; input.value = ''; refresh(); input.focus(); } }, 'Limpar busca')));
    } else {
      listBox.replaceChildren(emptyState('Ainda não há produtos aqui', 'Volte em breve ou veja outra categoria.',
        h('a', { class: 'btn btn-ghost', href: '#/catalogo' }, 'Ver todos os produtos')));
    }
  };
  const input = h('input', {
    id: 'q', type: 'search', placeholder: 'Buscar produto', autocomplete: 'off', value: state.query,
    oninput: (e) => { state.query = e.target.value; refresh(); },
  });
  const chip = (key, text) => h('a', { class: 'chip', href: key ? `#/catalogo/${key}` : '#/catalogo', 'aria-current': cat === key ? 'true' : null }, text);
  const view = h('section', { class: 'page' },
    h('h1', {}, 'Nosso catálogo'),
    h('p', { class: 'lead' }, 'Encontre seus produtos favoritos.'),
    h('div', { class: 'search' }, h('label', { class: 'visually-hidden', for: 'q' }, 'Buscar produto'), icon('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5'), input),
    h('div', { class: 'chips', role: 'group', 'aria-label': 'Categorias' }, chip('', 'Todos'), Object.entries(CATEGORIES).map(([k, v]) => chip(k, v))),
    h('div', { class: 'list-head' }, h('h2', {}, 'Produtos disponíveis'), count),
    listBox);
  refresh();
  return view;
}

function notFoundView() {
  return h('section', { class: 'page' },
    emptyState('Produto não encontrado', 'Ele pode ter saído do catálogo.', h('a', { class: 'btn', href: '#/catalogo' }, 'Ver catálogo')));
}

function productView(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return notFoundView();
  let qty = 1;
  return h('section', { class: 'page' },
    h('div', { class: 'product' },
      productImg(p, 'product-img'),
      h('div', { class: 'product-info' },
        h('div', {}, h('p', { class: 'meta' }, label(p)), h('h1', {}, p.name), h('p', { class: 'price' }, formatPrice(p.price))),
        h('p', {}, p.description),
        h('p', { class: 'meta' }, 'Consulte os detalhes e a disponibilidade com a revendedora.'),
        h('div', {}, h('p', { class: 'field-label' }, 'Quantidade'), stepper(p.name, 1, (v) => { qty = v; }, 'pq')),
        h('div', { class: 'product-actions' },
          h('button', {
            class: 'btn btn-block', type: 'button',
            onclick: () => { cart.add(p.id, qty); toast(qty > 1 ? `${qty} itens adicionados à sacola` : 'Adicionado à sacola'); },
          }, 'Adicionar à sacola'),
          h('a', { class: 'btn btn-ghost btn-block', href: '#/sacola' }, 'Ver sacola')))));
}

function cartView() {
  const root = h('section', { class: 'page' });
  const render = () => {
    const { valid, invalid, total } = cart.lines(products);
    const kids = [h('h1', {}, 'Sua sacola'), h('p', { class: 'lead' }, 'Confira os itens antes de enviar.')];
    if (!valid.length && !invalid.length) {
      kids.push(emptyState('Sua sacola está vazia', 'Escolha produtos no catálogo para montar seu pedido.', h('a', { class: 'btn', href: '#/catalogo' }, 'Ver catálogo')));
    } else {
      const rows = valid.map(({ product: p, qty, subtotal }) => h('li', { class: 'cart-item' },
        productImg(p, 'thumb'),
        h('div', {},
          h('p', { class: 'meta' }, label(p)),
          h('a', { class: 'name', href: productHref(p.id) }, p.name),
          h('p', { class: 'price' }, formatPrice(p.price)),
          h('div', { class: 'cart-actions' },
            stepper(p.name, qty, (v) => { cart.setQty(p.id, v); render(); }, p.id),
            h('button', { class: 'link-btn', type: 'button', 'aria-label': `Remover ${p.name} da sacola`, onclick: () => { cart.remove(p.id); toast('Item removido'); focusKey = '__h1'; render(); } }, 'Remover')),
          h('p', { class: 'meta' }, `Subtotal: ${formatPrice(subtotal)}`))));
      invalid.forEach((id) => rows.push(h('li', { class: 'cart-item' },
        h('div', { class: 'img-fallback' }, 'Indisponível'),
        h('div', {},
          h('p', { class: 'name' }, 'Item não está mais disponível'),
          h('button', { class: 'link-btn', type: 'button', onclick: () => { cart.remove(id); focusKey = '__h1'; render(); } }, 'Remover da sacola')))));
      const summary = h('div', { class: 'summary' },
        h('h2', {}, 'Resumo do pedido'),
        h('div', { class: 'row' }, h('span', {}, 'Subtotal'), h('span', {}, formatPrice(total))),
        h('div', { class: 'row' }, h('span', {}, 'Entrega'), h('span', {}, 'A combinar')),
        h('div', { class: 'row total' }, h('span', {}, 'Total estimado'), h('span', {}, formatPrice(total))));
      let cta;
      if (invalid.length) {
        cta = h('div', { class: 'cta' },
          h('p', { class: 'notice', role: 'alert' }, 'Alguns itens não estão mais disponíveis. Remova-os para continuar.'),
          h('button', { class: 'btn btn-block', type: 'button', disabled: true }, 'Enviar pedido pelo WhatsApp'));
      } else {
        const url = buildUrl(buildMessage(valid, total));
        cta = h('div', { class: 'cta' },
          h('a', { class: 'btn btn-whatsapp btn-block', href: url, target: '_blank', rel: 'noopener noreferrer' }, 'Enviar pedido pelo WhatsApp'),
          h('p', { class: 'note' }, 'Isto abre uma conversa com a mensagem pronta. O pedido só é confirmado depois que Carmen responder.'),
          h('p', { class: 'note' }, 'Você poderá confirmar valores e disponibilidade diretamente com ela.'));
      }
      kids.push(h('ul', { class: 'cart-list' }, rows), summary, cta);
    }
    root.replaceChildren(h('div', { class: 'cart-wrap' }, kids));
    const target = focusKey && root.querySelector(`[data-k="${CSS.escape(focusKey)}"]`);
    (target || (focusKey !== null ? root.querySelector('h1') : null))?.focus?.();
    focusKey = null;
  };
  // Mantém o foco no botão usado ao mudar a quantidade.
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (b) focusKey = b.dataset.k;
  }, true);
  render();
  return root;
}

function errorView() {
  return h('section', { class: 'page' },
    emptyState('Não foi possível carregar o catálogo', 'Verifique sua conexão e tente de novo.',
      h('button', { class: 'btn', type: 'button', onclick: () => location.reload() }, 'Tentar novamente')),
    h('p', { class: 'note' }, 'Se você abriu o arquivo direto no computador, use um servidor local (veja o README).'));
}

/* ---------- roteamento ---------- */
function parse() {
  try { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent); }
  catch { return []; }
}

function updateBadges() {
  const n = cart.count();
  document.querySelectorAll('[data-cart-count]').forEach((b) => { b.textContent = n; b.hidden = n === 0; });
  document.querySelectorAll('[data-cart-link]').forEach((a) => a.setAttribute('aria-label', n ? `Sacola, ${n} ${n === 1 ? 'item' : 'itens'}` : 'Sacola'));
}

function render() {
  const [name = '', arg = ''] = parse();
  let view, section = 'home', title = '', back = '#/';
  switch (name) {
    case '': view = homeView(); break;
    case 'catalogo': view = catalogView(arg); section = 'catalogo'; title = 'Catálogo'; break;
    case 'produto': {
      view = productView(arg); section = 'catalogo'; back = '#/catalogo';
      title = products.find((p) => p.id === arg)?.name || 'Produto';
      break;
    }
    case 'sacola': view = cartView(); section = 'sacola'; title = 'Sua sacola'; break;
    default: view = notFoundView(); title = 'Não encontrado';
  }
  app.replaceChildren(view);
  document.title = title ? `${title} — ${CONFIG.brand}` : `${CONFIG.brand} — Catálogo digital`;
  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.dataset.route === section) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const backLink = document.getElementById('back');
  backLink.hidden = name === '';
  backLink.setAttribute('href', back);
  if (!firstRender) {
    window.scrollTo(0, 0);
    const h1 = app.querySelector('h1');
    if (h1 && name !== 'sacola') { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }
  firstRender = false;
}

async function init() {
  try {
    products = await loadCatalog();
  } catch (err) {
    console.error('Falha ao carregar o catálogo:', err);
    app.replaceChildren(errorView());
    return;
  }
  cart.subscribe(updateBadges);
  updateBadges();
  window.addEventListener('hashchange', render);
  render();
}

init();
