import sys

with open('backend/products/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

idx_start = content.find('        @action(detail=False, methods=[\"post\"], permission_classes=[IsOwnerOrReadOnly])\n        def analyze_image')
if idx_start == -1:
    print('Failed to find 8-space start')
    # Try finding 4-space start
    idx_start = content.find('    @action(detail=False, methods=[\"post\"], permission_classes=[IsOwnerOrReadOnly])\n    def analyze_image')
    if idx_start == -1:
        print('Failed to find 4-space start either')
        sys.exit(1)

# Find where it ends
idx_end = content.find('    @action(detail=False, methods=[\'post\'], permission_classes=[IsOwnerOrReadOnly])\n    def reorder', idx_start)
if idx_end == -1:
    print('Failed to find reorder')
    sys.exit(1)

bad_block = content[idx_start:idx_end].strip()

# Remove the block entirely
content = content[:idx_start] + content[idx_end:]

# Re-dedent the block back to 4 spaces
lines = bad_block.split('\n')
dedented_lines = []
for line in lines:
    if line.startswith('    '):
        dedented_lines.append(line[4:])
    else:
        dedented_lines.append(line)
good_block = '\n'.join(dedented_lines)

# Insert it back right before reorder
idx_reorder = content.find('    @action(detail=False, methods=[\'post\'], permission_classes=[IsOwnerOrReadOnly])\n    def reorder')

new_content = content[:idx_reorder] + good_block + '\n\n' + content[idx_reorder:]

with open('backend/products/views.py', 'w', encoding='utf-8') as f:
    f.write(new_content)
    
print('Fixed successfully!')
