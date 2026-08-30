import urllib.request
import urllib.error

urls = [
    'https://narendra-kirana.koyeb.app/api/v1/health/',
    'https://narendra-kirana-api.koyeb.app/api/v1/health/',
    'https://smart-kirana.koyeb.app/api/v1/health/',
]

for url in urls:
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            print(url, "STATUS:", response.status)
    except Exception as e:
        print(url, e)
