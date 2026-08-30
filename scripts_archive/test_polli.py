import requests

try:
    url = "https://image.pollinations.ai/prompt/Professional%20product%20shot?width=1024&height=1024&nologo=true"
    response = requests.get(url, timeout=15)
    print("Status:", response.status_code)
    print("Content-Type:", response.headers.get("Content-Type"))
except Exception as e:
    print("Error:", e)
