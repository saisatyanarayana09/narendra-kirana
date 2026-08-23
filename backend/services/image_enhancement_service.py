import io
import logging
from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)

class ImageEnhancementService:
    @staticmethod
    def enhance_product_image(image_bytes, original_mime='image/jpeg'):
        """
        Enhances the product image using Pillow.
        Adjusts contrast, sharpness, and brightness to simulate a clean e-commerce studio look.
        Provides a fast, zero-dependency (other than PIL) enhancement pipeline.
        """
        try:
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

            # 1. Enhance Brightness slightly
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.05)
            
            # 2. Enhance Contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.1)
            
            # 3. Enhance Sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.2)
            
            # Save back to bytes
            output = io.BytesIO()
            # Default to JPEG for output, maintaining good quality
            image.save(output, format='JPEG', quality=90)
            return output.getvalue(), 'image/jpeg'
            
        except Exception as e:
            logger.warning(f"Image Enhancement failed (likely unsupported format like HEIC). Returning original: {e}")
            # Fallback: Just return the original image untouched
            return image_bytes, original_mime
