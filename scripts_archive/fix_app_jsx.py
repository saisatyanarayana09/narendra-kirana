import os

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_jsx = """function CustomerApp() {
 return (
 <OfflineBanner />
      <CartProvider>
 <Outlet />
 </CartProvider>
 );
}"""

new_jsx = """function CustomerApp() {
 return (
   <>
     <OfflineBanner />
     <CartProvider>
       <Outlet />
     </CartProvider>
   </>
 );
}"""

content = content.replace(old_jsx, new_jsx)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
