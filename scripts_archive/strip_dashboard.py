import re
filepath = 'frontend/src/owner/pages/Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove state
content = re.sub(r'  const \[broadcast, setBroadcast\] = useState\(null\);\n  const \[broadcastText, setBroadcastText\] = useState\(\'\'\);\n  const \[broadcasting, setBroadcasting\] = useState\(false\);\n', '', content)

# Remove useEffect logic
content = re.sub(r'      const bcast = \(sectionsRes\.data \|\| \[\]\)\.find\(s => s\.title\.startsWith\(\'BROADCAST::\'\)\);\n      if \(bcast\) \{\n        setBroadcast\(bcast\);\n        setBroadcastText\(bcast\.title\.replace\(\'BROADCAST::\', \'\'\)\);\n      \}\n', '', content)

# Remove handleBroadcast
content = re.sub(r'  const handleBroadcast = async \(\) => \{.*?  \};\n\n', '', content, flags=re.DOTALL)

# Remove UI block
content = re.sub(r'        \{\/\* Broadcast Banner Tool \*\/\}[\s\S]*?\{\/\* Action Center \*\/\}', '{/* Action Center */}', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
