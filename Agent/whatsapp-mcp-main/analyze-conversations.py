#!/usr/bin/env python3
"""
Analyze WhatsApp conversations to extract patterns for agent improvement.
Saves results to Neon PostgreSQL for dashboard visualization.
Usage: python3 analyze-conversations.py
"""

import sqlite3
import os
import psycopg2
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, timedelta
import json

MESSAGES_DB = Path(__file__).parent / "whatsapp-bridge" / "store" / "messages.db"
OUTPUT_DIR = Path(__file__).parent / "analysis"

# Neon connection
NEON_URL = "postgresql://neondb_owner:npg_3CZNfguJjvV1@ep-shy-recipe-axgao4na-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Categories for classification
CATEGORIES = {
    "preço": ["preço", "quanto", "valor", "caro", "barato", "custa", "pagamento", "plano"],
    "tecnologia": ["não entendo", "tecnologia", "app", "aplicativo", "complicado", "difícil"],
    "fotógrafo": ["fotógrafo", "foto profissional", "câmera"],
    "localização": ["longe", "distância", "outro estado", "outro cidade"],
    "indeciso": ["pensar", "depois", "não sei", "talvez", "ainda não"],
    "interesse": ["quero", "como funciona", "me mostra", "interesse", "cadê"],
    "agradecimento": ["obrigado", "valeu", "brigado"],
    "objeção": ["não preciso", "não quero", "já tenho", "não serve"],
}

def classify_message(content):
    """Classify a message into categories."""
    if not content:
        return ["outro"]
    
    content_lower = content.lower()
    categories = []
    
    for category, keywords in CATEGORIES.items():
        if any(keyword in content_lower for keyword in keywords):
            categories.append(category)
    
    return categories if categories else ["outro"]

def analyze_conversations():
    """Main analysis function."""
    if not MESSAGES_DB.exists():
        print(f"Database not found: {MESSAGES_DB}")
        return
    
    conn = sqlite3.connect(str(MESSAGES_DB))
    cursor = conn.cursor()
    
    # Get all incoming messages with classification
    cursor.execute("""
        SELECT 
            m.content,
            m.timestamp,
            m.chat_jid,
            c.name
        FROM messages m
        LEFT JOIN chats c ON m.chat_jid = c.jid
        WHERE m.is_from_me = 0 
          AND m.content IS NOT NULL 
          AND m.content != ''
          AND c.jid NOT LIKE '%@g.us'
        ORDER BY m.timestamp DESC
    """)
    
    messages = cursor.fetchall()
    
    # Analyze patterns
    category_counts = Counter()
    category_examples = defaultdict(list)
    hourly_distribution = Counter()
    daily_conversations = defaultdict(set)
    
    for content, timestamp, chat_jid, name in messages:
        categories = classify_message(content)
        
        for category in categories:
            category_counts[category] += 1
            if len(category_examples[category]) < 5:  # Keep 5 examples per category
                category_examples[category].append({
                    "content": content[:200],
                    "timestamp": timestamp,
                    "contact": name or chat_jid
                })
        
        # Time analysis
        if timestamp:
            try:
                dt = datetime.fromisoformat(timestamp.replace("-03:00", "+00:00"))
                hourly_distribution[dt.hour] += 1
                daily_conversations[dt.date()].add(chat_jid)
            except:
                pass
    
    # Generate report
    report = {
        "total_messages": len(messages),
        "unique_contacts": len(set(msg[2] for msg in messages)),
        "category_distribution": dict(category_counts.most_common()),
        "peak_hours": dict(sorted(hourly_distribution.items(), key=lambda x: x[1], reverse=True)[:5]),
        "average_daily_conversations": len(daily_conversations) / max(len(daily_conversations), 1),
        "category_examples": dict(category_examples),
        "recommendations": generate_recommendations(category_counts, category_examples)
    }
    
    # Save report
    OUTPUT_DIR.mkdir(exist_ok=True)
    report_path = OUTPUT_DIR / f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"\nAnálise completa! Relatório salvo em: {report_path}")
    print(f"\nResumo:")
    print(f"- Total de mensagens: {report['total_messages']}")
    print(f"- Contatos únicos: {report['unique_contacts']}")
    print(f"- Média de conversas/dia: {report['average_daily_conversations']:.1f}")
    print(f"\nTop categorias:")
    for cat, count in list(report['category_distribution'].items())[:5]:
        print(f"  - {cat}: {count}")
    
    # Save to Neon
    save_to_neon(report, messages)
    
    return report

def generate_recommendations(category_counts, category_examples):
    """Generate recommendations based on analysis."""
    recommendations = []
    
    total = sum(category_counts.values())
    
    # Price objections
    price_count = category_counts.get("preço", 0)
    if price_count > 0:
        price_pct = (price_count / total) * 100
        if price_pct > 20:
            recommendations.append({
                "type": "skill_update",
                "priority": "high",
                "description": f"Alto volume de objeções de preço ({price_pct:.1f}%). Considerar adicionar mais respostas para objeções de preço na skill."
            })
    
    # Technology objections
    tech_count = category_counts.get("tecnologia", 0)
    if tech_count > 0:
        tech_pct = (tech_count / total) * 100
        if tech_pct > 10:
            recommendations.append({
                "type": "skill_update",
                "priority": "medium",
                "description": f"Clientes com dificuldades técnicas ({tech_pct:.1f}%). Simplificar explicações sobre uso da plataforma."
            })
    
    # Indecision
    indecisive_count = category_counts.get("indeciso", 0)
    if indecisive_count > 0:
        indecisive_pct = (indecisive_count / total) * 100
        if indecisive_pct > 15:
            recommendations.append({
                "type": "skill_update",
                "priority": "medium",
                "description": f"Muitos clientes indecisos ({indecisive_pct:.1f}%). Adicionar mais call-to-action e urgência."
            })
    
    # Interest signals
    interest_count = category_counts.get("interesse", 0)
    if interest_count > 0:
        interest_pct = (interest_count / total) * 100
        if interest_pct > 20:
            recommendations.append({
                "type": "opportunity",
                "priority": "high",
                "description": f"Alto interesse demonstrado ({interest_pct:.1f}%). Oportunidade de aumentar taxa de conversão."
            })
    
    return recommendations

def save_to_neon(report, messages):
    """Save analysis results to Neon PostgreSQL."""
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        # Save analysis results
        cur.execute("""
            INSERT INTO analysis_results (analysis_date, total_messages, unique_contacts, 
                                         category_distribution, hourly_distribution, recommendations)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            datetime.now().date(),
            report['total_messages'],
            report['unique_contacts'],
            json.dumps(report['category_distribution']),
            json.dumps(report['peak_hours']),
            json.dumps(report['recommendations'])
        ))
        
        # Save messages in batches
        batch_size = 100
        conversations_cache = set()
        
        # Get existing conversations
        cur.execute("SELECT chat_jid FROM conversations")
        existing_conversations = set(row[0] for row in cur.fetchall())
        
        for i, (content, timestamp, chat_jid, name) in enumerate(messages):
            if content:
                categories = classify_message(content)
                category = categories[0] if categories else 'outro'
                
                # Insert conversation if new
                if chat_jid not in existing_conversations and chat_jid not in conversations_cache:
                    cur.execute("""
                        INSERT INTO conversations (chat_jid, contact_name, first_message_at, last_message_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (chat_jid) DO NOTHING
                    """, (chat_jid, name, timestamp, timestamp))
                    conversations_cache.add(chat_jid)
                
                # Insert message
                cur.execute("""
                    INSERT INTO messages (message_id, chat_jid, sender, content, timestamp, is_from_me, category)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (
                    f"{chat_jid}_{timestamp}",
                    chat_jid,
                    chat_jid.split('@')[0] if '@' in chat_jid else chat_jid,
                    content[:1000],
                    timestamp,
                    False,
                    category
                ))
                
                # Commit in batches
                if (i + 1) % batch_size == 0:
                    conn.commit()
                    print(f"Processadas {i + 1}/{len(messages)} mensagens...")
        
        conn.commit()
        cur.close()
        conn.close()
        print("Dados salvos no Neon PostgreSQL!")
        return True
        
    except Exception as e:
        print(f"Erro ao salvar no Neon: {e}")
        return False

if __name__ == "__main__":
    analyze_conversations()