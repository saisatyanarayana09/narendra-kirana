import re

filepath = 'backend/services/image_enhancement_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad_remove = '''            # 1. AI Background Removal (Local, No APIs)
            if REMBG_AVAILABLE:
                logger.info("Running AI Background Removal (rembg)")
                
                # Convert PIL Image to bytes for rembg
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='PNG')
                input_png_bytes = img_byte_arr.getvalue()
                
                # Remove background (returns transparent PNG bytes)
                output_png_bytes = remove(input_png_bytes, session=get_rembg_session())'''

good_remove = '''            # 1. AI Background Removal (Local, No APIs)
            session = get_rembg_session() if REMBG_AVAILABLE else None
            if session:
                logger.info("Running AI Background Removal (rembg)")
                
                # Convert PIL Image to bytes for rembg
                img_byte_arr = io.BytesIO()
                image.save(img_byte_arr, format='PNG')
                input_png_bytes = img_byte_arr.getvalue()
                
                # Remove background (returns transparent PNG bytes)
                output_png_bytes = remove(input_png_bytes, session=session)'''

if bad_remove in content:
    content = content.replace(bad_remove, good_remove)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed remove fallback")
else:
    print("Not found")
