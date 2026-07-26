# Wedding Memories - WhatsApp Agent

Sistema de vendas automatizado via WhatsApp. A **Lia** é a assistente virtual que conversa com clientes potenciais e cerimonialistas.

---

## Arquitetura

```
WhatsApp → Bridge (Go, :8080) → Webhook (Python, :9090) → opencode → Lia
                                    ↓
                              Neon PostgreSQL
                                    ↓
                           Dashboard (:5001)
```

---

## Componentes

| Componente | Arquivo | Função |
|------------|---------|--------|
| WhatsApp Bridge | `whatsapp-bridge/main.go` | Conecta ao WhatsApp, armazena mensagens em SQLite |
| Webhook Listener | `webhook-listener.py` | Gera respostas via opencode, salva no Neon |
| Skill de Vendas | `.opencode/skills/wedding-sales/SKILL.md` | Personalidade e regras da Lia |
| Evals | `evals-hybrid.py` | Testes de qualidade das respostas |
| Dashboard | `dashboard-api.py` | API e dashboard visual |
| Análise | `analyze-conversations.py` | Extrai padrões das conversas |

---

## Pré-requisitos

- Go 1.20+
- Python 3.6+
- opencode CLI instalado
- Neon PostgreSQL (opcional, para analytics)

---

## Configuração

### Lista de numeros autorizados

Edite `auto-reply-config.json`:

```json
{
  "webhook_port": 9090,
  "agent_endpoint": "http://localhost:9090",
  "whitelist": [
    "5531986749029",
    "553197558036"
  ]
}
```

Formato: codigo do pais + DDD + numero (sem + ou espacos).

### Neon PostgreSQL (opcional)

Para analytics no dashboard, configure a connection string em:
- `webhook-listener.py` (variavel `NEON_URL`)
- `dashboard-api.py` (variavel `NEON_URL`)
- `analyze-conversations.py` (variavel `NEON_URL`)

---

## Comandos

### Iniciar tudo junto

```bash
cd Agent/whatsapp-mcp-main
./start.sh
```

### Iniciar separado (recomendado para debug)

**Terminal 1 - WhatsApp Bridge:**
```bash
cd Agent/whatsapp-mcp-main/whatsapp-bridge
./whatsapp-bridge
```

**Terminal 2 - Webhook Listener:**
```bash
cd Agent/whatsapp-mcp-main
python3 webhook-listener.py
```

**Terminal 3 - Dashboard (opcional):**
```bash
cd Agent/whatsapp-mcp-main
python3 dashboard-api.py
# Acesse: http://localhost:5001
```

### Parar servicos

```bash
pkill -f whatsapp-bridge
pkill -f webhook-listener
pkill -f dashboard-api
```

### Evals

```bash
# Manual - roda todos os 12 cenarios
python3 evals-hybrid.py

# Automatico - roda 5 cenarios a cada 24h
python3 evals-hybrid.py --auto

# Ver status
python3 evals-hybrid.py --status
```

### Analise de conversas

```bash
python3 analyze-conversations.py
```

---

## Fluxo de uma mensagem

1. Cliente envia WhatsApp
2. Bridge recebe e armazena no SQLite
3. Bridge verifica se numero esta na whitelist
4. Se sim, notifica webhook listener
5. Webhook le historico do chat
6. Webhook chama opencode com prompt da Lia
7. Lia gera resposta
8. Webhook envia resposta via bridge API
9. Webhook salva resposta no Neon PostgreSQL

---

## Dashboard

### Endpoints

| Rota | Funcao |
|------|--------|
| `GET /` | Dashboard visual |
| `GET /api/health` | Status do sistema |
| `GET /api/stats/overview` | Estatisticas gerais |
| `GET /api/conversations` | Lista de conversas |
| `GET /api/conversations/<jid>/messages` | Mensagens de uma conversa |
| `GET /api/lia/responses` | Respostas da Lia |
| `GET /api/lia/stats` | Performance da Lia |
| `GET /api/evals` | Resultados dos evals |
| `GET /api/recommendations` | Recomendacoes da IA |

### Acessar

```bash
python3 dashboard-api.py
# Abra http://localhost:5001
```

---

## Neon PostgreSQL

### Tabelas

| Tabela | Funcao |
|--------|--------|
| `conversations` | Conversas com clientes |
| `messages` | Mensagens classificadas por categoria |
| `lia_responses` | Todas as respostas da Lia |
| `evals` | Resultados dos testes |
| `analysis_results` | Analises periodicas |
| `categories` | Categorias de mensagens |

### Schema

O schema esta em `schema.sql`. Para aplicar:

```bash
psql "SUA_CONNECTION_STRING" -f schema.sql
```

---

## Troubleshooting

### Porta 8080 em uso
```bash
pkill -f whatsapp-bridge
```

### Porta 9090 em uso
```bash
pkill -f webhook-listener
```

### QR Code nao aparece
Delete o banco de dados e reinicie:
```bash
rm whatsapp-bridge/store/whatsapp.db
cd whatsapp-bridge && ./whatsapp-bridge
```

### Mensagens nao estao sendo respondidas
1. Verifique se o numero esta na whitelist
2. Verifique se o webhook listener esta rodando
3. Verifique os logs: `cat /tmp/webhook-listener.log`

### Erro "no LID found"
O numero pode ter mudado de formato. Verifique o JID correto:
```bash
# No WhatsApp MCP
search_contacts("nome do contato")
```

---

## Estrutura de arquivos

```
Agent/
├── whatsapp-mcp-main/
│   ├── whatsapp-bridge/
│   │   ├── main.go              # Bridge Go
│   │   └── store/               # SQLite databases
│   ├── whatsapp-mcp-server/     # MCP server Python
│   ├── webhook-listener.py      # Listener de webhooks
│   ├── dashboard-api.py         # API do dashboard
│   ├── dashboard.html           # Dashboard visual
│   ├── evals-hybrid.py          # Sistema de evals
│   ├── analyze-conversations.py # Analise de conversas
│   ├── auto-reply-config.json   # Configuracao de whitelist
│   ├── schema.sql               # Schema do Neon
│   ├── start.sh                 # Inicia tudo junto
│   ├── evals/
│   │   └── test-cases.json      # Cenarios de teste
│   └── Wedding Memories.pdf     # PDF para clientes
└── README.md                    # Este arquivo
```