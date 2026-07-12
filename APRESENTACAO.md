# Álbum Colaborativo Digital para Casamentos

## Apresentação do Produto

---

## 1. O Problema

Casais passam meses planejando o casamento. Chega o grande dia e tudo passa muito rápido. As fotos do fotógrafo contratado são lindas, mas têm um olhar profissional. Os convidados, por outro lado, registram momentos espontâneos — a risada na mesa do fundo, o amigo que pegou o buquê, o tio dançando — que acabam perdidos em grupos de WhatsApp, nos rolos de câmera de cada um ou simplesmente nunca são compartilhados.

Depois do casamento, os convidados querem ver as fotos que os outros tiraram, mas não existe um lugar centralizado. O resultado é que a maioria dessas memórias se perde.

## 2. A Solução

Um **álbum colaborativo digital** que vive na nuvem e é acessado exclusivamente via QR Code. Os convidados escaneiam com o celular e são levados a uma página personalizada com o nome do casal, onde podem:

- **Tirar fotos na hora** ou selecionar da galeria
- **Assinar o nome** para marcar cada foto
- **Enviar vídeos também**
- **Ver a galeria em tempo real** com as contribuições de todo mundo
- **Reagir às fotos** com emojis (❤️ 😍 😂 👏 🔥)
- **Navegar pela galeria em tela cheia**

Tudo sem instalar aplicativo, sem criar conta, sem fazer login. Basta escanear e compartilhar.

## 3. Como o Convidado Usa — O Fluxo Completo

### Etapa 1 — O QR Code

O casal imprime o QR Code nos convites, nos guardanapos, no bem-casado, na mesa de *welcome* ou em plaquinhas espalhadas pelo salão.

### Etapa 2 — Escaneou, entrou

O convidado aponta a câmera, abre a página e digita o próprio nome. Pronto. Da próxima vez que escanear, o nome já estará salvo.

### Etapa 3 — Tela de boas-vindas

O convidado vê o nome do casal, a data do casamento e quantas fotos já foram compartilhadas até aquele momento. Dois botões principais: "Compartilhar memórias" e "Ver galeria".

### Etapa 4 — Upload

O convidado seleciona fotos ou vídeos, vê um preview do que vai enviar, adiciona o nome (se quiser) e envia. Uma barra de progresso mostra o upload acontecendo em tempo real.

### Etapa 5 — A Galeria

As fotos aparecem em uma galeria estilo *masonry* (como o Pinterest), organizadas automaticamente por linha do tempo: Chá de Panela, Despedida de Solteiro, Pré-Wedding, Cerimônia, Festa, After. O convidado pode navegar infinitamente, clicar em qualquer foto para ver em tela cheia, reagir com emojis e baixar a foto.

### Etapa 6 — Depois do Casamento

O site fica no ar por 1 ano inteiro. O casal e os convidados podem acessar quando quiserem, baixar fotos, rever momentos. Ao final do período, todas as fotos originais são entregues em um drive para o casal guardar para sempre.

## 4. Diferenciais Técnicos

- **Sem cadastro, sem barreira:** Convidado nenhum vai deixar de participar porque "precisa fazer login". A experiência é instantânea.
- **Organização automática:** As fotos são agrupadas por evento graças aos metadados EXIF — o próprio sistema identifica quando cada foto foi tirada e organiza sozinho.
- **Direto do celular para a nuvem:** As fotos vão direto do celular do convidado para o armazenamento na AWS, sem passar por servidores intermediários. Isso significa upload rápido e suporte a muitos convidados ao mesmo tempo.
- **Reações em tempo real:** Os convidados interagem entre si através das fotos, criando engajamento mesmo depois do evento.
- **Vídeos também:** Diferente de muitas plataformas, o sistema aceita vídeos com reprodução automática ao rolar a tela.
- **Design responsivo e noturno:** Funciona perfeitamente no celular e tem modo escuro para usar à noite.

## 5. Modelo de Negócio

### Precificação

O sistema é vendido em **pagamento único** (não é assinatura). O valor cobre:

- Criação e personalização do site (cores, fontes, nome do casal, data)
- **1 ano de hospedagem na Vercel** (plataforma robusta e rápida)
- **1 ano de armazenamento na AWS S3** (fotos e vídeos)
- **1 ano de banco de dados PostgreSQL** (Neon)
- Suporte durante o período

**Preço final sugerido para o casal:** R$ 200 a R$ 400

> Por que não mensalidade? Porque casal não quer mais uma conta recorrente. O valor é baixo o bastante para ser acessível e alto o bastante para entregar valor real. Um ano depois, as fotos são exportadas e o ciclo se encerra.

### Parceria com a Cerimonialista

A cerimonialista é o canal ideal porque:

- Está em contato com o casal **no momento certo** (durante o planejamento)
- Já tem a confiança do casal
- Agrega mais um serviço ao portfólio sem precisar desenvolver nada

**Modelo de comissão sugerido:** 20–30% do valor por venda realizada.

**Papel da cerimonialista:**

- Apresentar o sistema para o casal
- Explicar como funciona
- Coletar as preferências visuais (cores, nome do casal)
- Repassar as informações para o desenvolvedor

**Papel do desenvolvedor (eu):**

- Criar e personalizar o site
- Configurar o QR Code
- Hospedar e manter o sistema no ar
- Entregar as fotos ao final de 1 ano

### Sobre o Domínio

O domínio não precisa ser bonito nem memorável. O acesso é exclusivamente via QR Code — ninguém vai digitar o endereço. É como cardápio de restaurante com QR Code: o cliente escaneia e pronto. O link pode ser algo como `meusite.vercel.app/nome-do-casal`.

## 6. Fluxo de Venda e Entrega

1. Cerimonialista apresenta o produto ao casal
2. Casal aceita e faz o pagamento
3. Cerimonialista envia as preferências (nome, data, cores, fotos de fundo)
4. Desenvolvedor customiza e publica o site (em 24–48h)
5. Cerimonialista entrega o QR Code impresso ao casal
6. Casal imprime nos materiais do casamento
7. Convidados usam — fotos são acumuladas em tempo real
8. Após 1 ano, desenvolvedor exporta tudo para um drive e entrega ao casal

## 7. Próximos Passos

- **Demonstração ao vivo:** Mostrar o sistema funcionando para a cerimonialista (2 minutos)
- **Definir comissão:** Alinhar o percentual
- **Preparar material de apoio:** Um card digital que a cerimonialista possa enviar no WhatsApp
- **Primeiro caso real:** Testar com um casal para validar o fluxo completo
