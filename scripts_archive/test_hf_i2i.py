import os
import requests
import io
from PIL import Image
import base64

HF_TOKEN = "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"

# Create a small image
image = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
image.save(img_byte_arr, format='JPEG')
image_bytes = img_byte_arr.getvalue()
image_b64 = base64.b64encode(image_bytes).decode('utf-8')

API_URL = "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix"
headers = {"Authorization": f"Bearer {HF_TOKEN}"}

# For instruct-pix2pix, input is usually {"inputs": "prompt", "image": "base64..."}
# Wait, let's check the exact payload format for image-to-image.
# Actually, the Inference API for instruct-pix2pix might be different.
payload = {
    "inputs": "Make it a professional studio photo",
    "image": image_b64
}
try:
    response = requests.post(API_URL, headers=headers, json=payload)
    print("Status:", response.status_code)
    print("Content:", response.text[:200])
except Exception as e:
    print("Error:", e)
