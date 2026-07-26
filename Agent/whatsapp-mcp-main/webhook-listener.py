#!/usr/bin/env python3
"""
Webhook listener for Wedding Memories auto-reply.
Receives incoming WhatsApp messages and triggers agent responses via opencode.
Saves all responses to Neon PostgreSQL for analytics.
"""

import json
import os
import sys
import sqlite3
import requests
import subprocess
import threading
import time
import psycopg2
import re
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from collections import defaultdict

# Config
BRIDGE_API = "http://localhost:8080/api"
MESSAGES_DB = Path(__file__).parent / "whatsapp-bridge" / "store" / "messages.db"
CONFIG_FILE = Path(__file__).parent / "auto-reply-config.json"
OPENCODE_BIN = "opencode"
PROJECT_DIR = Path(__file__).parent.parent.parent  # wedding-memories root

# Neon connection
NEON_URL = "postgresql://neondb_owner:npg_3CZNfguJjvV1@ep-shy-recipe-axgao4na-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Lead scoring keywords
HIGH_INTENT_KEYWORDS = ["quero", "como faço", "quanto custa", "quero saber", "me mostra", "como funciona", "contratar", "comprar"]
MEDIUM_INTENT_KEYWORDS = ["oi", "vi sobre", "me conta", "é verdade", "oi tudo bem"]
OBJECTION_KEYWORDS = ["caro", "já tenho", "não preciso", "não entendo", "não quero", "depois"]
CERIMONIALISTA_KEYWORDS = ["cerimonialista", "parceria", "indico", "fornecedor"]
URGENCY_KEYWORDS = ["urgente", "amanhã", "mês que vem", "próximo", "rápido", "ainda dá"]
PRICE_KEYWORDS = ["quanto", "preço", "custa", "valor", "desconto", "barato"]
FEATURE_KEYWORDS = ["funciona", "como", "video", "foto", "app", "celular", "qualidade"]

# Debounce config: wait 10 seconds after last message before responding
DEBOUNCE_SECONDS = 10

# Retry config
MAX_RETRIES = 3
RETRY_TIMEOUTS = [30, 50, 70]  # seconds per attempt
FALLBACK_MESSAGE = "Oi! 😊 Estou com uma dificuldade técnica no momento. Me dê alguns minutos que eu volto pra te ajudar!"

# Persistent queue file (survives restarts)
QUEUE_FILE = Path(__file__).parent / "pending_messages.json"

# Message buffer for debounce (per phone number)
message_buffers = defaultdict(list)
message_timers = {}

# Language detection patterns
LANG_PATTERNS = {}


class MessageDebouncer:
    """Debounces incoming messages to batch rapid-fire messages into one response."""
    
    def __init__(self, debounce_seconds=DEBOUNCE_SECONDS):
        self.debounce_seconds = debounce_seconds
        self.buffers = defaultdict(list)
        self.timers = {}
        self.lock = threading.Lock()
    
    def add_message(self, sender, message, chat_jid):
        """Add a message to the buffer and reset the timer."""
        with self.lock:
            # Add message to buffer
            self.buffers[sender].append({
                "message": message,
                "chat_jid": chat_jid,
                "timestamp": time.time()
            })
            
            # Cancel existing timer if any
            if sender in self.timers:
                self.timers[sender].cancel()
            
            # Set new timer
            timer = threading.Timer(
                self.debounce_seconds,
                self._process_buffer,
                args=[sender]
            )
            timer.daemon = True
            self.timers[sender] = timer
            timer.start()
            
            print(f"Message buffered for {sender} ({len(self.buffers[sender])} messages, timer reset)")
    
    def _process_buffer(self, sender):
        """Process all buffered messages for a sender."""
        with self.lock:
            # Get all buffered messages
            messages = self.buffers.pop(sender, [])
            timer = self.timers.pop(sender, None)
        
        if not messages:
            return
        
        # Combine all messages into one context
        combined_message = "\n".join([m["message"] for m in messages])
        chat_jid = messages[-1]["chat_jid"]  # Use the latest chat_jid
        
        print(f"\n{'='*50}")
        print(f"Processing {len(messages)} buffered messages from {sender}")
        print(f"Combined: {combined_message}")
        
        # Process the combined message
        process_message(sender, combined_message, chat_jid)


# Create debouncer instance
debouncer = MessageDebouncer()


def detect_language(text):
    """Detect the language of a text message."""
    text_lower = text.lower()
    
    for lang, patterns in LANG_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return lang
    
    return "pt"  # Default to Portuguese


def extract_lead_info(message):
    """Extract lead name and wedding date from message."""
    lead_name = None
    wedding_date = None
    
    msg_lower = message.lower()
    
    # Extract name patterns
    name_patterns = [
        r'(?:meu nome|me chamo|sou o|sou a|meu nome é|meu nome e)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)?)',
        r'(?:oi|olá|ola),?\s+([A-ZÀ-Ú][a-zà-ú]+)',
        r'(?:aqui é|aqui e|fala)\s+([A-ZÀ-Ú][a-zà-ú]+)',
    ]
    
    for pattern in name_patterns:
        match = re.search(pattern, message, re.IGNORECASE)
        if match:
            lead_name = match.group(1).strip()
            break
    
    # Extract wedding date patterns
    months_pt = {
        'janeiro': '01', 'fevereiro': '02', 'março': '03', 'marco': '03',
        'abril': '04', 'maio': '05', 'junho': '06',
        'julho': '07', 'agosto': '08', 'setembro': '09',
        'outubro': '10', 'novembro': '11', 'dezembro': '12'
    }
    
    # Pattern: "10 de outubro" or "outubro de 2025" or "10/10/2025"
    date_patterns = [
        r'(\d{1,2})\s*(?:de\s*)?((?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))(?:\s*(?:de\s*)?(\d{4}))?',
        r'((?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))(?:\s*(?:de\s*)?(\d{4}))?',
        r'(\d{1,2})/(\d{1,2})/(\d{2,4})',
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, msg_lower)
        if match:
            groups = match.groups()
            if len(groups) == 3 and groups[0] and groups[1]:
                day = groups[0] if groups[0].isdigit() else None
                month = groups[1] if groups[1].isdigit() else months_pt.get(groups[1])
                year = groups[2] if groups[2] else None
                if month:
                    wedding_date = f"{day or '01'}/{month}/{year or '2025'}"
            elif len(groups) == 2:
                if groups[0] and groups[0].isdigit():
                    day = groups[0]
                    month = months_pt.get(groups[1])
                else:
                    month = months_pt.get(groups[0])
                    year = groups[1] if groups[1] else None
                if month:
                    wedding_date = f"{day or '01'}/{month}/{year or '2025'}"
            break
    
    return lead_name, wedding_date


def notify_hot_lead(phone_number, lead_name, score, intent=None, last_message=None):
    """Send notification to WhatsApp group when lead becomes hot."""
    try:
        config = load_config()
        group_jid = config.get("notification_group_jid") if config else None
        threshold = config.get("hot_lead_threshold", 8) if config else 8
        
        if not group_jid or group_jid == "COLOQUE_O_JID_DO_GRUPO_AQUI@g.us":
            print(f"No notification group configured (JID: {group_jid})")
            return False
        
        if score < threshold:
            print(f"Score {score} below threshold {threshold}, not notifying")
            return False
        
        # Build notification message
        intent_emoji = {
            "alta": "🎯",
            "media": "💬",
            "baixa": "😴",
            "cerimonialista": "🤝",
            "objecao": "⚠️",
            "urgencia": "⏰",
            "preco": "💰",
            "interesse": "👀"
        }
        
        emoji = intent_emoji.get(intent, "📊")
        
        message = f"""🔥 *LEAD QUENTE - Wedding Memories*

📞 *Telefone:* {phone_number}
👤 *Nome:* {lead_name or 'Não informado'}
📊 *Score:* {score}/20
{emoji} *Intenção:* {intent or 'Não detectada'}"""

        if last_message:
            msg_preview = last_message[:100] + ("..." if len(last_message) > 100 else "")
            message += f"\n💬 *Última msg:* \"{msg_preview}\""
        
        message += f"\n⏰ *Horário:* {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        message += "\n\n💡 _Entre em contato diretamente com o cliente._"
        
        # Send to group
        sent_successfully = send_whatsapp_message(group_jid, message)
        
        if sent_successfully:
            print(f"Hot lead notification sent to group: {phone_number} | Score: {score}")
        else:
            print(f"Failed to send notification to group: {phone_number}")
        
        return sent_successfully
        
    except Exception as e:
        print(f"Error sending hot lead notification: {e}")
        return False


def save_to_queue(sender, message, chat_jid):
    """Save message to persistent queue (survives restarts)."""
    queue = []
    if QUEUE_FILE.exists():
        try:
            with open(QUEUE_FILE) as f:
                queue = json.load(f)
        except:
            queue = []
    
    queue.append({
        "sender": sender,
        "message": message,
        "chat_jid": chat_jid,
        "timestamp": time.time()
    })
    
    with open(QUEUE_FILE, "w") as f:
        json.dump(queue, f)
    
    print(f"Message saved to queue: {sender}")


def load_from_queue():
    """Load pending messages from queue."""
    if not QUEUE_FILE.exists():
        return []
    
    try:
        with open(QUEUE_FILE) as f:
            queue = json.load(f)
        # Clear the file
        with open(QUEUE_FILE, "w") as f:
            json.dump([], f)
        return queue
    except:
        return []


def process_message(sender, message, chat_jid):
    """Process a message (single or combined) and generate response."""
    # Get or create conversation
    conversation_id, is_new_conversation = get_or_create_conversation(sender)
    
    if is_new_conversation:
        print(f"New conversation started for {sender}")
    
    # Detect intent and calculate lead score
    intent = detect_intent(message)
    lead_score, lead_status, _ = save_or_update_lead(sender, message)
    print(f"Intent: {intent} | Lead Score: {lead_score} | Status: {lead_status}")
    
    # Build context and generate response
    prompt = build_prompt(sender, message, conversation_id, is_new_conversation)
    
    # Track response time
    start_time = time.time()
    response = generate_response_with_retry(prompt)
    response_time_ms = int((time.time() - start_time) * 1000)
    
    if response:
        print(f"Generated response: {response}")
        
        # Check if PDF was sent (agent marks with [PDF_ENVIADO])
        if "[PDF_ENVIADO]" in response:
            mark_pdf_sent(conversation_id)
            # Remove the marker from the response before sending
            response = response.replace("[PDF_ENVIADO]", "").strip()
        
        # Send response
        sent_successfully = send_whatsapp_message(sender, response)
        
        # Save to Neon with conversation_id and lead scoring data
        save_lia_response_with_conversation(
            conversation_id=conversation_id,
            chat_jid=chat_jid,
            recipient=sender,
            incoming_message=message,
            response_message=response,
            prompt_used=prompt,
            response_time_ms=response_time_ms,
            sent_successfully=sent_successfully,
            error_message=None if sent_successfully else "Failed to send",
            lead_score=lead_score,
            intent_detected=intent
        )
    else:
        print("Could not generate response after retries, sending fallback")
        # Send fallback message
        send_whatsapp_message(sender, FALLBACK_MESSAGE)
        
        # Save failed attempt
        save_lia_response_with_conversation(
            conversation_id=conversation_id,
            chat_jid=chat_jid,
            recipient=sender,
            incoming_message=message,
            response_message=FALLBACK_MESSAGE,
            prompt_used=prompt,
            response_time_ms=response_time_ms,
            sent_successfully=True,
            error_message="Fallback sent after retries failed",
            lead_score=lead_score,
            intent_detected=intent
        )


# Sales agent system prompt (used as context for opencode)
SALES_CONTEXT = """Voce e Lia, assistente virtual do Wedding Memories.

Personalidade: Calma, paciente, acolhedora, natural, consultiva.
Tom: Portugues brasileiro, informal mas profissional, frases curtas (max 2-3 por mensagem).

O que e o Wedding Memories: Album colaborativo digital para casamentos. Convidados compartilham fotos e videos pelo celular, sem baixar app, sem criar conta.

Funcionalidades principais:
- QR Code de acesso (sem app, sem login)
- Galeria em tempo real com timeline automatica
- Reacoes com emoji
- Personalizacao completa (cores, fontes, fundos)
- Painel administrativo para os noivos
- Suporte a fotos e videos

Precos: Pagamento unico de R$ 747. Inclui 50 GB de armazenamento por 1 ano, QR Code personalizado, galeria organizada e suporte.

Regras:
- Respostas BREVES: maximo 2 frases por mensagem
- Maximo 2 emojis por mensagem
- Nunca e insistente
- NAO repita informacoes ja ditas na conversa
- Trata objecoes com empatia
- Se cliente demonstra intencao forte de compra, informe que equipe entrara em contato
- NAO fale sobre comissao de cerimonialistas (assunto exclusivo do time comercial)
- Responda SOMENTE com a mensagem para o cliente, sem explicacoes adicionais"""


def load_config():
    """Load auto-reply configuration."""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return None


def get_conversation_history(conversation_id, limit=50):
    """Get all messages for the current conversation from Neon PostgreSQL."""
    if not conversation_id:
        return []
    
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        cur.execute("""
            SELECT incoming_message, response_message, created_at
            FROM lia_responses
            WHERE conversation_id = %s
            ORDER BY created_at ASC
            LIMIT %s
        """, (conversation_id, limit))
        messages = cur.fetchall()
        cur.close()
        conn.close()
        return messages  # [(incoming, response, time), ...]
    except Exception as e:
        print(f"Error reading conversation history: {e}")
        return []


def check_pdf_sent(conversation_id):
    """Check if PDF was already sent in this conversation."""
    if not conversation_id:
        return False
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        cur.execute("""
            SELECT pdf_sent FROM conversations WHERE id = %s
        """, (conversation_id,))
        result = cur.fetchone()
        cur.close()
        conn.close()
        return result[0] if result else False
    except Exception as e:
        print(f"Error checking PDF status: {e}")
        return False


def mark_pdf_sent(conversation_id):
    """Mark PDF as sent for this conversation."""
    if not conversation_id:
        return False
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        cur.execute("""
            UPDATE conversations SET pdf_sent = TRUE WHERE id = %s
        """, (conversation_id,))
        conn.commit()
        cur.close()
        conn.close()
        print(f"PDF marked as sent for conversation {conversation_id}")
        return True
    except Exception as e:
        print(f"Error marking PDF as sent: {e}")
        return False


def get_or_create_conversation(phone_number):
    """Get active conversation or create new one. Returns (conversation_id, is_new)."""
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        # Check for active conversation (using existing table structure)
        cur.execute("""
            SELECT id, last_message_at FROM conversations 
            WHERE chat_jid LIKE %s AND total_messages > 0
            ORDER BY last_message_at DESC LIMIT 1
        """, (f"%{phone_number}%",))
        result = cur.fetchone()
        
        now = datetime.now()
        
        if result:
            conv_id, last_message_at = result
            # Check if conversation expired (1 hour)
            time_diff = (now - last_message_at).total_seconds() / 3600
            
            if time_diff < 1:
                # Conversation is still active, update counters
                cur.execute("""
                    UPDATE conversations 
                    SET last_message_at = NOW(), total_messages = total_messages + 1,
                        updated_at = NOW()
                    WHERE id = %s
                """, (conv_id,))
                conn.commit()
                cur.close()
                conn.close()
                print(f"Conversation continued: {conv_id} (inactive for {time_diff:.2f}h)")
                return conv_id, False
        
        # Create new conversation
        cur.execute("""
            INSERT INTO conversations (chat_jid, contact_name, first_message_at, last_message_at, 
                                      total_messages, total_incoming, total_outgoing)
            VALUES (%s, %s, NOW(), NOW(), 1, 1, 0)
            RETURNING id
        """, (f"{phone_number}@s.whatsapp.net", phone_number))
        new_conv_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"New conversation created: {new_conv_id}")
        return new_conv_id, True
        
    except Exception as e:
        print(f"Error managing conversation: {e}")
        return None, False


def save_lia_response_with_conversation(conversation_id, chat_jid, recipient, incoming_message, response_message, prompt_used, response_time_ms, sent_successfully, error_message=None, lead_score=0, intent_detected=None):
    """Save Lia's response with conversation_id."""
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO lia_responses (conversation_id, chat_jid, recipient, incoming_message, response_message, 
                                      prompt_used, response_time_ms, sent_successfully, error_message,
                                      lead_score, intent_detected)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (conversation_id, chat_jid, recipient, incoming_message, response_message, 
              prompt_used, response_time_ms, sent_successfully, error_message,
              lead_score, intent_detected))
        
        conn.commit()
        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"Error saving response with conversation: {e}")
        return False


def build_prompt(phone_number, incoming_message, conversation_id=None, is_new_conversation=False):
    """Build the full prompt for opencode."""
    # Get conversation history from Neon (only current session)
    history = get_conversation_history(conversation_id, limit=50)
    
    # Format history as text
    history_text = ""
    if history:
        history_lines = []
        for incoming, response, created_at in history:
            history_lines.append(f"Cliente: {incoming}")
            if response:
                history_lines.append(f"Lia: {response}")
        history_text = "\n".join(history_lines)
    
    # Check if PDF was already sent
    pdf_already_sent = check_pdf_sent(conversation_id)

    # Check if this is a combined message (multiple messages from debounce)
    is_combined = "\n" in incoming_message
    
    # For combined messages, add special instruction
    combined_instruction = ""
    if is_combined:
        message_count = len(incoming_message.strip().split("\n"))
        combined_instruction = f"""
IMPORTANTE: O cliente enviou {message_count} mensagens de uma vez. 
Responda TODAS as perguntas em UMA ÚNICA mensagem coesa.
Não envie várias respostas separadas.
Analise o contexto completo e responda tudo junto.
"""

    # Conversation instruction
    conversation_instruction = ""
    if is_new_conversation:
        conversation_instruction = """
NOVA CONVERSA INICIADA: Esta e uma nova sessao com o cliente. Cumprimente e apresente-se.
"""
    else:
        conversation_instruction = """
CONVERSA CONTINUANDO: Ja existe historico com este cliente. NAO cumprimente novamente. Va direto ao assunto.
"""

    prompt = f"""Carregue a skill 'wedding-sales' usando a tool skill.

Voce e Lia, assistente virtual do Wedding Memories.

HISTORICO DA CONVERSA ATUAL:
{history_text if history_text else "(inicio da conversa)"}

MENSAGEM ATUAL DO CLIENTE:
{incoming_message}

ANALISE TODO O HISTORICO ACIMA antes de responder. Entenda o que o cliente ja falou, quais objecoes teve, se ha interesse, o que ja foi dito, o que ainda nao foi respondido.

IMPORTANTE:
- NAO repita informacoes ja ditas na conversa
- NAO cumprimente novamente se ja cumprimentou
- Va direto ao assunto
- Respostas BREVES: maximo 2 frases por mensagem

{conversation_instruction}
{combined_instruction}
{"" if pdf_already_sent else """
IMPORTANTE - ENVIO DO PDF:
Envie o PDF explicativo quando o cliente:
- Pedir mais informacoes sobre o produto
- Quiser saber como funciona
- Demonstrar interesse em contratar
- Perguntar sobre precos ou planos
- Pedir para ver algo mais detalhado

Para enviar o PDF, use:
send_file(recipient="{phone_number}", media_path="/Users/itallo.rodrigues/wedding-memories/Agent/whatsapp-mcp-main/Wedding Memories.pdf")

Ao enviar o PDF, inclua no inicio da sua mensagem: [PDF_ENVIADO]

Se o cliente so estiver cumprimentando ou fazendo uma pergunta simples, NAO envie o PDF. Envie apenas quando fizer sentido no contexto da conversa.
"""}
{"" if not pdf_already_sent else """
IMPORTANTE: O PDF ja foi enviado nesta conversa. NAO envie novamente.
Se o cliente pedir o PDF, apenas mencione que as informacoes ja foram enviadas.
"""}
FORMATAÇÃO DA MENSAGEM:
- Respostas BREVES: maximo 2 frases por mensagem
- NAO cumprimente em toda resposta. So cumprimente se o cliente cumprimentar primeiro.
- Se o cliente ja falou "oi", "ola", etc., NAO responda com "oi" de volta. Va direto ao assunto.
- NAO repita informacoes ja ditas na conversa. Va direto ao ponto.
- Emojis com moderação (1-2 por mensagem)
- Se o cliente enviou multiplas perguntas, responda todas em UMA unica mensagem
- Nao envie multiplas mensagens separadas

FECHAMENTO:
Se o cliente demonstrar intencao forte de compra (quero contratar, quanto custa, quero saber mais, como faço), responda:
"Perfeito! Uma pessoa da nossa equipe vai entrar em contato com voce para te ajudar. Qualquer duvida, estou aqui!"
E NAO tente fechar a venda voce mesmo.
"""
    prompt += f"Numero do cliente: {phone_number}\n"
    prompt += f"Mensagem atual do cliente:\n{incoming_message}\n"
    prompt += "\nResponda como Lia. Somente a mensagem para o cliente:"

    return prompt


def generate_response_with_opencode(prompt, timeout=30):
    """Generate response using opencode CLI with configurable timeout."""
    try:
        result = subprocess.run(
            [OPENCODE_BIN, "run", prompt],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=str(PROJECT_DIR)
        )

        if result.returncode == 0:
            response = result.stdout.strip()
            # Clean up opencode output (remove ANSI codes, logos, etc.)
            lines = response.split("\n")
            # Find the actual response (skip header/footer noise)
            meaningful_lines = []
            for line in lines:
                # Skip empty lines and opencode branding
                if any(skip in line for skip in ["▄", "█", "▀", "OpenCode", "opencode", "Commands:", "Positionals:"]):
                    continue
                if line.strip():
                    meaningful_lines.append(line.strip())

            if meaningful_lines:
                return "\n".join(meaningful_lines)
            return response
        else:
            print(f"Opencode error: {result.stderr}")
            return None

    except subprocess.TimeoutExpired:
        print(f"Opencode timed out after {timeout}s")
        return None
    except FileNotFoundError:
        print("opencode binary not found. Make sure it's installed.")
        return None
    except Exception as e:
        print(f"Error calling opencode: {e}")
        return None


def generate_response_with_retry(prompt):
    """Generate response with retry and exponential backoff."""
    for attempt in range(MAX_RETRIES):
        timeout = RETRY_TIMEOUTS[attempt]
        print(f"Attempt {attempt + 1}/{MAX_RETRIES} (timeout: {timeout}s)")
        
        response = generate_response_with_opencode(prompt, timeout=timeout)
        
        if response:
            return response
        
        if attempt < MAX_RETRIES - 1:
            wait_time = (attempt + 1) * 2  # 2s, 4s, 6s
            print(f"Retrying in {wait_time}s...")
            time.sleep(wait_time)
    
    print("All retries failed")
    return None


def generate_response(context):
    """Generate response using opencode (with retry)."""
    return generate_response_with_retry(context)


def resolve_lid_to_phone(lid):
    """Resolve a LID to a phone number using whatsmeow_lid_map."""
    whats_db = Path(__file__).parent / "whatsapp-bridge" / "store" / "whatsapp.db"
    if not whats_db.exists():
        return ""
    
    try:
        conn = sqlite3.connect(f"file:{whats_db}?mode=ro", uri=True)
        cursor = conn.cursor()
        # Extract LID part (before @lid)
        lid_part = lid.split('@')[0] if '@' in lid else lid
        cursor.execute("SELECT pn FROM whatsmeow_lid_map WHERE lid = ?", (lid_part,))
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else ""
    except Exception:
        return ""

def resolve_recipient(recipient):
    """Resolve recipient to proper format, handling LIDs."""
    if recipient.endswith("@lid"):
        phone = resolve_lid_to_phone(recipient)
        if phone:
            return phone
        # If no mapping found, return as-is
        return recipient
    return recipient


def detect_intent(message):
    """Detect the intent of an incoming message."""
    msg_lower = message.lower()
    
    # Check for cerimonialista first (highest priority)
    for keyword in CERIMONIALISTA_KEYWORDS:
        if keyword in msg_lower:
            return "cerimonialista"
    
    # Check for high intent
    for keyword in HIGH_INTENT_KEYWORDS:
        if keyword in msg_lower:
            return "alta"
    
    # Check for objections
    for keyword in OBJECTION_KEYWORDS:
        if keyword in msg_lower:
            return "objecao"
    
    # Check for urgency
    for keyword in URGENCY_KEYWORDS:
        if keyword in msg_lower:
            return "urgencia"
    
    # Check for price questions
    for keyword in PRICE_KEYWORDS:
        if keyword in msg_lower:
            return "preco"
    
    # Check for feature questions
    for keyword in FEATURE_KEYWORDS:
        if keyword in msg_lower:
            return "interesse"
    
    # Check for medium intent
    for keyword in MEDIUM_INTENT_KEYWORDS:
        if keyword in msg_lower:
            return "media"
    
    return "baixa"


def calculate_lead_score(message, existing_score=0):
    """Calculate lead score based on message content."""
    score = existing_score
    msg_lower = message.lower()
    
    # High intent keywords
    for keyword in HIGH_INTENT_KEYWORDS:
        if keyword in msg_lower:
            score += 3
            break
    
    # Price questions
    for keyword in PRICE_KEYWORDS:
        if keyword in msg_lower:
            score += 2
            break
    
    # Feature questions
    for keyword in FEATURE_KEYWORDS:
        if keyword in msg_lower:
            score += 1
            break
    
    # Urgency
    for keyword in URGENCY_KEYWORDS:
        if keyword in msg_lower:
            score += 2
            break
    
    # Wedding date mention
    import re
    date_patterns = [
        r'\d{1,2}\s*(?:de\s*)?(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)',
        r'(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?\d{4}',
        r'\d{1,2}/\d{1,2}/\d{2,4}'
    ]
    for pattern in date_patterns:
        if re.search(pattern, msg_lower):
            score += 3
            break
    
    # Wedding-related words
    wedding_words = ["casamento", "casar", "noivo", "noiva", "cerimônia", "festa"]
    for word in wedding_words:
        if word in msg_lower:
            score += 1
            break
    
    return min(score, 20)  # Cap at 20


def get_lead_status(score):
    """Get lead status based on score."""
    if score >= 8:
        return "quente"
    elif score >= 4:
        return "morno"
    else:
        return "frio"


def save_or_update_lead(phone_number, message, lead_name=None, wedding_date=None):
    """Save or update a lead in the database."""
    try:
        # Auto-extract name and date if not provided
        if not lead_name or not wedding_date:
            extracted_name, extracted_date = extract_lead_info(message)
            if not lead_name:
                lead_name = extracted_name
            if not wedding_date:
                wedding_date = extracted_date
        
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        # Check if lead exists
        cur.execute("SELECT id, lead_score, lead_name, wedding_date FROM lia_leads WHERE phone_number = %s", (phone_number,))
        result = cur.fetchone()
        
        intent = detect_intent(message)
        new_score = calculate_lead_score(message, result[1] if result else 0)
        lead_status = get_lead_status(new_score)
        
        if result:
            # Update existing lead - only update name/date if we have new values
            lead_id = result[0]
            cur.execute("""
                UPDATE lia_leads 
                SET lead_score = %s, lead_status = %s, intent = %s, 
                    last_contact = NOW(), updated_at = NOW(),
                    lead_name = COALESCE(%s, lead_name),
                    wedding_date = COALESCE(%s, wedding_date)
                WHERE id = %s
            """, (new_score, lead_status, intent, lead_name, wedding_date, lead_id))
            
            # Check if lead became hot (was not hot before)
            old_score = result[1] or 0
            if new_score >= 8 and old_score < 8:
                notify_hot_lead(phone_number, lead_name or result[2], new_score, intent, message_text)
        else:
            # Insert new lead
            cur.execute("""
                INSERT INTO lia_leads (phone_number, lead_name, wedding_date, lead_score, lead_status, intent)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (phone_number, lead_name, wedding_date, new_score, lead_status, intent))
            
            # Notify if first message is already hot
            if new_score >= 8:
                notify_hot_lead(phone_number, lead_name, new_score, intent, message_text)
        
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"Lead saved/updated: {phone_number} | Name: {lead_name} | Date: {wedding_date} | Score: {new_score} | Status: {lead_status} | Intent: {intent}")
        return new_score, lead_status, intent
        
    except Exception as e:
        print(f"Error saving lead: {e}")
        return 0, "novo", "desconhecido"


def send_whatsapp_message(recipient, message):
    """Send a message via the WhatsApp bridge."""
    try:
        # Resolve recipient (handle LIDs)
        recipient = resolve_recipient(recipient)
        
        resp = requests.post(
            f"{BRIDGE_API}/send",
            json={"recipient": recipient, "message": message},
            timeout=10
        )
        result = resp.json()
        print(f"Message sent to {recipient}: {result}")
        return result.get("success", False)
    except Exception as e:
        print(f"Error sending message: {e}")
        return False


def save_lia_response(chat_jid, recipient, incoming_message, response_message, prompt_used, response_time_ms, sent_successfully, error_message=None, lead_score=0, intent_detected=None):
    """Save Lia's response to Neon PostgreSQL."""
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO lia_responses (chat_jid, recipient, incoming_message, response_message, 
                                      prompt_used, response_time_ms, sent_successfully, error_message,
                                      lead_score, intent_detected)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            chat_jid,
            recipient,
            incoming_message,
            response_message,
            prompt_used[:2000] if prompt_used else None,
            response_time_ms,
            sent_successfully,
            error_message,
            lead_score,
            intent_detected
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        print(f"Response saved to Neon for chat {chat_jid}")
        
    except Exception as e:
        print(f"Error saving to Neon: {e}")


class WebhookHandler(BaseHTTPRequestHandler):
    """HTTP handler for incoming webhooks."""

    def do_POST(self):
        if self.path == "/webhook/incoming":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)

            try:
                data = json.loads(body)
                sender = data.get("sender", "")
                message = data.get("message", "")
                chat_jid = data.get("chat_jid", "")

                print(f"\n{'='*50}")
                print(f"Incoming message from {sender}")
                print(f"Message: {message}")
                print(f"Chat JID: {chat_jid}")

                # Add to debounce buffer (will process after DEBOUNCE_SECONDS of silence)
                debouncer.add_message(sender, message, chat_jid)

                # Send 200 OK immediately (don't wait for response generation)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "debounce": True}).encode())

            except Exception as e:
                print(f"Error processing webhook: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """Suppress default HTTP logging."""
        pass


def process_pending_queue():
    """Process any pending messages from previous run."""
    pending = load_from_queue()
    if pending:
        print(f"Processing {len(pending)} pending messages from queue...")
        for msg in pending:
            try:
                # Re-queue with debounce
                debouncer.add_message(msg["sender"], msg["message"], msg["chat_jid"])
                print(f"Re-queued: {msg['sender']}")
            except Exception as e:
                print(f"Error re-queuing message: {e}")


def main():
    config = load_config()
    port = 9090

    if config:
        port = config.get("webhook_port", port)

    print(f"Starting webhook listener on port {port}...")
    print(f"Messages DB: {MESSAGES_DB}")
    print(f"Bridge API: {BRIDGE_API}")
    print(f"Project Dir: {PROJECT_DIR}")
    print(f"Using opencode CLI for response generation")
    print(f"Debounce: {DEBOUNCE_SECONDS}s | Retries: {MAX_RETRIES} | Queue: {QUEUE_FILE}")

    # Verify opencode is available
    try:
        result = subprocess.run(
            [OPENCODE_BIN, "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        print(f"Opencode version: {result.stdout.strip()}")
    except Exception as e:
        print(f"WARNING: Could not verify opencode installation: {e}")

    # Process pending queue from previous run
    process_pending_queue()

    server = HTTPServer(("0.0.0.0", port), WebhookHandler)
    print(f"Listening on http://0.0.0.0:{port}")
    print("Press Ctrl+C to stop")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()
