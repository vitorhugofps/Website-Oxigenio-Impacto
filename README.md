# Oxigênio Uberlândia · site

Site institucional da Oxigênio Uberlândia (gases medicinais e industriais, desde 1982), feito pelo Studio Impacto a partir do brandbook V2.

## Estrutura

- `index.html`: o site inteiro, com rotas por âncora (`#inicio`, `#para-casa`, `#hospitais`, `#home-care`, `#empresas`, `#procedencia`, `#sobre`, `#contato`).
- `img/`: fotos em WebP (referências de direção, a substituir pelas fotos da diária de captação).
- `fonts/`: Funnel Display e Funnel Sans (licença OFL).
- `js/`: GSAP 3.12.5 (animações e scroll).
- `vercel.json`: cache dos arquivos estáticos.

Site estático: não precisa de build. A Vercel publica a pasta como está.

## Pontos de configuração

- Número do WhatsApp usado pela Lia e pelos formulários: constante `WA` no início do script em `index.html` (hoje `553432133339`).
- A Lia do site monta o pedido e abre o WhatsApp com a mensagem pronta. A conversa continua com o agente de IA no WhatsApp.

## Antes de ir ao ar

- Confirmar o número do WhatsApp, a AFE (número e validade), horário, área de entrega e o portfólio da linha Indústria.
- Revisão do responsável técnico em todos os textos de saúde.
- Trocar as fotos de referência pelas fotos reais da operação.

## Cilindro 3D (seção Procedência do início)

- `js/cilindro3d.min.js`: three.js 0.180 + o modelo, carregado só quando a seção chega perto da tela. Sem WebGL, a foto `img/cilindro.webp` continua no lugar.
- Fonte em `src/cilindro3d.js`. Para gerar o build: numa pasta temporária `npm i three@0.180.0 esbuild`, depois `NODE_PATH=<pasta>/node_modules node src/3d/build.mjs` a partir da raiz do repositório.
- Texturas em `img/3d/`: pintura e latão gerados com GPT Image 2.5 (via Higgsfield), tratados por `src/3d/process_hf.py` (tile sem emenda, normal e rugosidade); o desgaste do pé e do ombro vem de `src/3d/procedural.py` (aoMap). A etiqueta é desenhada em canvas com as fontes e o logo do site, com os mesmos dados do componente `.label`.
- Os itens da lista (lacre, etiqueta, verde) viram botões quando o 3D carrega: passar o mouse mostra o detalhe, clicar fixa.
- `?cil-debug=1` na URL expõe `window.__cil` para depurar enquadramentos.
