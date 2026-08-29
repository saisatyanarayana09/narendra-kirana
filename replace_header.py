with open('frontend/src/owner/pages/Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the start and end markers of the block to replace
start_marker = "{/* Top Header & Store Status */}"
end_marker = "{/* Action Center */}"

start_index = content.find(start_marker)
end_index = content.find(end_marker)

if start_index != -1 and end_index != -1:
    new_jsx = '''{/* Welcome Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{greeting}, {ownerName}! {emoji}</h1>
        <p className="text-slate-500 mt-1">
          You have <span className="font-bold text-indigo-600">{pendingCount}</span> active {pendingCount === 1 ? 'order' : 'orders'} in the queue today.
        </p>
      </div>

      '''
    
    # Replace the chunk
    content = content[:start_index] + new_jsx + content[end_index:]
    
    with open('frontend/src/owner/pages/Dashboard.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully")
else:
    print("Markers not found")
