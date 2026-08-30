import os
import json
import logging
import re

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
                error_str = str(e).lower()
                if "404" in error_str or "not found" in error_str or "not supported" in error_str:
                    last_error = e
                    continue
                raise e
                
        raise RuntimeError(f"All AI models failed or are unsupported. Last error: {last_error}")

    @staticmethod
    def analyze_product_image(image_bytes, mime_type):
        try:
            prompt = \"\"\"
            Analyze this grocery/e-commerce product image. 
            Extract the following details and return ONLY a raw JSON object (no markdown, no backticks).
            If you cannot confidently determine a field, leave it as an empty string.
            {
              "name": "Product Name (e.g. Aashirvaad Whole Wheat Atta)",
              "brand": "Brand Name (e.g. Aashirvaad)",
              "category": "Broad category (e.g. Rice & Grains, Snacks, Beverages)",
              "unit": "Package size or weight (e.g. 1 kg, 500 g, 1 L)",
              "confidence": 0.95
            }
            \"\"\"
            
            response = AIProductService._generate_with_fallback(prompt, image_bytes, mime_type)
            
            match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if not match:
                raise ValueError("Could not parse JSON from AI response")
            
            data = json.loads(match.group(0))
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
            
            prompt = f\"\"\"
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
            \"\"\"
            
            response = AIProductService._generate_with_fallback(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"AI Description Generation failed: {e}")
            raise RuntimeError(f"Description Generation failed: {str(e)}")
