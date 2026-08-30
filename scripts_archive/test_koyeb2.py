import urllib.request
urls = [
    'https://narendra-kirana-backend.koyeb.app/api/v1/health/',
    'https://narendra-kirana.up.railway.app/api/v1/health/',
    'https://smart-kirana-api.koyeb.app/api/v1/health/',
    'https://smart-kirana-backend.koyeb.app/api/v1/health/',
]
for url in urls:
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            print(url, "STATUS:", response.status)
    except Exception as e:
        print(url, e)
