import os
import re

filepath = 'backend/accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make email search case-insensitive
content = content.replace(
    "user = User.objects.filter(email=email).first()",
    "user = User.objects.filter(email__iexact=email).first()"
)

# Put send_mail in a background thread
old_send = '''            try:
                send_mail(
                    'Password Reset Request - Narendra Kirana',
                    f'You are receiving this email because you requested a password reset.\\n\\nPlease click the link below to set a new password:\\n{reset_link}\\n\\nIf you did not request this, please ignore this email.',
                    getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@narendra-kirana.com'),
                    [user.email],
                    fail_silently=True,
                )
            except Exception as e:
                print("Email sending failed:", str(e))'''

new_send = '''            import threading
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
            
            # Run in a background thread to prevent API blocking
            threading.Thread(target=send_reset_email).start()'''

content = content.replace(old_send, new_send)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
