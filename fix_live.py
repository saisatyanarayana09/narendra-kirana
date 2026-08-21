import os

filepath = 'S:/smart-kirana/frontend/src/cart-context.jsx'
with open(filepath, 'r') as f:
    content = f.read()

# Add a 30s interval for fetchSettings
hook = """  useEffect(() => { 
    refresh();
    fetchSettings();
    fetchProfile();
    
    // Poll settings every 30s so store open/close is live
    const interval = setInterval(() => {
        fetchSettings();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh, fetchSettings, fetchProfile])"""

old_hook = """  useEffect(() => { 
    refresh();
    fetchSettings();
    fetchProfile();
  }, [refresh, fetchSettings, fetchProfile])"""

content = content.replace(old_hook, hook)

with open(filepath, 'w') as f:
    f.write(content)
print("Updated CartContext")
