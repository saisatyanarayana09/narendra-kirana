import os
import json
import logging

logger = logging.getLogger(__name__)

class AIProductService:
    @staticmethod
    def _generate_with_fallback(prompt, image_bytes=None, mime_type=None):
        import google.generativeai as genai
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("AI API Key not configured")
        genai.configure(api_key=api_key)
        
        is_vision = image_bytes is not None
        
        models_to_try = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-1.5-pro-latest',
            'gemini-pro-vision' if is_vision else 'gemini-pro',
            'gemini-1.0-pro-vision-latest' if is_vision else 'gemini-1.0-pro-latest'
        ]
        
        try:
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    name = m.name.replace('models/', '')
                    if name not in models_to_try:
                        # Append dynamically discovered models to the end
                        models_to_try.append(name)
        except Exception as e:
            logger.warning(f"Could not list dynamic models: {e}")
        
        last_error = None
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                if is_vision:
                    response = model.generate_content([
                        {"mime_type": mime_type, "data": image_bytes},
                        prompt
                    ])
                else:
                    response = model.generate_content(prompt)
                return response
            except Exception as e:
                # Catch ALL errors (404 missing, 400 unsupported modality, 429 quota exceeded, 403, 500, etc.)
                # and gracefully skip to the next model. If they all fail, the last one bubbles up.
                last_error = e
                continue
                
        raise RuntimeError(f"All AI models failed or are unsupported. Last error: {last_error}")

    @staticmethod
    def analyze_product_image(image_bytes, mime_type):
        try:
            prompt = """
            Analyze this grocery/e-commerce product image. 
            Extract the following details and return ONLY a raw JSON object (no markdown, no backticks).
            If you cannot confidently determine a field, leave it as an empty string.
            {
              "name": "Product Name (e.g. Aashirvaad Whole Wheat Atta)",
              "brand": "Brand Name (e.g. Aashirvaad)",
              "category": "Broad category (e.g. Rice & Grains, Snacks, Beverages)",
              "unit": "Package size or weight (e.g. 1 kg, 500 g, 1 L)",
              "sku": "Any visible barcode or SKU number",
              "expiry_date": "Visible Expiry Date (YYYY-MM-DD)",
              "regular_price": "Visible MRP or Price (numbers only)",
              "confidence": 0.95
            }
            """
            
            response = AIProductService._generate_with_fallback(prompt, image_bytes, mime_type)
            
            import json
            text = response.text.strip()
            
            # Clean markdown formatting if present
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            text = text.strip()
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
            
            try:
                data = json.loads(text)
            except json.JSONDecodeError as e:
                # If there's extra data (like multiple objects or trailing text), slice it out
                if "Extra data" in str(e):
                    valid_json = text[:e.pos].strip()
                    data = json.loads(valid_json)
                else:
                    # Attempt robust regex extraction as absolute fallback
                    import re
                    match = re.search(r'\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\})*)*\}))*\}', text)
                    if match:
                        data = json.loads(match.group(0))
                    else:
                        raise e
            return data
            
        except Exception as e:
            logger.error(f"AI Product Analysis failed: {e}")
            raise RuntimeError(f"AI Analysis failed: {str(e)}")

    @staticmethod
    def generate_description(product_data):
        try:
            name = product_data.get('name', 'Product')
            brand = product_data.get('brand', '')
            category = product_data.get('category', '')
            unit = product_data.get('unit', '')
            
            prompt = f"""
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
            """
            
            response = AIProductService._generate_with_fallback(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"AI Description Generation failed: {e}")
            raise RuntimeError(f"Description Generation failed: {str(e)}")
