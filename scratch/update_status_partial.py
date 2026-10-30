with open('app/services/agentic_orchestrator.py', 'r', encoding='utf-8') as f:
    text = f.read()

target = '"status": "unsupported" if is_unresolved else "completed",'
repl = '"status": "unsupported" if is_unresolved else ("partial" if not candidates else "completed"),'

text = text.replace(target, repl)

target_db = 'status="completed",'
repl_db = 'status="unsupported" if is_unresolved else ("partial" if not candidates else "completed"),'

text = text.replace(target_db, repl_db, 1)

with open('app/services/agentic_orchestrator.py', 'w', encoding='utf-8') as f:
    f.write(text)

print("STATUS UPDATED")

