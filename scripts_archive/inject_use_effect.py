import re

filepath = 'frontend/src/owner/pages/Products.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

scanner_effect = '''
  useEffect(() => {
    if (showScanner) {
      let scanner = null;
      try {
          scanner = new Html5QrcodeScanner('reader', {
            qrbox: { width: 250, height: 100 },
            fps: 10,
            formatsToSupport: [ Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.QR_CODE ]
          }, false);
          
          scanner.render(
            (decodedText) => {
              setFormData(prev => ({...prev, sku: decodedText}));
              toast.success('Barcode scanned successfully!');
              setShowScanner(false);
              scanner.clear().catch(e => console.log(e));
            },
            (error) => {}
          );
      } catch(err) {
          console.warn('Scanner init error', err);
      }
      
      return () => {
        if (scanner) {
            scanner.clear().catch(e => console.log('Failed to clear scanner', e));
        }
      };
    }
  }, [showScanner]);
'''

# We will inject it right before useEffect(() => { fetchData(); }, []);
pattern = re.compile(r'\s*useEffect\(\(\) => \{ fetchData\(\); \}, \[\]\);', re.DOTALL)

if pattern.search(content):
    content = pattern.sub(scanner_effect + "\n\n  useEffect(() => { fetchData(); }, []);", content)
    print("Injected useEffect for scanner")
else:
    print("Could not find useEffect to replace")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
