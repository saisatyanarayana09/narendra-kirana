import re

filepath = 'frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''
async function submit(event) {
  event.preventDefault();
  if (form.password !== form.confirm_password) {
    setError('Passwords do not match.');
    return;
  }
  setSubmitting(true);
  setError('');
  try {
    await api.post('/auth/signup/', { ...form, username: form.email });
    alert('Success! Please check your email to activate your account.');
    navigate('/login');
  } catch (requestError) {
    const details = requestError.response?.data;
    setError(details ? Object.values(details).flat().join(' ') : 'Unable to create account.');
  } finally {
    setSubmitting(false);
  }
}
'''

# We need to replace the single-line submit function
pattern = r"async function submit\(event\) \{ event\.preventDefault\(\); if \(form\.password !== form\.confirm_password\) \{ setError\('Passwords do not match\.'\); return; \} setSubmitting\(true\); setError\(''\); try \{ await api\.post\('/auth/signup/', \{ \.\.\.form, username: form\.email \}\); navigate\('/login'\) \} catch \(requestError\) \{ const details = requestError\.response\?\.data; setError\(details \? Object\.values\(details\)\.flat\(\)\.join\(' '\) : 'Unable to create account\.'\) \} finally \{ setSubmitting\(false\) \} \}"
content = re.sub(pattern, replacement, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
