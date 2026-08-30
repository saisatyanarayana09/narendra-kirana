import re

filepath = 'frontend/src/services/api.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',",
    "baseURL: import.meta.env.VITE_API_URL || 'https://narendra-kirana.onrender.com/api/v1',"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
