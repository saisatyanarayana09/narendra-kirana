import urllib.request
try:
    req = urllib.request.Request('https://narendra-kirana.onrender.com/health/')
    with urllib.request.urlopen(req) as response:
        print("Woke up Render! STATUS:", response.status)
except Exception as e:
    print(e)
