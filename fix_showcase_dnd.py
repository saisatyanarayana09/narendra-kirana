import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace root div
content = content.replace('<div className="max-w-6xl mx-auto space-y-6">', '<DragDropContext onDragEnd={handleDragEnd}>\n      <div className="max-w-6xl mx-auto space-y-6">')

# Remove first inner DragDropContext (Announcements)
content = content.replace('<DragDropContext onDragEnd={handleDragEnd}>\n            <Droppable droppableId="announcements-list"', '<Droppable droppableId="announcements-list"')
# Remove its closing tag (the first match of </DragDropContext>)
content = content.replace('</Droppable>\n          </DragDropContext>', '</Droppable>', 1)

# Remove second inner DragDropContext (Banners)
content = content.replace('<DragDropContext onDragEnd={handleDragEnd}>\n            <Droppable droppableId="banners-list"', '<Droppable droppableId="banners-list"')
content = content.replace('</Droppable>\n          </DragDropContext>', '</Droppable>', 1)

# Remove third inner DragDropContext (Sections)
content = content.replace('<DragDropContext onDragEnd={handleDragEnd}>\n        <Droppable droppableId="homepage-sections"', '<Droppable droppableId="homepage-sections"')
content = content.replace('</Droppable>\n      </DragDropContext>', '</Droppable>', 1)

# Add closing tag to the end of the return statement
content = content.replace('</div>\n  );\n}', '</div>\n      </DragDropContext>\n  );\n}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
