import re

filepath = 'frontend/src/customer.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add logic for banner
section_render_str = '''    {sections.map((section, index) => {
      const sectionProducts = (section.items || []).filter(item => item.is_in_stock);

      if (sectionProducts.length === 0 && !loading) return null;'''

new_section_render_str = '''    {sections.map((section, index) => {
      if (section.section_type === 'banner') {
        if (!section.banner_image) return null;
        
        const bannerContent = (
          <div className="w-full aspect-[4/1] bg-slate-100 sm:rounded-2xl overflow-hidden shadow-sm relative group cursor-pointer mb-2">
            <img 
              src={section.banner_image} 
              alt={section.title} 
              className="w-full h-full object-cover"
              style={{ backgroundAttachment: 'fixed', backgroundPosition: 'center' }} 
            />
            {/* Very subtle parallax overlay effect */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        );

        return (
          <section key={section.id} className={index === 0 ? "mt-4" : "mt-6 sm:mt-8"}>
            {section.banner_link ? (
               <Link to={section.banner_link} className="block w-full">
                 {bannerContent}
               </Link>
            ) : bannerContent}
          </section>
        );
      }

      const sectionProducts = (section.items || []).filter(item => item.is_in_stock);

      if (sectionProducts.length === 0 && !loading) return null;'''

content = content.replace(section_render_str, new_section_render_str)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
