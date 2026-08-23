import io
import os
import logging
import requests
from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)

class ImageEnhancementService:
    @staticmethod
    def _remove_background_api(image_bytes):
        api_key = os.environ.get('REMOVE_BG_API_KEY')
        if not api_key:
            return None
            
        try:
            response = requests.post(
                'https://api.remove.bg/v1.0/removebg',
                files={'image_file': image_bytes},
                data={'size': 'auto', 'bg_color': 'white', 'format': 'jpg'},
                headers={'X-Api-Key': api_key},
                timeout=15
            )
            if response.status_code == 200:
                return response.content
            else:
                logger.error(f"Remove.bg API error: {response.text}")
                return None
        except Exception as e:
            logger.error(f"Remove.bg request failed: {e}")
            return None

    @staticmethod
    def enhance_product_image(image_bytes, original_mime='image/jpeg'):
        """
        Enhances the product image using an AI background removal API (if configured)
        to simulate a clean e-commerce studio look. Falls back to Pillow for basic
        enhancement (contrast, sharpness, brightness).
        """
        try:
            # 1. Attempt True E-Commerce Background Removal/Replacement
            processed_bytes = ImageEnhancementService._remove_background_api(image_bytes)
            if processed_bytes:
                return processed_bytes, 'image/jpeg'

            # 2. Fallback to Basic Image Enhancement (Pillow)
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary (e.g., if it's RGBA/PNG with transparency)
            if image.mode in ('RGBA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                # If image has an alpha channel, use it as the mask
                if image.mode == 'RGBA':
                    background.paste(image, mask=image.split()[3])
                else:
                    background.paste(image)
                image = background

            # Enhance Brightness
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.05)
            
            # Enhance Contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.1)
            
            # Enhance Sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.2)
            
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=90)
            return output.getvalue(), 'image/jpeg'
            
        except Exception as e:
            logger.warning(f"Image Enhancement failed (likely unsupported format like HEIC). Returning original: {e}")
            return image_bytes, original_mime
