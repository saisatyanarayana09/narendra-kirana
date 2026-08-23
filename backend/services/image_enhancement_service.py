import io
import os
import logging
import requests
from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)

class ImageEnhancementService:
    @staticmethod
    def _hf_remove_background(image_bytes):
        hf_token = os.environ.get('HF_TOKEN')
        if not hf_token:
            return None
            
        try:
            logger.info("Calling Hugging Face Inference API for background removal...")
            response = requests.post(
                "https://api-inference.huggingface.co/models/briaai/RMBG-1.4",
                headers={"Authorization": f"Bearer {hf_token}"},
                data=image_bytes,
                timeout=25
            )
            
            if response.status_code == 200:
                # The API returns the image with the background removed (RGBA PNG)
                return response.content
            elif response.status_code == 503:
                # Model is loading
                logger.warning(f"Hugging Face model is loading. Try again in 10 seconds.")
                return None
            else:
                logger.error(f"Hugging Face API error: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Hugging Face request failed: {e}")
            return None

    @staticmethod
    def enhance_product_image(image_bytes, original_mime='image/jpeg'):
        \"\"\"
        Removes the background using Hugging Face's free Inference API (RMBG-1.4)
        and applies Pillow enhancements (contrast, sharpness) for an interactive look.
        \"\"\"
        try:
            # 1. AI Background Removal via Hugging Face (Zero RAM cost on Render)
            processed_bytes = ImageEnhancementService._hf_remove_background(image_bytes)
            
            # If the API returned an image, use it. Otherwise, use the original image.
            current_bytes = processed_bytes if processed_bytes else image_bytes
            
            image = Image.open(io.BytesIO(current_bytes))
            
            # 2. Convert to RGB and add clean white background (if it has transparency from BG removal)
            if image.mode in ('RGBA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'RGBA':
                    # Use the alpha channel as a mask to paste the product cleanly
                    background.paste(image, mask=image.split()[3])
                else:
                    background.paste(image)
                image = background

            # 3. AI-Style Enhancements (Punchier colors and sharpness)
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.05)
            
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.15)
            
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.3)
            
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=95)
            return output.getvalue(), 'image/jpeg'
            
        except Exception as e:
            logger.warning(f"Image processing failed: {e}")
            return image_bytes, original_mime
