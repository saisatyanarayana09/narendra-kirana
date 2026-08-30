import re

filepath = 'frontend/src/owner/pages/Referrals.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">\n              <table', '<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">\n<div className="overflow-x-auto">\n              <table')
content = content.replace('</table>\n            </div>\n          </div>', '</table>\n</div>\n            </div>\n          </div>')

content = content.replace('<div className="bg-white rounded-xl shadow-sm border border-gray-100">\n            <div className="p-4 border-b border-gray-100 bg-gray-50/50">\n              <h3 className="font-semibold text-gray-900">Referral Ledger</h3>\n            </div>\n            <table', '<div className="bg-white rounded-xl shadow-sm border border-gray-100">\n            <div className="p-4 border-b border-gray-100 bg-gray-50/50">\n              <h3 className="font-semibold text-gray-900">Referral Ledger</h3>\n            </div>\n<div className="overflow-x-auto">\n            <table')
content = content.replace('</table>\n          </div>', '</table>\n</div>\n          </div>')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
