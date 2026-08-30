import os

files = ['frontend/src/ForgotPassword.jsx', 'frontend/src/ResetPassword.jsx', 'frontend/src/VerifyEmail.jsx']

for file in files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace the bad import with the correct one
        content = content.replace("import { api } from './vendor-http';", "import api from './services/api';")
        content = content.replace('import { api } from "./vendor-http";', "import api from './services/api';")
        
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
            
print('Done fixing imports')
