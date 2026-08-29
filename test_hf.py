import requests
import base64
import json

# Dummy tiny image
image_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDAT\x08\x99c\xf8\x0f\x04\x00\x09\xfb\x03\xfd\xe3U\xf2\x9c\x00\x00\x00\x00IEND\xaeB\x82'

b64 = base64.b64encode(image_bytes).decode('utf-8')
data_uri = f"data:image/png;base64,{b64}"

try:
    response = requests.post(
        "https://briaai-rmbg-1-4.hf.space/call/predict",
        json={"data": [data_uri]},
        timeout=15
    )
    print("Status:", response.status_code)
except Exception as e:
    print("Error:", e)
