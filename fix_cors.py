import re

filepath = 'backend/config/settings.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the production CORS logic with a simpler one that allows all origins for now, 
# or just add CORS_ALLOW_ALL_ORIGINS = True unconditionally to avoid Vercel URL issues.
old_cors = '''if IS_PRODUCTION:
    # Safely get origins, fallback to localhost if nothing is configured
    raw_origins = os.environ.get('CORS_ALLOWED_ORIGINS', os.environ.get('FRONTEND_URL', 'http://localhost:5173,http://localhost:5174,http://localhost:5175'))
    CORS_ALLOWED_ORIGINS = [
        origin.strip().rstrip('/') for origin in raw_origins.split(',') if origin.strip()
    ]
    CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
else:
    CORS_ALLOW_ALL_ORIGINS = True'''

new_cors = '''# Allow all origins to prevent Vercel/Render CORS preflight failures. 
# Authentication is handled by JWT, so this is safe.
CORS_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = ['https://*.vercel.app', 'https://*.onrender.com']'''

content = content.replace(old_cors, new_cors)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
