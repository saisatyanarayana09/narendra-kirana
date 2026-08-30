import os

filepath = 'frontend/src/ForgotPassword.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target = "setMessage(err.response?.data?.error || (err.response ? Server Error () : err.message) || 'Something went wrong. Please try again.');"
replacement = "setMessage(err.response?.data?.error || (err.response ? 'Server Error (' + err.response.status + ')' : err.message) || 'Something went wrong. Please try again.');"

content = content.replace(target, replacement)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
