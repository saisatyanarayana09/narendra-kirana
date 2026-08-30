import re

filepath = 'frontend/src/owner/pages/Showcase.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the inner DragDropContext tags
content = content.replace('<DragDropContext onDragEnd={handleDragEnd}>\n            <Droppable', '<Droppable')
content = content.replace('</Droppable>\n          </DragDropContext>', '</Droppable>')

content = content.replace('<DragDropContext onDragEnd={handleDragEnd}>\n        <Droppable droppableId="homepage-sections"', '<Droppable droppableId="homepage-sections"')
content = content.replace('</Droppable>\n      </DragDropContext>', '</Droppable>')

# Wrap the main container with DragDropContext
content = content.replace('<div className="max-w-4xl mx-auto space-y-6 pb-20">', '<DragDropContext onDragEnd={handleDragEnd}>\n      <div className="max-w-4xl mx-auto space-y-6 pb-20">')
content = content.replace('</div>\n  );\n}', '</div>\n      </DragDropContext>\n  );\n}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
