import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

offline_code = """
import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-rose-600 text-white p-2 text-center text-sm font-bold flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top">
      <WifiOff size={16} /> You are offline. Please check your internet connection.
    </div>
  );
}
"""

if "OfflineBanner" not in content:
    # Add imports
    content = content.replace("import { Toaster } from 'react-hot-toast';", "import { Toaster } from 'react-hot-toast';\nimport { WifiOff } from 'lucide-react';")
    
    # Add the component
    content = content.replace("function App() {", offline_code + "\nfunction App() {")
    
    # Render it inside Router
    content = content.replace("<CartProvider>", "<OfflineBanner />\n      <CartProvider>")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
