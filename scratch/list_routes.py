import sys, os
sys.path.insert(0, os.path.abspath("."))
from app.main import app

openapi_schema = app.openapi()
paths = openapi_schema.get("paths", {})
total_endpoints = sum(len(methods) for methods in paths.values())

print(f"Total OpenAPI distinct Paths: {len(paths)}")
print(f"Total OpenAPI Operations (Method+Path): {total_endpoints}")
for path, methods in sorted(paths.items()):
    m_str = ', '.join(sorted(methods.keys())).upper()
    print(f"  {m_str:12s} {path}")
