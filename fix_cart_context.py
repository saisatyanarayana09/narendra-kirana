import os
import re

filepath = 'S:/smart-kirana/frontend/src/cart-context.jsx'
with open(filepath, 'r') as f:
    content = f.read()

pattern = re.compile(r'useEffect\(\(\) => \{[\s\S]*?fetchProfile\(\);\s*\}, \[refresh, fetchSettings, fetchProfile\]\)')

replacement = '''useEffect(() => { 
    refresh();
    fetchSettings();
    fetchProfile();
    
    // Poll settings every 30s so store open/close is live
    const interval = setInterval(() => {
        fetchSettings();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh, fetchSettings, fetchProfile])'''

content = pattern.sub(replacement, content)

with open(filepath, 'w') as f:
    f.write(content)
