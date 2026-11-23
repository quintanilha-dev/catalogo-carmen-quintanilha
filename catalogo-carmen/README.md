# Catálogo Carmen Quintanilha

Catálogo digital estático (HTML, CSS e JavaScript puro) de Avon, Natura e roupas.
O cliente monta a sacola e envia o pedido pelo WhatsApp. Não há backend: o pedido só é confirmado na conversa.

## Rodar no computador
Os módulos JS não funcionam abrindo o `index.html` com duplo clique. Use um servidor local:

    python3 -m http.server 8000

Depois abra http://localhost:8000

## Trocar o número do WhatsApp
Edite `js/config.js` (`whatsappPhone`): só dígitos, com 55 + DDD + número. Ex.: `5598983542074`.
O repositório é público, então esse número ficará visível a quem inspecionar o código.

## Cadastrar ou editar produtos
Tudo fica em `data/products.json`. Cada produto:

| Campo | Regra |
|---|---|
| `id` | único e nunca reutilizado (ex.: `avon-005`) |
| `name`, `description` | texto simples (sem HTML) |
| `brand` | opcional (Avon, Natura; vazio para roupas) |
| `category` | `avon`, `natura` ou `roupas` |
| `price` | número, ex.: `49.90` (não use "R$") |
| `image` | caminho relativo, ex.: `assets/images/products/avon-005.webp` |
| `available` | `true` ou `false` (`false` esconde do catálogo) |
| `featured` | opcional; `true` mostra em "Destaques da semana" |

Fotos: salve em `assets/images/products/` com o mesmo nome do `id`, quadradas (ex.: 800x800), em WebP ou JPG comprimido.
Produtos inválidos são ignorados (aviso no console do navegador) sem quebrar o site.
As imagens `.svg` atuais e os 12 produtos são **exemplos**: troque pelos reais.

## Publicar no GitHub Pages
1. Suba a pasta para um repositório no GitHub.
2. Em Settings > Pages, escolha a branch `main` e a pasta `/ (root)`.
3. Aguarde alguns minutos e abra o link gerado. Os caminhos são relativos, então funciona em subpasta.

## Estrutura
- `index.html`: página única; as telas (início, catálogo, produto, sacola) são montadas por `js/app.js` via rotas `#/`.
- `css/`: `global.css` (tokens), `components.css`, `responsive.css`.
- `js/`: `config.js`, `catalog.js` (carga e validação), `filters.js` (busca/categoria), `cart.js` (carrinho + localStorage), `whatsapp.js` (mensagem e link), `app.js` (telas).
- `assets/images/brand/monogram.svg` e `assets/icons/favicon.svg`: monograma CQ provisório.

## Decisões em relação à especificação
- Ícone de favoritos do Figma removido (fora do escopo).
- Categoria "Moda" do Figma padronizada como "Roupas".
- Página de cada produto tem link próprio (`#/produto/<id>`), compartilhável.
- Carrinho guarda só `id` e quantidade; preços vêm sempre do JSON atual.
- Se um item da sacola sair do catálogo, o envio fica bloqueado até removê-lo.
- Fontes (Cormorant Garamond e DM Sans) vêm do Google Fonts, com fallback para fontes do sistema.
