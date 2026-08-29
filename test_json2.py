import json
import re

text = '''
{
    "name": "Atta"
}
{
    "name": "Dal"
}
'''

# We can use a regex that matches the first balanced curly braces!
def extract_first_json(text):
    text = text.strip()
    if text.startswith('`json'):
        text = text[7:]
    if text.startswith('`'):
        text = text[3:]
    text = text.strip()
    if text.endswith('`'):
        text = text[:-3]
    text = text.strip()
    
    # Try parsing directly
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
        
    # If there are multiple objects, json.loads throws Extra data.
    # We can use regex to find the first { ... } block
    match = re.search(r'\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}', text)
    if match:
        try:
            return json.loads(match.group(0))
        except:
            pass
            
    raise ValueError("Could not parse JSON")

print(extract_first_json(text))
