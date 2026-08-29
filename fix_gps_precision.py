import os
import re

filepath = 'frontend/src/cart.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_code = "(pos) => setAddressForm({...addressForm, latitude: pos.coords.latitude, longitude: pos.coords.longitude}),"
new_code = "(pos) => setAddressForm({...addressForm, latitude: parseFloat(pos.coords.latitude.toFixed(6)), longitude: parseFloat(pos.coords.longitude.toFixed(6))}),"

content = content.replace(old_code, new_code)

# Let's also surface the actual error from the backend instead of just 'Failed to save address.'
# So the user can see what's wrong in the future.
old_catch = """    } catch (err) {
       setError('Failed to save address.');
     }"""
new_catch = """    } catch (err) {
       setError(err.response?.data?.latitude?.[0] || err.response?.data?.detail || 'Failed to save address.');
     }"""
content = content.replace(old_catch, new_catch)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
