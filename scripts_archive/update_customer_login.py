with open('frontend/src/cart.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add link to forgot password in the login form. 
# Search for the password input block and the submit button.
target = '''onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"/></label>'''
replacement = target + '''
<div className="flex justify-end mt-2">
  <Link to="/forgot-password" className="text-sm font-bold text-primary-700 hover:underline">Forgot password?</Link>
</div>'''

content = content.replace(target, replacement)

with open('frontend/src/cart.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
