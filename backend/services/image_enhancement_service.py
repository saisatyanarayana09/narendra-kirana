import io
import os
import logging
import requests

logger = logging.getLogger(__name__)

class ImageEnhancementService:
    @staticmethod
    def enhance_product_image(image_bytes, original_mime='image/jpeg'):
        '''
        Removes background, applies AI soft shadow, and sets a white background 
        using the Photoroom V2 API to achieve premium e-commerce studio quality.
        '''
        photoroom_key = os.environ.get('PHOTOROOM_API_KEY', 'sandbox_sk_pr_default_3e95fc6c32c8f8e80d6f4a53034e657cab7388df')
        
        try:
            logger.info("Calling Photoroom v2 API for professional enhancement...")
            
            url = "https://image-api.photoroom.com/v2/edit"
            headers = {
                "x-api-key": photoroom_key
            }
            files = {
                'imageFile': ('product.jpg', image_bytes, original_mime)
            }
            data = {
                'background.color': '#FFFFFF',
                'shadow.mode': 'ai.soft',
                'padding': '0.1'
            }
            
            response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
            
            if response.status_code == 200:
                logger.info("Photoroom enhancement successful.")
                return response.content, 'image/png'
            else:
                logger.error(f"Photoroom API error: {response.status_code} - {response.text}")
                return image_bytes, original_mime
                
        except Exception as e:
            logger.error(f"Image enhancement failed: {e}")
            return image_bytes, original_mime
