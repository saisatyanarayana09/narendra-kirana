import re

filepath = 'backend/services/ai_product_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Groq Description Prompt
old_groq_prompt = '''            prompt = f\"\"\"
            Write a professional, concise, and engaging e-commerce description for a grocery product.
            Product Details:
            - Name: {name}
            - Brand: {brand}
            - Category: {category}
            - Size/Unit: {unit}
            
            Rules:
            1. Keep it under 3-4 sentences.
            2. Do not invent health claims, nutritional info, or ingredients not typical for this product.
            3. Make it friendly for a local Indian Kirana/Supermarket audience.
            4. Return ONLY the description text, no quotes or intro.
            \"\"\"'''

new_groq_prompt = '''            prompt = f\"\"\"
            Write a professional, concise, and engaging e-commerce description for a grocery product.
            Product Details:
            - Name: {name}
            - Brand: {brand}
            - Category: {category}
            - Size/Unit: {unit}
            
            Rules:
            1. Keep it under 3-4 sentences.
            2. Do not invent health claims, nutritional info, or ingredients not typical for this product.
            3. Make it friendly for a local Indian Kirana/Supermarket audience.
            4. ABSOLUTELY NO MARKDOWN. Do not use asterisks (**), bolding, bullet points, or hashes. 
            5. Return pure plain text only. No quotes, no intro, no emojis.
            \"\"\"'''
content = content.replace(old_groq_prompt, new_groq_prompt)

# 2. Update Gemini analyze_product_image to handle multiple images
old_analyze_def = '''    def analyze_product_image(image_bytes, mime_type='image/jpeg'):
        try:
            logger.info("Initializing Gemini Vision for product analysis...")
            prompt = \"\"\"
            Analyze this product image carefully. Extract and return ONLY a valid JSON object.
            Do not include Markdown blocks (`json) or any conversational text.
            
            Extract the following fields if visible (return null if not visible):
            {
                "name": "Product name without brand",
                "brand": "Brand or manufacturer name",
                "category": "One of: Grocery, Snacks, Beverages, Personal Care, Household, Other",
                "unit": "Size or weight (e.g., 1 kg, 500 g, 1 L)",
                "price": "Numerical MRP or price if visible (e.g., 50.00)",
                "sku": "Barcode number or product code if visible",
                "expiry_date": "Expiry or Best Before date if visible",
                "stock": 10
            }
            \"\"\"
            
            image_parts = [
                {
                    "mime_type": mime_type,
                    "data": image_bytes
                }
            ]
            
            response = AIProductService._generate_with_fallback([prompt, image_parts[0]])'''

new_analyze_def = '''    def analyze_product_image(images_data):
        \"\"\"
        images_data is a list of dicts: [{'bytes': b'...', 'mime': 'image/jpeg'}, ...]
        \"\"\"
        try:
            logger.info(f"Initializing Gemini Vision with {len(images_data)} images for product analysis...")
            prompt = \"\"\"
            Analyze these product images carefully (front and back of packaging). Extract and return ONLY a valid JSON object.
            Do not include Markdown blocks (`json) or any conversational text.
            Be EXTREMELY accurate. Read the smallest text for ingredients, barcodes, and MRP.
            
            Extract the following fields if visible (return null if not visible):
            {
                "name": "Exact product name (without brand)",
                "brand": "Exact Brand or manufacturer name",
                "category": "One of: Grocery, Snacks, Beverages, Personal Care, Household, Other",
                "unit": "Size or weight (e.g., 1 kg, 500 g, 1 L)",
                "regular_price": "Numerical MRP if visible (e.g., 50.00)",
                "sku": "Extract the exact Barcode number (EAN/UPC) if visible. Look for 13 or 8 digit numbers under the barcode lines.",
                "expiry_date": "Expiry, Use By, or Best Before date if visible",
                "stock": 10
            }
            \"\"\"
            
            payload = [prompt]
            for img in images_data:
                payload.append({
                    "mime_type": img.get('mime', 'image/jpeg'),
                    "data": img['bytes']
                })
            
            response = AIProductService._generate_with_fallback(payload)'''

if 'def analyze_product_image(image_bytes, mime_type=\'image/jpeg\'):' in content:
    content = content.replace(old_analyze_def, new_analyze_def)
    print("Updated analyze_product_image")
else:
    print("Could not find analyze_product_image to replace")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
