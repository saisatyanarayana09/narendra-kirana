import re

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add the import
if 'import { VerifyEmail } from "./VerifyEmail";' not in content:
    content = content.replace("import { CartPage, CheckoutPage, LoginPage, SignupPage } from './cart';", "import { CartPage, CheckoutPage, LoginPage, SignupPage } from './cart';\nimport { VerifyEmail } from './VerifyEmail';")

# Add the route
if '<Route path="/verify-email" element={<VerifyEmail />} />' not in content:
    content = content.replace('<Route path="/signup" element={<SignupPage />} />', '<Route path="/signup" element={<SignupPage />} />\n        <Route path="/verify-email" element={<VerifyEmail />} />')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
