import os
import re

filepath = 'S:/smart-kirana/frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Megaphone to imports
content = content.replace("Sparkles, Zap, Star } from 'lucide-react'", "Sparkles, Zap, Star, Megaphone } from 'lucide-react'")

# Add Broadcast render logic
hook = """  {sections.map((section, index) => {
    if (section.title.startsWith('BROADCAST::')) {
        return (
          <div key={section.id} className="mx-4 sm:mx-6 md:mx-8 my-6 p-4 sm:p-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-xl flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white opacity-10 rounded-full animate-pulse"></div>
              <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0 backdrop-blur-sm">
                  <Megaphone size={28} className="animate-pulse drop-shadow-md" />
              </div>
              <p className="font-extrabold text-sm sm:text-lg leading-snug tracking-wide drop-shadow-sm">{section.title.replace('BROADCAST::', '')}</p>
          </div>
        );
    }
    
    const sectionProducts = (section.items || []).filter(item => item.is_in_stock);"""

old_hook = """  {sections.map((section, index) => {
    const sectionProducts = (section.items || []).filter(item => item.is_in_stock);"""

content = content.replace(old_hook, hook)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Broadcast Fixed")
