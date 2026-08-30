text = '`json\n{\"name\": \"test\"}\n`'
text = text.strip()
if text.startswith('\json'):
    text = text[7:]
if text.startswith('\'):
    text = text[3:]
if text.endswith('\'):
    text = text[:-3]
print(repr(text))
