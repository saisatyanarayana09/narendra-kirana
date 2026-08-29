import re

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

if 'import { ForgotPassword }' not in content:
    content = content.replace("import { VerifyEmail } from './VerifyEmail';", "import { VerifyEmail } from './VerifyEmail';\nimport { ForgotPassword } from './ForgotPassword';\nimport { ResetPassword } from './ResetPassword';")

if '<Route path="/forgot-password"' not in content:
    content = content.replace('<Route path="/verify-email" element={<VerifyEmail />} />', '<Route path="/verify-email" element={<VerifyEmail />} />\n        <Route path="/forgot-password" element={<ForgotPassword />} />\n        <Route path="/reset-password" element={<ResetPassword />} />')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
