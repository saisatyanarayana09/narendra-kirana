import re

filepath = 'backend/services/ai_product_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_prompt = '''            prompt = f\"\"\"
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
            \"\"\"'''

new_prompt = '''            prompt = f\"\"\"
            Write a professional, concise, and engaging e-commerce description for a grocery product.
            Product Details:
            - Name: {name}
            - Brand: {brand}
            - Category: {category}
            - Size/Unit: {unit}
            
            Rules:
            1. Keep it under 3 sentences.
            2. Do not invent health claims, nutritional info, or ingredients.
            3. Make it friendly for a local Indian Kirana/Supermarket audience.
            4. ABSOLUTELY NO MARKDOWN. Do not use asterisks, bolding, bullet points, or hashes.
            
            CRITICAL INSTRUCTION: 
            Output EXACTLY the final description and absolutely nothing else. 
            Do NOT include your thinking process, do NOT verify the constraints in your output, and do NOT write an introduction. 
            Start immediately with the first word of the product description.
            \"\"\"'''

content = content.replace(old_prompt, new_prompt)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
