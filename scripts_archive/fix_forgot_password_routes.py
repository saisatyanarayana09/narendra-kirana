import re

filepath = 'frontend/src/App.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports for VerifyEmail, ForgotPassword, ResetPassword
imports_to_add = '''
import { VerifyEmail } from './VerifyEmail';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';
'''

if 'VerifyEmail' not in content:
    content = content.replace("import { Toaster } from 'react-hot-toast';", "import { Toaster } from 'react-hot-toast';\n" + imports_to_add)

# Add routes right after CustomerSignupPage route
target_route = '<Route path="/signup" element={<CustomerSignupPage />} />'
routes_to_add = '''
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password" element={<ResetPassword />} />
'''

if '<Route path="/forgot-password"' not in content:
    content = content.replace(target_route, target_route + routes_to_add)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
