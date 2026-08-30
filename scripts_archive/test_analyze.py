import requests

login_url = 'http://127.0.0.1:8000/api/v1/auth/login/'
login_data = {'email': 'test@test.com', 'password': 'password123'}
res = requests.post(login_url, json=login_data)

if res.status_code != 200:
    print('Login failed:', res.text)
    # Let's create the user again if needed
    import os
    os.system('python backend/manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(email=\'test@test.com\').delete(); user = User.objects.create_superuser(\'test@test.com\', \'password123\'); user.save()"')
    res = requests.post(login_url, json=login_data)

token = res.json().get('access')

url = 'http://127.0.0.1:8000/api/v1/products/analyze_image/'
headers = {'Authorization': f'Bearer {token}'}

# Create a dummy image
with open('dummy.jpg', 'wb') as f:
    f.write(b'\xFF\xD8\xFF\xE0\x00\x10\x4A\x46\x49\x46\x00\x01')

files = {'imageFront': ('dummy.jpg', open('dummy.jpg', 'rb'), 'image/jpeg')}

res = requests.post(url, headers=headers, files=files)
print(res.status_code)
print(res.text)
