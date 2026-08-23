with open('S:/smart-kirana/frontend/src/customer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
start = content.find('export function ProductCard')
end = content.find('export function ProductSkeleton')
with open('pc.txt', 'w', encoding='utf-8') as f2:
    f2.write(content[start:end])
