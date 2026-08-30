import urllib.request
import urllib.error
import json

req = urllib.request.Request('https://narendra-kirana.onrender.com/api/v1/auth/password-reset/', data=json.dumps({"email": "test@example.com"}).encode('utf-8'), headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        print(response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("STATUS:", e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print(e)
