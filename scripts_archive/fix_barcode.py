import re

filepath = "backend/products/views.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

bad_barcode = '''            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel('gemini-1.5-flash-latest')
                
                prompt = f\"\"\"
                Identify the FMCG grocery product commonly sold in India with the barcode (EAN/UPC) {barcode}.
                Return ONLY raw JSON (no markdown, no backticks) with the following structure:
                {{
                  "name": "Product Name (e.g. Tide Plus Jasmine & Rose)",
                  "brand": "Brand Name (e.g. Tide)",
                  "unit": "Size/Weight (e.g. 1kg, 500ml)"
                }}
                If you absolutely do not know, return {{"error": "not found"}}
                \"\"\"
                response = model.generate_content(prompt)'''

good_barcode = '''            try:
                from services.ai_product_service import AIProductService
                prompt = f\"\"\"
                Identify the FMCG grocery product commonly sold in India with the barcode (EAN/UPC) {barcode}.
                Return ONLY raw JSON (no markdown, no backticks) with the following structure:
                {{
                  "name": "Product Name (e.g. Tide Plus Jasmine & Rose)",
                  "brand": "Brand Name (e.g. Tide)",
                  "unit": "Size/Weight (e.g. 1kg, 500ml)"
                }}
                If you absolutely do not know, return {{"error": "not found"}}
                \"\"\"
                response = AIProductService._generate_with_fallback(prompt)'''

if bad_barcode in content:
    content = content.replace(bad_barcode, good_barcode)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed barcode_lookup to use fallback")
else:
    print("Could not find bad_barcode block")
