import os
import re

filepath = 'backend/accounts/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_email_block = '''        try:
            send_mail(
                'Activate Your Narendra Kirana Account',
                f'Welcome to Narendra Kirana!\\n\\nPlease click the link below to activate your account:\\n{verify_link}',
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@narendra-kirana.com'),
                [user.email],
                fail_silently=True,
            )
        except Exception as e:
            print("Email sending failed:", str(e))'''

new_email_block = '''        try:
            import threading
            import urllib.request
            import json
            import os

            def send_activation_email_bg():
                brevo_api_key = os.environ.get('BREVO_API_KEY')
                resend_api_key = os.environ.get('RESEND_API_KEY')
                sender_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'saisatyanarayana2004@gmail.com'
                subject = 'Activate Your Narendra Kirana Account'
                message = f'Welcome to Narendra Kirana!\\n\\nPlease click the link below to activate your account:\\n{verify_link}'

                # 1. Try Brevo HTTPS API
                if brevo_api_key:
                    try:
                        req = urllib.request.Request('https://api.brevo.com/v3/smtp/email', method='POST')
                        req.add_header('api-key', brevo_api_key)
                        req.add_header('Accept', 'application/json')
                        req.add_header('Content-Type', 'application/json')
                        req.add_header('User-Agent', 'Mozilla/5.0')
                        
                        data = json.dumps({
                            "sender": {"name": "Narendra Kirana", "email": sender_email},
                            "to": [{"email": user.email}],
                            "subject": subject,
                            "textContent": message
                        }).encode('utf-8')
                        
                        urllib.request.urlopen(req, data=data, timeout=10)
                        return
                    except Exception as e:
                        print("Brevo API failed:", str(e))

                # 2. Try Resend HTTPS API
                if resend_api_key:
                    try:
                        req = urllib.request.Request('https://api.resend.com/emails', method='POST')
                        req.add_header('User-Agent', 'Mozilla/5.0')
                        req.add_header('Authorization', f'Bearer {resend_api_key}')
                        req.add_header('Content-Type', 'application/json')
                        data = json.dumps({
                            "from": "onboarding@resend.dev",
                            "to": user.email,
                            "subject": subject,
                            "text": message
                        }).encode('utf-8')
                        urllib.request.urlopen(req, data=data, timeout=10)
                        return
                    except Exception as e:
                        pass
                
                # 3. Fallback to standard SMTP
                try:
                    from django.core.mail import send_mail
                    send_mail(subject, message, getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@narendra-kirana.com'), [user.email], fail_silently=True)
                except Exception as e:
                    pass

            # Run in a background thread to prevent blocking
            threading.Thread(target=send_activation_email_bg).start()
        except Exception as e:
            print("Failed to start email thread:", str(e))'''

content = content.replace(old_email_block, new_email_block)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
