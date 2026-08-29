import json

text = '''{
    "name": "Atta"
}
{
    "name": "Dal"
}'''

try:
    json.loads(text)
except json.JSONDecodeError as e:
    if "Extra data" in str(e):
        valid_json = text[:e.pos].strip()
        print("Recovered:", json.loads(valid_json))
