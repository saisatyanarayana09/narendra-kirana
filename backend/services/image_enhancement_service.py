import io
import logging
from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)

class ImageEnhancementService:
    @staticmethod
    def enhance_product_image(image_bytes, original_mime='image/jpeg'):
        \"\"\"
        Enhances the product image using basic Pillow adjustments (brightness, contrast, sharpness).
        No external background removal APIs are used as per user request.
        \"\"\"
        try:
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'RGBA':
                    background.paste(image, mask=image.split()[3])
                else:
                    background.paste(image)
                image = background

            # Enhance Brightness slightly
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.05)
            
            # Enhance Contrast (Punchier colors)
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.15)
            
            # Enhance Sharpness (Crisper text and edges)
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.3)
            
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=95)
            return output.getvalue(), 'image/jpeg'
            
        except Exception as e:
            logger.warning(f"Image Enhancement failed: {e}")
            return image_bytes, original_mime
