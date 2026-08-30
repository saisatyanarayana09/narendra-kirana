import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Delete handleAIPhotoUpload function
content = re.sub(r'  const handleAIPhotoUpload = async \(e\) => \{.*?\n      \}\n    \};\n\n', '', content, flags=re.DOTALL)

# Delete AI Scan button and input
content = re.sub(r'      <input type="file" accept="image/\*" capture="environment" id="ai-photo-upload".*?>\n', '', content)
content = re.sub(r'      <button onClick=\{.*?id\(\'ai-photo-upload\'\)\.click\(\).*?</button>\n', '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
