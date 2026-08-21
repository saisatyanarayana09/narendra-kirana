import urllib.request, re
html = urllib.request.urlopen('https://narendra-kirana.vercel.app/').read().decode('utf-8')
match = re.search(r'href="(/assets/index-.*?.css)"', html)
if match:
    css_url = 'https://narendra-kirana.vercel.app' + match.group(1)
    css = urllib.request.urlopen(css_url).read().decode('utf-8')
    print('Fix is deployed!' if 'html,body,#root' in css or 'html, body, #root' in css else 'Fix is NOT deployed yet.')
else:
    print('Could not find CSS link.')
