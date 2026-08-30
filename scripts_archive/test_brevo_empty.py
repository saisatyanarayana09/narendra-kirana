import urllib.request
import json

api_key = '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'

req = urllib.request.Request('https://api.brevo.com/v3/smtp/email', method='POST')
req.add_header('api-key', api_key)
req.add_header('Content-Type', 'application/json')
req.add_header('Accept', 'application/json')
req.add_header('User-Agent', 'Mozilla/5.0')

data = json.dumps({
    "sender": {"name": "Narendra Kirana", "email": ""},
    "to": [{"email": "saisatyanarayana2004@gmail.com"}],
    "subject": "Brevo API Integration Successful! 🎉",
    "textContent": "Hello!"
}).encode('utf-8')

try:
    with urllib.request.urlopen(req, data=data, timeout=10) as response:
        print("STATUS:", response.status)
        print("RESPONSE:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
