import urllib.request
import json

try:
    req = urllib.request.Request('http://127.0.0.1:8000/api/v1/store/homepage-sections/')
    with urllib.request.urlopen(req) as response:
        print("SUCCESS:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}:", e.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", str(e))
