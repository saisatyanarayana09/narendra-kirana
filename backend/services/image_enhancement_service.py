import io
import os
import logging
from PIL import Image, ImageEnhance

logger = logging.getLogger(__name__)

# Try to import rembg, fallback gracefully if not installed yet
try:
    from rembg import remove, new_session
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

_rembg_session = None
def get_rembg_session():
    global _rembg_session
    if _rembg_session is None and REMBG_AVAILABLE:
        try:
            # Lazy initialize the small, fast, low-memory model (u2netp)
            _rembg_session = new_session("u2netp")
        except Exception as e:
            logger.error(f"Failed to initialize rembg session: {e}")
    return _rembg_session

class ImageEnhancementService:
    @staticmethod
    def enhance_product_image(image_bytes, original_mime='image/jpeg'):
        """
        Enhances the product image using local AI background removal (rembg)
        to simulate a clean e-commerce studio look. Applies Pillow enhancement
        (contrast, sharpness, brightness) to make it attractive to customers.
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            
            # 1. AI Background Removal (Local, No APIs)
            if REMBG_AVAILABLE:
                logger.info("Running AI Background Removal (rembg)")
                
                # Convert PIL Image to bytes for rembg
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='PNG')
                input_png_bytes = img_byte_arr.getvalue()
                
                # Remove background (returns transparent PNG bytes)
                output_png_bytes = remove(input_png_bytes, session=get_rembg_session())
                
                # Load the transparent PNG back into Pillow
                image = Image.open(io.BytesIO(output_png_bytes)).convert("RGBA")
                
                # Create a clean white e-commerce studio background
                background = Image.new('RGB', image.size, (255, 255, 255))
                # Paste the product using its own alpha channel as the mask
                background.paste(image, mask=image)
                image = background
            else:
                logger.warning("rembg not installed, skipping AI background removal")
                # Basic conversion to RGB
                if image.mode in ('RGBA', 'P'):
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    if image.mode == 'RGBA':
                        background.paste(image, mask=image.split()[3])
                    else:
                        background.paste(image)
                    image = background

            # 2. Make it attractive (Enhancements)
            # Enhance Brightness slightly
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.05)
            
            # Enhance Contrast (Punchier colors for attractiveness)
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.15)
            
            # Enhance Sharpness (Crisper text and edges)
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.3)
            
            # Save back to bytes
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=95) # High quality e-commerce JPEG
            return output.getvalue(), 'image/jpeg'
            
        except Exception as e:
            logger.warning(f"Image Enhancement failed (likely unsupported format or OOM). Returning original: {e}")
            return image_bytes, original_mime
