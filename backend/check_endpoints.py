import os
import re
import sys

frontend_dir = r"d:\SunEdge\CRM\CRM-\frontend\app"
backend_router_dir = r"d:\SunEdge\CRM\CRM-\backend\app\routers"

api_calls = set()
frontend_pattern = re.compile(r"api\.(get|post|put|delete|patch)\((['\`\"])(.*?)\2")

for root, dirs, files in os.walk(frontend_dir):
    for f in files:
        if f.endswith('.jsx') or f.endswith('.js'):
            with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
                for m, _, endpoint in frontend_pattern.findall(content):
                    endpoint = re.sub(r'\$\{.*?\}', '*', endpoint)
                    endpoint = endpoint.split('?')[0]
                    api_calls.add(f"{m.upper()} {endpoint}")

backend_routes = set()
backend_pattern = re.compile(r"@(?:router|app)\.(get|post|put|delete|patch)\((['\"])(.*?)\2")

for root, dirs, files in os.walk(backend_router_dir):
    for f in files:
        if f.endswith('.py'):
            prefix = ""
            if f == "auth.py": prefix = "/api/auth"
            elif f == "users.py": prefix = "/api/users"
            elif f == "leads.py": prefix = "/api/leads"
            elif f == "tasks.py": prefix = "/api/tasks"
            elif f == "clients.py": prefix = "/api/clients"
            elif f == "follow_ups.py": prefix = "/api/follow-ups"
            elif f == "manager.py": prefix = "/api/manager"
            elif f == "md.py": prefix = "/api/md"
            elif f == "purchase.py": prefix = "/api/purchase"
            elif f == "invoices.py": prefix = "/api/invoices"
            elif f == "admin.py": prefix = "/api/admin"
            elif f == "ledgers.py": prefix = "/api/ledgers"
            elif f == "leaves.py": prefix = "/api/leaves"
            elif f == "platform.py": prefix = "/platform"
            elif f == "export.py": prefix = "/api/export"
            elif f == "search.py": prefix = "/api/search"
            elif f == "timeline.py": prefix = "/api/timeline"
            
            with open(os.path.join(root, f), 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
                if f == "ledgers.py":
                    p_match = re.search(r"prefix=['\"](.*?)['\"]", content)
                    if p_match: prefix = p_match.group(1)

                for m, _, path in backend_pattern.findall(content):
                    full_path = prefix + path
                    if full_path.endswith('/') and len(full_path) > 1:
                        full_path = full_path[:-1]
                    full_path = re.sub(r'\{.*?\}', '*', full_path)
                    backend_routes.add(f"{m.upper()} {full_path}")

unmatched = []
for f_call in sorted(list(api_calls)):
    method, path = f_call.split(' ', 1)
    if f_call in backend_routes:
        continue
    
    prefixed_path = "/api" + path if path.startswith('/') else "/api/" + path
    if f"{method} {prefixed_path}" in backend_routes:
        continue
        
    plat_path = "/platform" + path if path.startswith('/') else "/platform/" + path
    if f"{method} {plat_path}" in backend_routes:
        continue

    unmatched.append(f_call)

with open('unmatched_endpoints.txt', 'w', encoding='utf-8') as out:
    for u in unmatched:
        out.write(u + '\n')
