import re

filepath = 'frontend/src/owner/pages/Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Logic to inject before eturn (
logic = '''
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const emoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';
  
  const getOwnerName = () => {
    try {
      const user = JSON.parse(localStorage.getItem('smart-kirana-owner-user'));
      return user?.first_name || user?.username || 'Owner';
    } catch {
      return 'Owner';
    }
  };
  const ownerName = getOwnerName();
  
  const pendingCount = orders.filter(o => ['NEW', 'ACCEPTED', 'PREPARING'].includes(o.status)).length;

  return (
'''

content = content.replace("  return (\n", logic)

# JSX replacement
old_jsx = '''          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Store Overview</h1>
            <p className="text-slate-500 mt-1">Here is what's happening with your store today.</p>
          </div>'''

new_jsx = '''          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{greeting}, {ownerName}! {emoji}</h1>
            <p className="text-slate-500 mt-1">
              You have <span className="font-bold text-indigo-600">{pendingCount}</span> active {pendingCount === 1 ? 'order' : 'orders'} in the queue.
            </p>
          </div>'''

content = content.replace(old_jsx, new_jsx)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
