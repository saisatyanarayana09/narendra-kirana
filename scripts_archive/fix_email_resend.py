import os

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_send = '''            import threading
            def send_reset_email():
                try:
                    send_mail(
                        'Password Reset Request - Narendra Kirana',
                        f'You are receiving this email because you requested a password reset.\\n\\nPlease click the link below to set a new password:\\n{reset_link}\\n\\nIf you did not request this, please ignore this email.',
                        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@narendra-kirana.com'),
                        [user.email],
                        fail_silently=True,
                    )
                except Exception as e:
                    print("Email sending failed:", str(e))
            
            # Run in a background thread to prevent Gunicorn timeout (Render blocks SMTP port 587)
            threading.Thread(target=send_reset_email).start()'''

new_send = '''            import threading
            import urllib.request
            import json
            
            def send_reset_email():
                resend_api_key = os.environ.get('RESEND_API_KEY')
                subject = 'Password Reset Request - Narendra Kirana'
                message = f'You are receiving this email because you requested a password reset.\\n\\nPlease click the link below to set a new password:\\n{reset_link}\\n\\nIf you did not request this, please ignore this email.'
                
                # 1. Try Resend HTTPS API (Bypasses Render's SMTP Firewall)
                if resend_api_key:
                    try:
                        req = urllib.request.Request('https://api.resend.com/emails', method='POST')
                        req.add_header('Authorization', f'Bearer {resend_api_key}')
                        req.add_header('Content-Type', 'application/json')
                        data = json.dumps({
                            "from": "onboarding@resend.dev",
                            "to": user.email,
                            "subject": subject,
                            "text": message
                        }).encode('utf-8')
                        urllib.request.urlopen(req, data=data, timeout=10)
                        print("Email sent successfully via Resend HTTPS API")
                        return
                    except Exception as e:
                        print("Resend API failed:", str(e))
                
                # 2. Fallback to Standard Django SMTP
                try:
                    send_mail(
                        subject,
                        message,
                        getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@narendra-kirana.com'),
                        [user.email],
                        fail_silently=True,
                    )
                    print("Email sent successfully via SMTP")
                except Exception as e:
                    print("SMTP Email sending failed:", str(e))
            
            # Run in a background thread to prevent Gunicorn timeout
            threading.Thread(target=send_reset_email).start()'''

content = content.replace(old_send, new_send)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
