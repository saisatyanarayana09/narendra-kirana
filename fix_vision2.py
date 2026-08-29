import re

filepath = "backend/products/views.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

bad_vision = '''        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            
            # Use gemini-1.5-flash-latest for fast multimodal tasks
            model = genai.GenerativeModel('gemini-1.5-flash-latest')
            
            image_data = {
                "mime_type": image_file.content_type or 'image/jpeg',
                "data": image_file.read()
            }
            
            prompt = \"\"\"
            Analyze this product image and extract the following details in raw JSON format (no markdown tags, no code blocks):
            {
              "name": "Product Name (e.g. Tide Plus Jasmine & Rose)",
              "brand": "Brand Name (e.g. Tide)",
              "unit": "Size/Weight (e.g. 1kg, 500ml)",
              "description": "A very brief 1-sentence description."
            }
            If you cannot identify the product, return {"error": "Could not identify product"}
            \"\"\"
            
            response = model.generate_content([prompt, image_data])'''

good_vision = '''        try:
            from services.ai_product_service import AIProductService
            
            prompt = \"\"\"
            Analyze this product image and extract the following details in raw JSON format (no markdown tags, no code blocks):
            {
              "name": "Product Name (e.g. Tide Plus Jasmine & Rose)",
              "brand": "Brand Name (e.g. Tide)",
              "unit": "Size/Weight (e.g. 1kg, 500ml)",
              "description": "A very brief 1-sentence description."
            }
            If you cannot identify the product, return {"error": "Could not identify product"}
            \"\"\"
            
            response = AIProductService._generate_with_fallback(prompt, image_file.read(), image_file.content_type or 'image/jpeg')'''

if bad_vision in content:
    content = content.replace(bad_vision, good_vision)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed vision_lookup to use fallback")
else:
    print("Could not find bad_vision block")
