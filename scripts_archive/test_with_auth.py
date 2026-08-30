import requests

login_url = 'http://127.0.0.1:8000/api/v1/auth/token/'
login_data = {'email': 'test@test.com', 'password': 'password123'}
res = requests.post(login_url, json=login_data)
token = res.json().get('access')

url = 'http://127.0.0.1:8000/api/v1/products/generate_description/'
headers = {'Authorization': f'Bearer {token}'}
data = {
    'name': 'Test Product',
    'brand': 'Test Brand',
    'category': 'Test Category'
}
res = requests.post(url, json=data, headers=headers)
print(res.status_code)
print(res.text)
