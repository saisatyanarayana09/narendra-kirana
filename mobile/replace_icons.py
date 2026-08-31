import os
import re

mappings = {
    'ArrowDownLeft': 'arrow-down-left',
    'ArrowLeft': 'arrow-left',
    'ArrowUpRight': 'arrow-up-right',
    'CheckCircle2': 'check-circle',
    'ChevronRight': 'chevron-right',
    'Circle': 'circle',
    'Clock': 'clock',
    'Copy': 'copy',
    'CreditCard': 'credit-card',
    'Eye': 'eye',
    'EyeOff': 'eye-off',
    'Gift': 'gift',
    'Grid': 'grid',
    'Heart': 'heart',
    'Home': 'home',
    'MapPin': 'map-pin',
    'Minus': 'minus',
    'Package': 'package',
    'Plus': 'plus',
    'Search': 'search',
    'Search as SearchIcon': 'search',
    'SearchIcon': 'search',
    'Share2': 'share-2',
    'ShoppingBag': 'shopping-bag',
    'ShoppingCart': 'shopping-cart',
    'Store': 'shopping-bag',
    'Tag': 'tag',
    'Trash2': 'trash-2',
    'User': 'user',
    'Wallet': 'briefcase',
    'WifiOff': 'wifi-off',
    'X': 'x'
}

for root, _, files in os.walk('src'):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()

            if 'lucide-react-native' in content:
                # Replace import
                content = re.sub(
                    r"import\s+\{([^}]+)\}\s+from\s+['\"]lucide-react-native['\"];?",
                    r"import { Feather } from '@expo/vector-icons';",
                    content
                )
                
                # Replace JSX tags
                for lucide_name, feather_name in mappings.items():
                    if lucide_name == 'Search as SearchIcon': continue
                    
                    # Self-closing tag <Icon size={24} /> -> <Feather name="icon" size={24} />
                    content = re.sub(
                        r"<" + lucide_name + r"([^>]*?)/>",
                        r'<Feather name="' + feather_name + r'"\1/>',
                        content
                    )
                    
                    # Open tag <Icon ...> -> <Feather name="icon" ...>
                    content = re.sub(
                        r"<" + lucide_name + r"([^>]*?)>",
                        r'<Feather name="' + feather_name + r'"\1>',
                        content
                    )
                    
                    # Close tag </Icon> -> </Feather>
                    content = re.sub(
                        r"</" + lucide_name + r">",
                        r'</Feather>',
                        content
                    )

                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                print(f"Updated {path}")
