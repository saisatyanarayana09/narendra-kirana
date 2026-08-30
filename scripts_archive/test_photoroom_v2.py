import requests
import io
from PIL import Image

API_KEY = "sandbox_sk_pr_default_3e95fc6c32c8f8e80d6f4a53034e657cab7388df"
url = "https://image-api.photoroom.com/v2/edit"

# Create dummy image
image = Image.new('RGB', (200, 200), color = 'red')
img_byte_arr = io.BytesIO()
image.save(img_byte_arr, format='JPEG')
image_bytes = img_byte_arr.getvalue()

headers = {
    "x-api-key": API_KEY
}
files = {
    'imageFile': ('image.jpg', image_bytes, 'image/jpeg')
}
data = {
    'background.color': '#FFFFFF',
    'shadow.mode': 'ai.soft'
}

try:
    response = requests.post(url, headers=headers, files=files, data=data)
    print("Status:", response.status_code)
    if response.status_code == 200:
        print("Success! Size:", len(response.content))
    else:
        print("Error response:", response.text)
except Exception as e:
    print("Exception:", e)
