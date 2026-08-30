import requests
import io
from PIL import Image

# Create a dummy image
img = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_bytes = img_byte_arr.getvalue()

from backend.services.image_enhancement_service import ImageEnhancementService
try:
    result, mime = ImageEnhancementService.enhance_product_image(img_bytes)
    print('Enhancement service works! Result size:', len(result))
except Exception as e:
    print('Enhancement service failed:', e)
