#!/usr/bin/env python3
"""
Hybrid eval system for Wedding Memories sales agent.
Runs automatically after conversations or manually on demand.
Saves results to Neon PostgreSQL.
Usage: 
  python3 evals-hybrid.py              # Run evals manually
  python3 evals-hybrid.py --auto       # Run automatic evals
  python3 evals-hybrid.py --status     # Check eval status
"""

import json
import subprocess
import sys
import psycopg2
from pathlib import Path
from datetime import datetime, timedelta
import argparse

TEST_CASES_FILE = Path(__file__).parent / "evals" / "test-cases.json"
NEON_URL = "postgresql://neondb_owner:npg_3CZNfguJjvV1@ep-shy-recipe-axgao4na-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def load_test_cases():
    """Load test cases from JSON file."""
    with open(TEST_CASES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def run_agent(test_input):
    """Run the agent with a test input and return the response."""
    try:
        prompt = f"""Carregue a skill 'wedding-sales' usando a tool skill.

Você é Lia, assistente virtual do Wedding Memories. Responda SOMENTE com a mensagem para o cliente.

IMPORTANTE - Responda de forma natural e consultiva, como uma vendedora humana faria.

Numero do cliente: 00000000000
Mensagem atual: {test_input}

Responda como Lia. Somente a mensagem para o cliente:"""
        
        result = subprocess.run(
            ["opencode", "run", prompt],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(Path(__file__).parent.parent)
        )
        
        if result.returncode == 0:
            response = result.stdout.strip()
            lines = response.split("\n")
            meaningful_lines = []
            for line in lines:
                if any(skip in line for skip in ["▄", "█", "▀", "OpenCode", "opencode", "Commands:", "Positionals:"]):
                    continue
                if line.strip():
                    meaningful_lines.append(line.strip())
            
            return "\n".join(meaningful_lines) if meaningful_lines else response
        else:
            return None
            
    except subprocess.TimeoutExpired:
        print(f"Timeout for input: {test_input[:50]}...")
        return None
    except Exception as e:
        print(f"Error running agent: {e}")
        return None

def evaluate_response(response, test_case):
    """Evaluate if a response meets the test case criteria."""
    if not response:
        return {"passed": False, "reason": "No response generated"}
    
    response_lower = response.lower()
    
    # Check expected_contains
    for term in test_case.get("expected_contains", []):
        if term.lower() not in response_lower:
            return {"passed": False, "reason": f"Missing expected term: '{term}'"}
    
    # Check expected_not_contains
    for term in test_case.get("expected_not_contains", []):
        if term.lower() in response_lower:
            return {"passed": False, "reason": f"Contains forbidden term: '{term}'"}
    
    return {"passed": True, "reason": "All criteria met"}

def save_eval_to_neon(test_case_id, test_name, input_text, response_text, passed, reason, category):
    """Save eval result to Neon PostgreSQL."""
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        cur.execute("""
            INSERT INTO evals (test_case_id, test_name, input_text, response_text, 
                              passed, reason, category, run_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            test_case_id,
            test_name,
            input_text,
            response_text,
            passed,
            reason,
            category,
            datetime.now()
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error saving to Neon: {e}")
        return False

def run_evals_manually():
    """Run evals manually (all test cases)."""
    print("Rodando evals manualmente...\n")
    
    test_cases = load_test_cases()
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"[{i}/{len(test_cases)}] {test_case['name']}...")
        
        response = run_agent(test_case["input"])
        evaluation = evaluate_response(response, test_case)
        
        # Save to Neon
        save_eval_to_neon(
            test_case_id=test_case["id"],
            test_name=test_case["name"],
            input_text=test_case["input"],
            response_text=response,
            passed=evaluation["passed"],
            reason=evaluation["reason"],
            category=test_case.get("category", "unknown")
        )
        
        results.append({
            "test_case": test_case["id"],
            "name": test_case["name"],
            "passed": evaluation["passed"],
            "reason": evaluation["reason"]
        })
        
        status = "✓" if evaluation["passed"] else "✗"
        print(f"  {status} {evaluation['reason']}")
        if response:
            print(f"  Resposta: {response[:80]}...")
        print()
    
    # Summary
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    
    print("\n" + "="*50)
    print("RESUMO DOS EVALS")
    print("="*50)
    print(f"Total: {total}")
    print(f"Aprovados: {passed}")
    print(f"Reprovados: {total - passed}")
    print(f"Taxa de aprovação: {(passed/total*100):.1f}%")
    
    return results

def run_evals_automatically():
    """Run evals automatically (sample of test cases based on recent conversations)."""
    print("Rodando evals automáticos...\n")
    
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        # Check when was the last automatic eval
        cur.execute("""
            SELECT MAX(run_date) FROM evals 
            WHERE test_case_id LIKE 'auto_%'
        """)
        last_run = cur.fetchone()[0]
        
        # Run if never run before or last run was more than 24 hours ago
        if last_run and (datetime.now() - last_run).total_seconds() < 86400:
            print(f"Último eval automático: {last_run}")
            print("Próximo eval em: 24 horas")
            cur.close()
            conn.close()
            return []
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Error checking last run: {e}")
    
    # Select a sample of test cases to run
    test_cases = load_test_cases()
    sample_size = min(5, len(test_cases))  # Run 5 tests
    sample = test_cases[:sample_size]
    
    results = []
    
    for test_case in sample:
        print(f"Auto-eval: {test_case['name']}...")
        
        response = run_agent(test_case["input"])
        evaluation = evaluate_response(response, test_case)
        
        # Save to Neon with auto_ prefix
        save_eval_to_neon(
            test_case_id=f"auto_{test_case['id']}",
            test_name=test_case["name"],
            input_text=test_case["input"],
            response_text=response,
            passed=evaluation["passed"],
            reason=evaluation["reason"],
            category=test_case.get("category", "unknown")
        )
        
        results.append({
            "test_case": test_case["id"],
            "passed": evaluation["passed"]
        })
        
        status = "✓" if evaluation["passed"] else "✗"
        print(f"  {status} {evaluation['reason']}")
    
    # Summary
    passed = sum(1 for r in results if r["passed"])
    print(f"\nEvals automáticos: {passed}/{len(results)} aprovados")
    
    return results

def get_eval_status():
    """Get current eval status."""
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        # Total evals
        cur.execute("SELECT COUNT(*) FROM evals")
        total = cur.fetchone()[0]
        
        # Passed evals (last 7 days)
        cur.execute("""
            SELECT COUNT(*) FROM evals 
            WHERE passed = TRUE 
              AND run_date >= NOW() - INTERVAL '7 days'
        """)
        passed_week = cur.fetchone()[0]
        
        # Total evals (last 7 days)
        cur.execute("""
            SELECT COUNT(*) FROM evals 
            WHERE run_date >= NOW() - INTERVAL '7 days'
        """)
        total_week = cur.fetchone()[0]
        
        # Last eval
        cur.execute("SELECT MAX(run_date) FROM evals")
        last_eval = cur.fetchone()[0]
        
        # Category performance
        cur.execute("""
            SELECT category, 
                   COUNT(*) as total,
                   SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed
            FROM evals 
            WHERE run_date >= NOW() - INTERVAL '30 days'
            GROUP BY category
        """)
        categories = {row[0]: {"total": row[1], "passed": row[2]} for row in cur.fetchall()}
        
        cur.close()
        conn.close()
        
        print("\n" + "="*50)
        print("STATUS DOS EVALS")
        print("="*50)
        print(f"Total de evals: {total}")
        print(f"Evals (últimos 7 dias): {total_week}")
        print(f"Aprovados (últimos 7 dias): {passed_week}")
        print(f"Taxa de aprovação: {(passed_week/total_week*100) if total_week > 0 else 0:.1f}%")
        print(f"Último eval: {last_eval}")
        
        if categories:
            print("\nPor categoria:")
            for cat, stats in categories.items():
                rate = (stats['passed']/stats['total']*100) if stats['total'] > 0 else 0
                print(f"  - {cat}: {stats['passed']}/{stats['total']} ({rate:.0f}%)")
        
        return {
            "total": total,
            "total_week": total_week,
            "passed_week": passed_week,
            "last_eval": last_eval,
            "categories": categories
        }
        
    except Exception as e:
        print(f"Error getting status: {e}")
        return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hybrid eval system for Lia agent")
    parser.add_argument("--auto", action="store_true", help="Run automatic evals")
    parser.add_argument("--status", action="store_true", help="Check eval status")
    parser.add_argument("--manual", action="store_true", help="Run evals manually (default)")
    
    args = parser.parse_args()
    
    if args.status:
        get_eval_status()
    elif args.auto:
        run_evals_automatically()
    else:
        run_evals_manually()