import re

filepath = 'backend/services/ai_product_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad = '''            response = AIProductService._generate_with_fallback(prompt)
            return response.text.strip()'''

good = '''            import os
            try:
                from groq import Groq
                # Use the requested Groq API Key explicitly for Text Generation
                api_key = os.environ.get('GROQ_API_KEY', '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')
                client = Groq(api_key=api_key)
                completion = client.chat.completions.create(
                    model="openai/gpt-oss-120b",
                    messages=[{"role": "user", "content": prompt}]
                )
                return completion.choices[0].message.content.strip()
            except Exception as groq_err:
                logger.warning(f"Groq API failed, falling back to Gemini: {groq_err}")
                response = AIProductService._generate_with_fallback(prompt)
                return response.text.strip()'''

if bad in content:
    content = content.replace(bad, good)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced generate_description")
else:
    print("Not found")
