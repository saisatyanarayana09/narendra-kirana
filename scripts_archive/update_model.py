import re

filepath = 'backend/store/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add AI Settings before def save
ai_fields = '''
    # AI Management
    gemini_api_key = models.CharField(max_length=255, blank=True, null=True, help_text="Google Gemini API Key for Vision")
    gemini_vision_model = models.CharField(max_length=50, default="gemini-1.5-flash")
    groq_api_key = models.CharField(max_length=255, blank=True, null=True, help_text="Groq API Key for Text Generation")
    groq_text_model = models.CharField(max_length=50, default="llama3-8b-8192")

    def save(self,'''

content = content.replace("    def save(self,", ai_fields)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated StoreSettings model")
