import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the first const handleAnalyzeProduct = async () => { ... } up to const handleGenerateDescription = async () => { ... }; and remove them.
# The second set of functions (which I want to KEEP) looks exactly like what I printed, and it is followed by const closeForm probably.

# Let's delete the first occurrence of handleAnalyzeProduct and handleGenerateDescription.
# First occurrence of handleAnalyzeProduct:
pattern1 = re.compile(r' const handleAnalyzeProduct = async \(\) => \{[\s\S]*?(?= const handleGenerateDescription = async \(\) => \{)', re.DOTALL)
if pattern1.search(content):
    content = pattern1.sub('', content, count=1)
    print("Deleted old handleAnalyzeProduct")

pattern2 = re.compile(r' const handleGenerateDescription = async \(\) => \{[\s\S]*?(?=\n\s*const handleAnalyzeProduct = async \(\) => \{)', re.DOTALL)
if pattern2.search(content):
    content = pattern2.sub('', content, count=1)
    print("Deleted old handleGenerateDescription")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
