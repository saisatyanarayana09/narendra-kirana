import re

filepath = 'backend/services/ai_product_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix _generate_with_fallback
old_fallback = '''    @staticmethod
    def _generate_with_fallback(payload):
        import google.generativeai as genai
        from store.models import StoreSettings
        
        settings = StoreSettings.load()
        api_key = settings.gemini_api_key or os.environ.get('GEMINI_API_KEY')
        
        if not api_key:
            raise ValueError("AI API Key not configured. Please add it in Owner Settings.")
        genai.configure(api_key=api_key)'''

new_fallback = '''    @staticmethod
    def _generate_with_fallback(payload):
        import google.generativeai as genai
        from store.models import StoreSettings
        
        try:
            settings = StoreSettings.load()
            api_key = settings.gemini_api_key or os.environ.get('GEMINI_API_KEY')
            vision_model = settings.gemini_vision_model or 'gemini-1.5-flash'
        except Exception:
            api_key = os.environ.get('GEMINI_API_KEY')
            vision_model = 'gemini-1.5-flash'
        
        if not api_key:
            raise ValueError("AI API Key not configured. Please add it in Owner Settings.")
        genai.configure(api_key=api_key)'''

content = content.replace(old_fallback, new_fallback)

# Actually, I also need to make sure vision_model isn't used before it's assigned if the exception is caught, wait, in new_fallback I assign vision_model. Let's see the rest of _generate_with_fallback:
# I need to remove ision_model = settings.gemini_vision_model or 'gemini-1.5-flash' which was lower down!

old_vision_model = '''        # Check if payload contains any dicts (images)
        is_vision = any(isinstance(p, dict) for p in payload)
        
        vision_model = settings.gemini_vision_model or 'gemini-1.5-flash'
        
        models_to_try = ['''

new_vision_model = '''        # Check if payload contains any dicts (images)
        is_vision = any(isinstance(p, dict) for p in payload)
        
        models_to_try = ['''

content = content.replace(old_vision_model, new_vision_model)

# Fix generate_description
old_desc = '''            try:
                from groq import Groq
                from store.models import StoreSettings
                settings = StoreSettings.load()
                
                api_key = settings.groq_api_key or os.environ.get('GROQ_API_KEY', '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')
                text_model = settings.groq_text_model or 'llama3-8b-8192'
                
                client = Groq(api_key=api_key)'''

new_desc = '''            try:
                from groq import Groq
                from store.models import StoreSettings
                try:
                    settings = StoreSettings.load()
                    api_key = settings.groq_api_key or os.environ.get('GROQ_API_KEY', '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')
                    text_model = settings.groq_text_model or 'llama3-8b-8192'
                except Exception:
                    api_key = os.environ.get('GROQ_API_KEY', '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')
                    text_model = 'llama3-8b-8192'
                
                client = Groq(api_key=api_key)'''

content = content.replace(old_desc, new_desc)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Added failsafes")
