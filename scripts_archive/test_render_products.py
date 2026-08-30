import urllib.request
try:
    req = urllib.request.Request('https://narendra-kirana.onrender.com/api/v1/products/')
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        content = response.read().decode('utf-8')
        print("CONTENT PREVIEW:", content[:200])
except Exception as e:
    print(e)
