import os
import requests
import io
from PIL import Image

# Dummy tiny image
image = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
image.save(img_byte_arr, format='JPEG')
image_bytes = img_byte_arr.getvalue()

HF_TOKEN = "hf_dummy" # Need a real token to test, I'll use a public one if possible, or just check the docs.
# Actually, I'll test it without token first, some models allow free public access (rate limited).
try:
    response = requests.post(
        "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
        headers={"Authorization": "Bearer hf_test"}, # Fake token will fail
        data=image_bytes
    )
    print("Status:", response.status_code)
    print("Content:", response.text[:200])
except Exception as e:
    print("Error:", e)
