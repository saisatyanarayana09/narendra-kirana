import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the function safely
pattern1 = r'\s*const handleAIPhotoUpload = async \(e\) => \{.*?\n  \};\n'
content = re.sub(pattern1, '\n', content, flags=re.DOTALL)

# Remove the UI elements safely
pattern2 = r'\s*<input type="file" accept="image/\*" capture="environment" id="ai-photo-upload".*?/>\n'
content = re.sub(pattern2, '\n', content)

pattern3 = r'\s*<button onClick=\{\(\) => document\.getElementById\(\'ai-photo-upload\'\)\.click\(\)\}.*?</button>\n'
content = re.sub(pattern3, '\n', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
