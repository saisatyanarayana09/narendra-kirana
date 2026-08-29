import urllib.request

req = urllib.request.Request('https://narendra-kirana.onrender.com/api/v1/auth/password-reset/', method='OPTIONS')
req.add_header('Origin', 'https://narendra-kirana.vercel.app')
req.add_header('Access-Control-Request-Method', 'POST')
req.add_header('Access-Control-Request-Headers', 'Content-Type')

try:
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        print("HEADERS:", response.headers)
except Exception as e:
    print(e)
