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
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Config
BRIDGE_API = "http://localhost:8080/api"
MESSAGES_DB = Path(__file__).parent / "whatsapp-bridge" / "store" / "messages.db"
CONFIG_FILE = Path(__file__).parent / "auto-reply-config.json"
OPENCODE_BIN = "opencode"
PROJECT_DIR = Path(__file__).parent.parent.parent  # wedding-memories root

# Neon connection
NEON_URL = "postgresql://neondb_owner:npg_3CZNfguJjvV1@ep-shy-recipe-axgao4na-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

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

Precos: Pagamento unico de R$ 200 a R$ 400. Inclui 1 ano de hospedagem, armazenamento e suporte.

Regras:
- Respostas curtas (max 3 linhas)
- Maximo 2 emojis por mensagem
- Nunca e insistente
- Sempre oferece um proximo passo
- Trata objecoes com empatia
- Responda SOMENTE com a mensagem para o cliente, sem explicacoes adicionais"""


def load_config():
    """Load auto-reply configuration."""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return None


def get_chat_history(phone_number, limit=10):
    """Get recent messages from the chat with this phone number."""
    if not MESSAGES_DB.exists():
        return []

    try:
        conn = sqlite3.connect(str(MESSAGES_DB))
        cursor = conn.cursor()

        cursor.execute("""
            SELECT m.timestamp, m.sender, m.content, m.is_from_me
            FROM messages m
            JOIN chats c ON m.chat_jid = c.jid
            WHERE c.jid LIKE ?
            ORDER BY m.timestamp DESC
            LIMIT ?
        """, (f"%{phone_number}%", limit))

        messages = cursor.fetchall()
        conn.close()

        # Reverse to chronological order
        messages.reverse()
        return messages
    except Exception as e:
        print(f"Error reading chat history: {e}")
        return []


def build_prompt(phone_number, incoming_message):
    """Build the full prompt for opencode."""
    history = get_chat_history(phone_number, limit=15)

    prompt = """Carregue a skill 'wedding-sales' usando a tool skill.

Antes de responder, leia a conversa completa com o cliente usando as tools MCP do WhatsApp:
- get_direct_chat_by_contact("{phone_number}") para encontrar o chat
- list_messages(chat_jid=..., limit=30) para ler o historico completo

Analise todo o contexto antes de responder. Entenda o que o cliente ja falou, quais objecoes teve, se ha interesse, etc.

Voce e Lia, assistente virtual do Wedding Memories. Responda SOMENTE com a mensagem para o cliente.

IMPORTANTE - ENVIO DO PDF:
Envie o PDF explicativo quando o cliente:
- Pedir mais informacoes sobre o produto
- Quiser saber como funciona
- Demonstrar interesse em contratar
- Perguntar sobre precos ou planos
- Pedir para ver algo mais detalhado

Para enviar o PDF, use:
send_file(recipient="{phone_number}", media_path="/Users/itallo.rodrigues/wedding-memories/Agent/whatsapp-mcp-main/Wedding Memories.pdf")

Apos enviar o PDF, envie tambem uma mensagem de texto explicando o que ele vai encontrar la.

Se o cliente so estiver cumprimentando ou fazendo uma pergunta simples, NAO envie o PDF. Envie apenas quando fizer sentido no contexto da conversa.
"""
    prompt += f"Numero do cliente: {phone_number}\n"
    prompt += f"Mensagem atual: {incoming_message}\n"
    prompt += "\nResponda como Lia. Somente a mensagem para o cliente:"

    return prompt


def generate_response_with_opencode(prompt):
    """Generate response using opencode CLI."""
    try:
        result = subprocess.run(
            [OPENCODE_BIN, "run", prompt],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(PROJECT_DIR)
        )

        if result.returncode == 0:
            response = result.stdout.strip()
            # Clean up opencode output (remove ANSI codes, logos, etc.)
            lines = response.split("\n")
            # Find the actual response (skip header/footer noise)
            meaningful_lines = []
            capture = False
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
        print("Opencode timed out after 60s")
        return None
    except FileNotFoundError:
        print("opencode binary not found. Make sure it's installed.")
        return None
    except Exception as e:
        print(f"Error calling opencode: {e}")
        return None


def generate_response(context):
    """Generate response using opencode."""
    return generate_response_with_opencode(context)


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


def save_lia_response(chat_jid, recipient, incoming_message, response_message, prompt_used, response_time_ms, sent_successfully, error_message=None):
    """Save Lia's response to Neon PostgreSQL."""
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO lia_responses (chat_jid, recipient, incoming_message, response_message, 
                                      prompt_used, response_time_ms, sent_successfully, error_message)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            chat_jid,
            recipient,
            incoming_message,
            response_message,
            prompt_used[:2000] if prompt_used else None,
            response_time_ms,
            sent_successfully,
            error_message
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

                # Build context and generate response
                prompt = build_prompt(sender, message)
                
                # Track response time
                start_time = time.time()
                response = generate_response(prompt)
                response_time_ms = int((time.time() - start_time) * 1000)

                if response:
                    print(f"Generated response: {response}")
                    
                    # Send response
                    sent_successfully = send_whatsapp_message(sender, response)
                    
                    # Save to Neon
                    save_lia_response(
                        chat_jid=chat_jid,
                        recipient=sender,
                        incoming_message=message,
                        response_message=response,
                        prompt_used=prompt,
                        response_time_ms=response_time_ms,
                        sent_successfully=sent_successfully,
                        error_message=None if sent_successfully else "Failed to send"
                    )
                else:
                    print("Could not generate response")
                    # Save failed attempt
                    save_lia_response(
                        chat_jid=chat_jid,
                        recipient=sender,
                        incoming_message=message,
                        response_message=None,
                        prompt_used=prompt,
                        response_time_ms=response_time_ms,
                        sent_successfully=False,
                        error_message="No response generated"
                    )

                # Send 200 OK
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok"}).encode())

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
