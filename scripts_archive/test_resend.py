import urllib.request
import json

api_key = 're_Xh4FyKKa_7rV9mcmQFuPTwqzTw8nBReu5'
subject = 'Password Reset Request - Narendra Kirana (Resend Test)'
reset_link = 'https://narendra-kirana.vercel.app/reset-password?uid=Mg&token=ddz4sm-b8fc200936e3ddbaab6b4fde0e26e632'
message = f'You are receiving this email because you requested a password reset.\n\nPlease click the link below to set a new password:\n{reset_link}\n\nThis was sent via Resend API!'

req = urllib.request.Request('https://api.resend.com/emails', method='POST')
req.add_header('Authorization', f'Bearer {api_key}')
req.add_header('Content-Type', 'application/json')

data = json.dumps({
    "from": "onboarding@resend.dev",
    "to": "saisatyanarayana2004@gmail.com",
    "subject": subject,
    "text": message
}).encode('utf-8')

try:
    with urllib.request.urlopen(req, data=data) as response:
        print("STATUS:", response.status)
        print("RESPONSE:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
