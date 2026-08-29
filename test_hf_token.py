import requests
import io
from PIL import Image

HF_TOKEN = "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"

# Create a small red image
image = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
image.save(img_byte_arr, format='JPEG')
image_bytes = img_byte_arr.getvalue()

try:
    response = requests.post(
        "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
        headers={"Authorization": f"Bearer {HF_TOKEN}"},
        data=image_bytes
    )
    print("Status:", response.status_code)
    if response.status_code == 200:
        print("Success! Received bytes:", len(response.content))
    else:
        print("Response:", response.text[:200])
except Exception as e:
    print("Error:", e)
