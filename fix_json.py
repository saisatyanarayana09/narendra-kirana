import re

filepath = 'backend/services/ai_product_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad_json = '''            # Extract JSON from potential markdown/babble
            import re
            match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if not match:
                raise ValueError("Could not parse JSON from AI response")
            
            data = json.loads(match.group(0))'''

good_json = '''            import json
            text = response.text.strip()
            
            # Clean markdown formatting if present
            if text.startswith('`json'):
                text = text[7:]
            if text.startswith('`'):
                text = text[3:]
            text = text.strip()
            if text.endswith('`'):
                text = text[:-3]
            text = text.strip()
            
            try:
                data = json.loads(text)
            except json.JSONDecodeError as e:
                # If there's extra data (like multiple objects or trailing text), slice it out
                if "Extra data" in str(e):
                    valid_json = text[:e.pos].strip()
                    data = json.loads(valid_json)
                else:
                    # Attempt robust regex extraction as absolute fallback
                    import re
                    match = re.search(r'\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\})*)*\}))*\}', text)
                    if match:
                        data = json.loads(match.group(0))
                    else:
                        raise e'''

if bad_json in content:
    content = content.replace(bad_json, good_json)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed JSON parser")
else:
    print("Not found")
