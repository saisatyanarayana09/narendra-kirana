import os
import sys
import logging

# Setup basic logging
logging.basicConfig(level=logging.DEBUG)

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

os.environ['GEMINI_API_KEY'] = 'fake_key'

try:
    from services.ai_product_service import AIProductService
    from services.image_enhancement_service import ImageEnhancementService
    print("Imports successful!")
except Exception as e:
    print("IMPORT ERROR:", e)

# Test Image Enhance
try:
    print("\n--- Testing Enhance ---")
    image_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0bIDAT\x08\x99c\xf8\x0f\x04\x00\x09\xfb\x03\xfd\xe3U\xf2\x9c\x00\x00\x00\x00IEND\xaeB\x82'
    out, mime = ImageEnhancementService.enhance_product_image(image_bytes)
    print("Enhance success! Bytes out:", len(out))
except Exception as e:
    print("ENHANCE ERROR:", e)

# Test Groq Generate Description
try:
    print("\n--- Testing Groq ---")
    desc = AIProductService.generate_description({"name": "Test"})
    print("Desc:", desc)
except Exception as e:
    print("GROQ ERROR:", e)

