import re

filepath = 'backend/services/image_enhancement_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad = "hf_token = os.environ.get('HF_TOKEN')"
good = "hf_token = os.environ.get('HF_TOKEN', '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')"

if bad in content:
    content = content.replace(bad, good)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced token fallback")
else:
    print("Not found")
