import re

filepath = 'backend/services/ai_product_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad_markdown = '''            # Clean markdown formatting if present
            if text.startswith('json'):
                text = text[7:]
            if text.startswith(''):
                text = text[3:]
            text = text.strip()
            if text.endswith(''):
                text = text[:-3]'''

good_markdown = '''            # Clean markdown formatting if present
            if text.startswith('`json'):
                text = text[7:]
            if text.startswith('`'):
                text = text[3:]
            text = text.strip()
            if text.endswith('`'):
                text = text[:-3]'''

if bad_markdown in content:
    content = content.replace(bad_markdown, good_markdown)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed markdown strippers")
else:
    print("Not found")
