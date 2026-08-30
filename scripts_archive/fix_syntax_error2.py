with open('backend/accounts/serializers.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "f'Welcome to Narendra Kirana!" in line:
        skip = True
        new_lines.append("                f'Welcome to Narendra Kirana!\\n\\nPlease click the link below to activate your account:\\n{verify_link}',\n")
        continue
    if skip:
        if "{verify_link}'" in line:
            skip = False
        continue
    new_lines.append(line)

with open('backend/accounts/serializers.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
