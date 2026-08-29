with open('frontend/src/owner/pages/Login.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''type="password"
                required
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="Enter your password"
              />
            </div>
          </div>'''
replacement = target + '''
          <div className="flex justify-end mt-2">
            <Link to="/forgot-password" className="text-sm font-bold text-emerald-700 hover:underline">Forgot password?</Link>
          </div>'''

content = content.replace(target, replacement)

# Add Link import if not present
if "import { Link " not in content and "import { useNavigate, Link" not in content:
    content = content.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate, Link } from 'react-router-dom';")
elif "import { useNavigate }" in content:
    content = content.replace("import { useNavigate }", "import { useNavigate, Link }")

with open('frontend/src/owner/pages/Login.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
