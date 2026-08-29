import re

filepath = 'frontend/src/owner/pages/Settings.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_btn = '''        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm disabled:bg-indigo-400">'''

new_section = '''        {/* AI Management Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="font-bold text-xl">✨</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">AI Management (API Keys)</h2>
              <p className="text-sm text-slate-500">Configure your API keys and models for automated product extraction. Leaving a key blank defaults to the server environment variable.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Google Gemini API Key (Vision)</label>
              <input 
                type="password" 
                name="gemini_api_key" 
                value={settings.gemini_api_key || ''} 
                onChange={handleChange} 
                placeholder="Leave blank to use server default"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Gemini Vision Model</label>
              <select name="gemini_vision_model" value={settings.gemini_vision_model || 'gemini-1.5-flash'} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all">
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & Free)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Accuracy)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Groq API Key (Text Generation)</label>
              <input 
                type="password" 
                name="groq_api_key" 
                value={settings.groq_api_key || ''} 
                onChange={handleChange} 
                placeholder="Leave blank to use server default"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Groq Text Model</label>
              <select name="groq_text_model" value={settings.groq_text_model || 'llama3-8b-8192'} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all">
                <option value="llama3-8b-8192">LLaMA 3 8B (Fast)</option>
                <option value="llama3-70b-8192">LLaMA 3 70B (High Quality)</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                <option value="gemma2-9b-it">Gemma 2 9B</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm disabled:bg-indigo-400">'''

content = content.replace(old_btn, new_section)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Injected AI Management UI")
