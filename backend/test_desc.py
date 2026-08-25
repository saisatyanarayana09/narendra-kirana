import os
import sys

# Provide a mock GEMINI_API_KEY (so fallback doesn't crash immediately on load)
os.environ['GEMINI_API_KEY'] = 'AIzaSyA_dummy_key'

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from services.ai_product_service import AIProductService

# Test Description
sys.stdout.reconfigure(encoding='utf-8')
print("Testing generate_description...")
result = AIProductService.generate_description({"name": "Aashirvaad Atta", "brand": "Aashirvaad", "unit": "5 kg"})
print("Result:", result)
