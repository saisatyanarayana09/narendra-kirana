import urllib.request
import time

for i in range(5):
    try:
        req = urllib.request.Request('https://narendra-kirana.onrender.com/health/')
        with urllib.request.urlopen(req) as response:
            print("STATUS:", response.status)
    except Exception as e:
        print("ERROR:", e)
    time.sleep(1)
