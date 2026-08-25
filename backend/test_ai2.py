import os
import sys

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Provide a mock GEMINI_API_KEY (even if invalid, it will help test the flow)
os.environ['GEMINI_API_KEY'] = 'AIzaSyA_dummy_key_that_will_fail'

from services.ai_product_service import AIProductService

# Dummy image for testing
image_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDAT\x08\x99c\xf8\x0f\x04\x00\x09\xfb\x03\xfd\xe3U\xf2\x9c\x00\x00\x00\x00IEND\xaeB\x82'

try:
    print("Testing analyze_product_image...")
    result = AIProductService.analyze_product_image(image_bytes, "image/png")
    print("Result:", result)
except Exception as e:
    print("Error:", repr(e))
