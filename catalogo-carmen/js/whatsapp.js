import { CONFIG } from './config.js';
import { formatPrice } from './catalog.js';

export function buildMessage(valid, total) {
  const rows = valid.map((l) => `• ${l.product.name} — Quantidade: ${l.qty} — ${formatPrice(l.product.price)}`);
  return [
    'Olá! Tenho interesse em fazer um pedido pelo catálogo Carmen Quintanilha.',
    '',
    ...rows,
    '',
    `Total estimado: ${formatPrice(total)}`,
    '',
    'Sei que valores e disponibilidade serão confirmados por você. Podemos confirmar a disponibilidade?',
  ].join('\n');
}

export function buildUrl(text) {
  const phone = CONFIG.whatsappPhone.replace(/\D/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
