text = '''
`json
{
  "name": "Atta"
}
`
'''
text = text.strip()
print("1:", repr(text))
if text.startswith('`json'):
    text = text[7:]
    print("2:", repr(text))
if text.startswith('`'):
    text = text[3:]
    print("3:", repr(text))
text = text.strip()
print("4:", repr(text))
if text.endswith('`'):
    text = text[:-3]
    print("5:", repr(text))
text = text.strip()
print("6:", repr(text))
