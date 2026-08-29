import urllib.request
import json
import time

url = 'https://narendra-kirana.onrender.com/api/v1/auth/get-reset-link/'
data = json.dumps({"email": "saisatyanarayana2004@gmail.com"}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

for _ in range(60):
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("SUCCESS:", response.read().decode('utf-8'))
                break
    except Exception as e:
        print("Waiting for deploy...")
    time.sleep(5)
