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
