import os
import json
import logging

logger = logging.getLogger(__name__)

class AIProductService:
    @staticmethod
    def _get_model():
        try:
            import google.generativeai as genai
            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                raise ValueError("AI API Key not configured")
            genai.configure(api_key=api_key)
            # Use gemini-1.5-flash for very fast vision and text processing
            return genai.GenerativeModel('gemini-1.5-flash')
        except ImportError:
            raise RuntimeError("Google Generative AI SDK is not installed.")

    @staticmethod
    def analyze_product_image(image_bytes, mime_type):
        try:
            model = AIProductService._get_model()
            
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
            
            response = model.generate_content([
                {"mime_type": mime_type, "data": image_bytes},
                prompt
            ])
            
            # Clean response text from possible markdown wrappers
            text = response.text.strip()
            if text.startswith('`json'):
                text = text[7:]
            if text.startswith('`'):
                text = text[3:]
            if text.endswith('`'):
                text = text[:-3]
                
            data = json.loads(text.strip())
            return data
            
        except Exception as e:
            logger.error(f"AI Product Analysis failed: {e}")
            raise RuntimeError(f"AI Analysis failed: {str(e)}")

    @staticmethod
    def generate_description(product_data):
        try:
            model = AIProductService._get_model()
            
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
            
            response = model.generate_content(prompt)
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"AI Description Generation failed: {e}")
            raise RuntimeError(f"Description Generation failed: {str(e)}")
