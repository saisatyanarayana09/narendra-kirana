import urllib.request

req = urllib.request.Request('https://narendra-kirana.onrender.com/api/v1/auth/password-reset/', method='OPTIONS')
req.add_header('Origin', 'https://narendra-kirana.vercel.app')
req.add_header('Access-Control-Request-Method', 'POST')
req.add_header('Access-Control-Request-Headers', 'Content-Type')
req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')

try:
    with urllib.request.urlopen(req) as response:
        print("OPTIONS STATUS:", response.status)
except Exception as e:
    print(e)
