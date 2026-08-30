import re

text = 'Here is your JSON:\n`json\n{\"name\": \"Tide\"}\n`\nHope it helps.'
match = re.search(r'\{.*\}', text, re.DOTALL)
if match:
    print(match.group(0))
