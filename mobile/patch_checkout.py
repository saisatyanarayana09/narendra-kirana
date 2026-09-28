import re

with open('src/screens/cart/CheckoutScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace <TextInput with <FormInput
content = content.replace('<TextInput', '<FormInput')
content = content.replace('</TextInput>', '</FormInput>')

# Add import if not present
if 'import { FormInput }' not in content:
    content = content.replace('import { MapLocationPicker }', 'import { FormInput } from "../../components/FormInput";\nimport { MapLocationPicker }')

with open('src/screens/cart/CheckoutScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
