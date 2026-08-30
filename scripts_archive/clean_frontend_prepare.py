import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the import for Sparkles and Wand2 if present
content = re.sub(r'Sparkles,\s*', '', content)
content = re.sub(r'Wand2,\s*', '', content)

# Remove handleAnalyzeProduct and handleGenerateDescription blocks completely
content = re.sub(r'  const handleAnalyzeProduct = async \(\) => \{.*?(?=\n  const handleSubmit |\n  const handleBarcodeLookup )', '', content, flags=re.DOTALL)
content = re.sub(r'  const handleGenerateDescription = async \(\) => \{.*?(?=\n  const handleSubmit |\n  const handleBarcodeLookup )', '', content, flags=re.DOTALL)

# Remove the buttons from the UI
content = re.sub(r'\{/\* AI Tools \*/\}.*?</div>\s*</div>\s*\{/\* End AI Tools \*/\}', '', content, flags=re.DOTALL)

# Let me check if they are wrapped in those comments. I didn't add those comments earlier, I need to see what it actually looks like.
