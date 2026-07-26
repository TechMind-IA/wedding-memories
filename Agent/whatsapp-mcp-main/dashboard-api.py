#!/usr/bin/env python3
"""
Dashboard API for Wedding Memories Analytics.
Serves data from Neon PostgreSQL and dashboard HTML.
Usage: python3 dashboard-api.py
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import psycopg2
import json
from datetime import datetime, timedelta
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Neon connection
NEON_URL = "postgresql://neondb_owner:npg_3CZNfguJjvV1@ep-shy-recipe-axgao4na-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Dashboard HTML path
DASHBOARD_HTML = Path(__file__).parent / "dashboard.html"

def get_db():
    """Get database connection."""
    return psycopg2.connect(NEON_URL)

@app.route('/')
def serve_dashboard():
    """Serve the dashboard HTML."""
    return send_file(DASHBOARD_HTML)

@app.route('/api/health')
def health():
    """Health check endpoint."""
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return jsonify({"status": "healthy", "database": "connected"})
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

@app.route('/api/stats/overview')
def stats_overview():
    """Get overview statistics."""
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Total messages
        cur.execute("SELECT COUNT(*) FROM messages")
        total_messages = cur.fetchone()[0]
        
        # Total conversations
        cur.execute("SELECT COUNT(*) FROM conversations")
        total_conversations = cur.fetchone()[0]
        
        # Messages today
        cur.execute("SELECT COUNT(*) FROM messages WHERE DATE(timestamp) = CURRENT_DATE")
        messages_today = cur.fetchone()[0]
        
        # Category distribution
        cur.execute("""
            SELECT category, COUNT(*) as count 
            FROM messages 
            WHERE category IS NOT NULL 
            GROUP BY category 
            ORDER BY count DESC
        """)
        categories = {row[0]: row[1] for row in cur.fetchall()}
        
        # Recent analysis
        cur.execute("""
            SELECT analysis_date, total_messages, unique_contacts, recommendations
            FROM analysis_results 
            ORDER BY created_at DESC 
            LIMIT 1
        """)
        latest_analysis = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return jsonify({
            "total_messages": total_messages,
            "total_conversations": total_conversations,
            "messages_today": messages_today,
            "categories": categories,
            "latest_analysis": {
                "date": latest_analysis[0].isoformat() if latest_analysis else None,
                "total_messages": latest_analysis[1] if latest_analysis else 0,
                "unique_contacts": latest_analysis[2] if latest_analysis else 0,
                "recommendations": json.loads(latest_analysis[3]) if latest_analysis and latest_analysis[3] else []
            } if latest_analysis else None
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/conversations')
def list_conversations():
    """List conversations with pagination."""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        offset = (page - 1) * limit
        
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT c.chat_jid, c.contact_name, c.total_messages, 
                   c.last_message_at,
                   (SELECT content FROM messages m WHERE m.chat_jid = c.chat_jid 
                    ORDER BY m.timestamp DESC LIMIT 1) as last_message
            FROM conversations c
            ORDER BY c.last_message_at DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        conversations = []
        for row in cur.fetchall():
            conversations.append({
                "chat_jid": row[0],
                "contact_name": row[1],
                "total_messages": row[2],
                "last_message_at": row[3].isoformat() if row[3] else None,
                "last_message": row[4][:100] if row[4] else None
            })
        
        # Get total count
        cur.execute("SELECT COUNT(*) FROM conversations")
        total = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            "conversations": conversations,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/conversations/<chat_jid>/messages')
def conversation_messages(chat_jid):
    """Get messages for a specific conversation."""
    try:
        limit = request.args.get('limit', 50, type=int)
        
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT sender, content, timestamp, is_from_me, category
            FROM messages 
            WHERE chat_jid = %s 
            ORDER BY timestamp DESC 
            LIMIT %s
        """, (chat_jid, limit))
        
        messages = []
        for row in cur.fetchall():
            messages.append({
                "sender": row[0],
                "content": row[1],
                "timestamp": row[2].isoformat() if row[2] else None,
                "is_from_me": row[3],
                "category": row[4]
            })
        
        cur.close()
        conn.close()
        
        return jsonify({"messages": messages})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analytics/categories')
def analytics_categories():
    """Get category analytics over time."""
    try:
        days = request.args.get('days', 30, type=int)
        
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT DATE(timestamp) as date, category, COUNT(*) as count
            FROM messages 
            WHERE category IS NOT NULL 
              AND timestamp >= NOW() - INTERVAL '%s days'
            GROUP BY DATE(timestamp), category
            ORDER BY date DESC
        """, (days,))
        
        analytics = []
        for row in cur.fetchall():
            analytics.append({
                "date": row[0].isoformat(),
                "category": row[1],
                "count": row[2]
            })
        
        cur.close()
        conn.close()
        
        return jsonify({"analytics": analytics})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/evals')
def list_evals():
    """List evaluation results."""
    try:
        limit = request.args.get('limit', 100, type=int)
        
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT test_case_id, test_name, passed, reason, category, run_date
            FROM evals 
            ORDER BY run_date DESC 
            LIMIT %s
        """, (limit,))
        
        evals = []
        for row in cur.fetchall():
            evals.append({
                "test_case_id": row[0],
                "test_name": row[1],
                "passed": row[2],
                "reason": row[3],
                "category": row[4],
                "run_date": row[5].isoformat() if row[5] else None
            })
        
        # Get pass rate
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed
            FROM evals
            WHERE run_date >= NOW() - INTERVAL '7 days'
        """)
        stats = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return jsonify({
            "evals": evals,
            "stats": {
                "total": stats[0],
                "passed": stats[1],
                "pass_rate": round((stats[1] / stats[0] * 100) if stats[0] > 0 else 0, 1)
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommendations')
def get_recommendations():
    """Get latest recommendations from analysis."""
    try:
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT recommendations, analysis_date
            FROM analysis_results 
            ORDER BY created_at DESC 
            LIMIT 5
        """)
        
        recommendations = []
        for row in cur.fetchall():
            if row[0]:
                recs = json.loads(row[0])
                for rec in recs:
                    rec['analysis_date'] = row[1].isoformat()
                    recommendations.append(rec)
        
        cur.close()
        conn.close()
        
        return jsonify({"recommendations": recommendations})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lia/responses')
def lia_responses():
    """Get Lia's recent responses."""
    try:
        limit = request.args.get('limit', 50, type=int)
        chat_jid = request.args.get('chat_jid', None)
        
        conn = get_db()
        cur = conn.cursor()
        
        if chat_jid:
            cur.execute("""
                SELECT chat_jid, recipient, incoming_message, response_message, 
                       response_time_ms, sent_successfully, created_at
                FROM lia_responses 
                WHERE chat_jid = %s
                ORDER BY created_at DESC 
                LIMIT %s
            """, (chat_jid, limit))
        else:
            cur.execute("""
                SELECT chat_jid, recipient, incoming_message, response_message, 
                       response_time_ms, sent_successfully, created_at
                FROM lia_responses 
                ORDER BY created_at DESC 
                LIMIT %s
            """, (limit,))
        
        responses = []
        for row in cur.fetchall():
            responses.append({
                "chat_jid": row[0],
                "recipient": row[1],
                "incoming_message": row[2],
                "response_message": row[3],
                "response_time_ms": row[4],
                "sent_successfully": row[5],
                "created_at": row[6].isoformat() if row[6] else None
            })
        
        cur.close()
        conn.close()
        
        return jsonify({"responses": responses})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/lia/stats')
def lia_stats():
    """Get Lia's performance statistics."""
    try:
        conn = get_db()
        cur = conn.cursor()
        
        # Total responses
        cur.execute("SELECT COUNT(*) FROM lia_responses")
        total = cur.fetchone()[0]
        
        # Successful responses
        cur.execute("SELECT COUNT(*) FROM lia_responses WHERE sent_successfully = TRUE")
        successful = cur.fetchone()[0]
        
        # Average response time
        cur.execute("SELECT AVG(response_time_ms) FROM lia_responses WHERE response_time_ms IS NOT NULL")
        avg_response_time = cur.fetchone()[0]
        
        # Responses today
        cur.execute("SELECT COUNT(*) FROM lia_responses WHERE DATE(created_at) = CURRENT_DATE")
        today = cur.fetchone()[0]
        
        # Success rate
        success_rate = (successful / total * 100) if total > 0 else 0
        
        cur.close()
        conn.close()
        
        return jsonify({
            "total_responses": total,
            "successful_responses": successful,
            "success_rate": round(success_rate, 1),
            "avg_response_time_ms": round(avg_response_time) if avg_response_time else 0,
            "responses_today": today
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)