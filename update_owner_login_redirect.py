with open('frontend/src/owner/pages/Login.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("navigate('/owner');", "navigate('/owner/welcome');")

with open('frontend/src/owner/pages/Login.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
