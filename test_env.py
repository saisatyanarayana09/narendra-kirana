import urllib.request
import json
import time

url = 'https://narendra-kirana.onrender.com/api/v1/auth/env-check/'

for _ in range(60):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("SUCCESS:", response.read().decode('utf-8'))
                break
    except urllib.error.HTTPError as e:
        print("Waiting for deploy (HTTP Error)...", e.code)
    except Exception as e:
        print("Waiting for deploy...")
    time.sleep(5)
