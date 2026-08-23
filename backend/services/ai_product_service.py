import os
import json
import logging

logger = logging.getLogger(__name__)

class AIProductService:
    @staticmethod
    def _generate_with_fallback(payload):
        import google.generativeai as genai
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("AI API Key not configured")
        genai.configure(api_key=api_key)
        
        # Check if payload contains any dicts (images)
        is_vision = any(isinstance(p, dict) for p in payload)
        
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
                        models_to_try.append(name)
        except Exception as e:
            logger.warning(f"Could not list dynamic models: {e}")
        
        last_error = None
        for model_name in models_to_try:
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(payload)
                return response
            except Exception as e:
                last_error = e
                continue
                
        raise RuntimeError(f"All AI models failed or are unsupported. Last error: {last_error}")

    @staticmethod
    def analyze_product_image(images_data):
        """
        images_data is a list of dicts: [{'bytes': b'...', 'mime': 'image/jpeg'}]
        """
        try:
            prompt = """
            Analyze these product images carefully (front and back of packaging). 
            Extract the following details and return ONLY a raw JSON object (no markdown, no backticks).
            Be EXTREMELY accurate. Read the smallest text for ingredients, barcodes, and MRP.
            If you cannot confidently determine a field, leave it as an empty string.
            {
              "name": "Exact Product Name without brand (e.g. Whole Wheat Atta)",
              "brand": "Exact Brand Name (e.g. Aashirvaad)",
              "category": "Broad category (e.g. Grocery, Snacks, Beverages)",
              "unit": "Package size or weight (e.g. 1 kg, 500 g, 1 L)",
              "sku": "Extract the exact Barcode number (EAN/UPC) if visible. Look for 13 or 8 digit numbers under the barcode lines.",
              "expiry_date": "Expiry, Use By, or Best Before date (YYYY-MM-DD)",
              "regular_price": "Visible MRP or Price (numbers only)",
              "confidence": 0.95
            }
            """
            
            payload = [prompt]
            for img in images_data:
                payload.append({
                    "mime_type": img.get('mime', 'image/jpeg'),
                    "data": img['bytes']
                })
            
            response = AIProductService._generate_with_fallback(payload)
            
            text = response.text.strip()
            
            # Clean markdown formatting if present
            if text.startswith('`json'):
                text = text[7:]
            if text.startswith('`'):
                text = text[3:]
            text = text.strip()
            if text.endswith('`'):
                text = text[:-3]
            text = text.strip()
            
            try:
                data = json.loads(text)
            except json.JSONDecodeError as e:
                if "Extra data" in str(e):
                    valid_json = text[:e.pos].strip()
                    data = json.loads(valid_json)
                else:
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
            4. ABSOLUTELY NO MARKDOWN. Do not use asterisks (**), bolding, bullet points, or hashes. 
            5. Return pure plain text only. No quotes, no intro, no emojis.
            """
            
            try:
                from groq import Groq
                api_key = os.environ.get('GROQ_API_KEY', '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')
                client = Groq(api_key=api_key)
                completion = client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": prompt}]
                )
                return completion.choices[0].message.content.strip()
            except Exception as groq_err:
                logger.warning(f"Groq API failed, falling back to Gemini: {groq_err}")
                response = AIProductService._generate_with_fallback([prompt])
                return response.text.strip()
            
        except Exception as e:
            logger.error(f"AI Description Generation failed: {e}")
            raise RuntimeError(f"Description Generation failed: {str(e)}")
