import os

filepath = 'frontend/index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if "manifest.json" not in content:
    content = content.replace('</title>', '</title>\n    <link rel="manifest" href="/manifest.json" />\n    <meta name="theme-color" content="#059669" />\n    <link rel="apple-touch-icon" href="/favicon.svg" />')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
