#!/usr/bin/env python3
"""
Run evals for the Wedding Memories sales agent.
Saves results to Neon PostgreSQL.
Usage: python3 run-evals.py
"""

import json
import subprocess
import sys
import psycopg2
from pathlib import Path
from datetime import datetime

TEST_CASES_FILE = Path(__file__).parent / "evals" / "test-cases.json"
RESULTS_DIR = Path(__file__).parent / "evals" / "results"

# Neon connection
NEON_URL = "postgresql://neondb_owner:npg_3CZNfguJjvV1@ep-shy-recipe-axgao4na-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

def load_test_cases():
    """Load test cases from JSON file."""
    with open(TEST_CASES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def run_agent(test_input):
    """Run the agent with a test input and return the response."""
    try:
        # Build the prompt similar to webhook-listener.py
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
            # Clean up the response
            response = result.stdout.strip()
            # Remove ANSI codes and opencode branding
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
        return {
            "passed": False,
            "reason": "No response generated"
        }
    
    response_lower = response.lower()
    
    # Check expected_contains
    expected_contains = test_case.get("expected_contains", [])
    for term in expected_contains:
        if term.lower() not in response_lower:
            return {
                "passed": False,
                "reason": f"Missing expected term: '{term}'"
            }
    
    # Check expected_not_contains
    expected_not_contains = test_case.get("expected_not_contains", [])
    for term in expected_not_contains:
        if term.lower() in response_lower:
            return {
                "passed": False,
                "reason": f"Contains forbidden term: '{term}'"
            }
    
    return {
        "passed": True,
        "reason": "All criteria met"
    }

def run_evals():
    """Run all evals and generate report."""
    print("Iniciando evals do agent Lia...\n")
    
    test_cases = load_test_cases()
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"[{i}/{len(test_cases)}] {test_case['name']}...")
        
        # Run agent
        response = run_agent(test_case["input"])
        
        # Evaluate
        evaluation = evaluate_response(response, test_case)
        
        result = {
            "test_case": test_case["id"],
            "name": test_case["name"],
            "input": test_case["input"],
            "response": response,
            "passed": evaluation["passed"],
            "reason": evaluation["reason"],
            "category": test_case.get("category", "unknown")
        }
        results.append(result)
        
        status = "✓" if evaluation["passed"] else "✗"
        print(f"  {status} {evaluation['reason']}")
        if response:
            print(f"  Resposta: {response[:100]}...")
        print()
    
    # Generate report
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": f"{(passed/total*100):.1f}%"
        },
        "results": results,
        "failed_cases": [r for r in results if not r["passed"]]
    }
    
    # Save report
    RESULTS_DIR.mkdir(exist_ok=True)
    report_path = RESULTS_DIR / f"eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print("\n" + "="*50)
    print("RESUMO DOS EVALS")
    print("="*50)
    print(f"Total: {total}")
    print(f"Aprovados: {passed}")
    print(f"Reprovados: {failed}")
    print(f"Taxa de aprovação: {report['summary']['pass_rate']}")
    print(f"\nRelatório salvo em: {report_path}")
    
    # Save to Neon
    save_evals_to_neon(results)
    
    if failed > 0:
        print("\nCasos reprovados:")
        for r in results:
            if not r["passed"]:
                print(f"  - {r['name']}: {r['reason']}")
    
    return report

def save_evals_to_neon(results):
    """Save evaluation results to Neon PostgreSQL."""
    try:
        conn = psycopg2.connect(NEON_URL)
        cur = conn.cursor()
        
        for result in results:
            cur.execute("""
                INSERT INTO evals (test_case_id, test_name, input_text, response_text, 
                                  passed, reason, category, run_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                result['test_case'],
                result['name'],
                result['input'],
                result.get('response', ''),
                result['passed'],
                result['reason'],
                result['category'],
                datetime.now()
            ))
        
        conn.commit()
        cur.close()
        conn.close()
        print("Evals salvos no Neon PostgreSQL!")
        
    except Exception as e:
        print(f"Erro ao salvar evals no Neon: {e}")

if __name__ == "__main__":
    run_evals()