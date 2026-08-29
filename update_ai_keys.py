import re

filepath = 'backend/services/ai_product_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace API key fetching in _generate_with_fallback
old_fallback_start = '''    @staticmethod
    def _generate_with_fallback(payload):
        import google.generativeai as genai
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("AI API Key not configured")
        genai.configure(api_key=api_key)
        
        # Check if payload contains any dicts (images)
        is_vision = any(isinstance(p, dict) for p in payload)
        
        models_to_try = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-1.5-pro-latest',
            'gemini-pro-vision' if is_vision else 'gemini-pro',
            'gemini-1.0-pro-vision-latest' if is_vision else 'gemini-1.0-pro-latest'
        ]'''

new_fallback_start = '''    @staticmethod
    def _generate_with_fallback(payload):
        import google.generativeai as genai
        from store.models import StoreSettings
        
        settings = StoreSettings.load()
        api_key = settings.gemini_api_key or os.environ.get('GEMINI_API_KEY')
        
        if not api_key:
            raise ValueError("AI API Key not configured. Please add it in Owner Settings.")
        genai.configure(api_key=api_key)
        
        # Check if payload contains any dicts (images)
        is_vision = any(isinstance(p, dict) for p in payload)
        
        vision_model = settings.gemini_vision_model or 'gemini-1.5-flash'
        
        models_to_try = [
            vision_model,
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro-vision' if is_vision else 'gemini-pro',
        ]'''
content = content.replace(old_fallback_start, new_fallback_start)


# Replace API key fetching in generate_description
old_groq = '''            try:
                from groq import Groq
                api_key = os.environ.get('GROQ_API_KEY', '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')
                client = Groq(api_key=api_key)
                completion = client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": prompt}]
                )
                return completion.choices[0].message.content.strip()'''

new_groq = '''            try:
                from groq import Groq
                from store.models import StoreSettings
                settings = StoreSettings.load()
                
                api_key = settings.groq_api_key or os.environ.get('GROQ_API_KEY', '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')
                text_model = settings.groq_text_model or 'llama3-8b-8192'
                
                client = Groq(api_key=api_key)
                completion = client.chat.completions.create(
                    model=text_model,
                    messages=[{"role": "user", "content": prompt}]
                )
                return completion.choices[0].message.content.strip()'''
content = content.replace(old_groq, new_groq)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated ai_product_service.py")
