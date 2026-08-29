import re

filepath = "backend/products/views.py"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the naive parsing in vision_lookup
bad_parse = '''            result_text = response.text.strip()
            if result_text.startswith('`json'):
                result_text = result_text[7:]
            if result_text.endswith('`'):
                result_text = result_text[:-3]
                
            data = json.loads(result_text.strip())'''

good_parse = '''            import re
            match = re.search(r'\\{.*\\}', response.text, re.DOTALL)
            if not match:
                return Response({'success': False, 'error': 'Could not parse JSON from AI'})
            data = json.loads(match.group(0))'''

if bad_parse in content:
    content = content.replace(bad_parse, good_parse)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed vision_lookup json parse")
else:
    print("Could not find bad_parse block")
