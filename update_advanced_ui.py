import re

def refine_advanced(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Typography
    content = content.replace('font-black', 'font-semibold tracking-tight')
    content = content.replace('font-extrabold', 'font-medium')
    content = content.replace('font-bold', 'font-medium')
    content = content.replace('text-2xl', 'text-xl tracking-tight')
    
    # Border Radiuses
    content = content.replace('rounded-2xl', 'rounded-lg')
    content = content.replace('rounded-xl', 'rounded-lg')
    content = content.replace('rounded-3xl', 'rounded-xl')
    
    # Shadows
    content = content.replace('shadow-2xl', 'shadow-sm')
    content = content.replace('shadow-lg', 'shadow-sm')
    content = content.replace('shadow-md', 'shadow-sm')
    
    # Remove large background blocks and replace with white/minimal bg
    content = re.sub(r'bg-gray-50\b', 'bg-white', content)
    content = re.sub(r'bg-slate-50\b', 'bg-white', content)
    content = re.sub(r'bg-(indigo|emerald|amber|rose)-[0-9]+/[0-9]+', 'bg-white', content)
    content = re.sub(r'bg-(indigo|emerald|amber|rose)-50\b', 'bg-white', content)
    
    # Unify borders
    content = re.sub(r'border-(gray|slate|indigo|emerald|amber|rose)-[0-9]+', 'border-slate-200', content)
    content = re.sub(r'dark:border-(gray|slate|indigo|emerald|amber|rose)-[0-9]+', 'dark:border-slate-800', content)
    
    # Buttons - remove gradients, use slate-900
    content = re.sub(r'bg-gradient-[^" ]+', 'bg-slate-900 hover:bg-slate-800', content)
    content = re.sub(r'bg-indigo-600 hover:bg-indigo-700', 'bg-slate-900 hover:bg-slate-800', content)
    content = re.sub(r'bg-emerald-600 hover:bg-emerald-500', 'bg-slate-900 hover:bg-slate-800', content)
    content = re.sub(r'text-white shadow-sm shadow-indigo-[^" ]+', 'text-white shadow-sm', content)
    
    # Icon Colors
    content = re.sub(r'text-(indigo|emerald|amber|rose)-[0-9]+', 'text-slate-900 dark:text-white', content)
    
    # Active Tabs styling
    content = re.sub(
        r"'border-indigo-600 text-indigo-600[^']*'",
        "'border-slate-900 text-slate-900 dark:border-white dark:text-white bg-transparent'",
        content
    )
    content = re.sub(
        r"'border-transparent text-gray-600[^']*'",
        "'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'",
        content
    )

    # Focus rings
    content = re.sub(r'focus:ring-(indigo|emerald|amber|rose)-500', 'focus:ring-slate-900 focus:border-slate-900', content)
    
    # Switch Toggles
    content = re.sub(r'peer-checked:bg-(indigo|amber|rose|emerald)-[0-9]+', 'peer-checked:bg-slate-900', content)

    # Convert card inner backgrounds
    content = re.sub(r'bg-white dark:bg-slate-800/60', 'bg-white', content)
    content = re.sub(r'bg-white dark:bg-slate-900', 'bg-white', content)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print("AdvancedSettings refined.")

refine_advanced("s:/smart-kirana/frontend/src/owner/pages/AdvancedSettings.jsx")
