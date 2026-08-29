import re

filepath = 'backend/services/ai_product_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'    @staticmethod\n    def analyze_product_image.*?response = AIProductService\._generate_with_fallback\(\[prompt, image_parts\[0\]\]\)', re.DOTALL)

new_def = '''    @staticmethod
    def analyze_product_image(images_data):
        try:
            logger.info("Initializing Gemini Vision for product analysis...")
            prompt = """
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
            """
            
            payload = [prompt]
            for img in images_data:
                payload.append({
                    "mime_type": img.get('mime', 'image/jpeg'),
                    "data": img['bytes']
                })
            
            response = AIProductService._generate_with_fallback(payload)'''

if pattern.search(content):
    content = pattern.sub(new_def, content)
    print("Replaced via regex")
else:
    print("Regex failed to find analyze_product_image")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
