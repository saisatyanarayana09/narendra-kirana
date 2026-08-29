import urllib.request
import json

url = 'https://narendra-kirana.onrender.com/api/v1/auth/password-reset/'
data = json.dumps({"email": "saisatyanarayana2004@gmail.com"}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        print("RESPONSE:", response.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
