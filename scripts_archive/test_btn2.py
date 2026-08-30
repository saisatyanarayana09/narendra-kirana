import requests

url = 'http://127.0.0.1:8000/products/generate_description/'
data = {
    'name': 'Test Product',
    'brand': 'Test Brand',
    'category': 'Test Category'
}
try:
    res = requests.post(url, json=data)
    print(res.status_code)
    print(res.text)
except Exception as e:
    print(e)
