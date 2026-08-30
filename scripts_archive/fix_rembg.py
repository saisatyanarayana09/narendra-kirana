import re

filepath = 'backend/services/image_enhancement_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad_rembg = '''try:
    from rembg import remove, new_session
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

_rembg_session = None
def get_rembg_session():
    global _rembg_session
    if _rembg_session is None and REMBG_AVAILABLE:
        try:
            # Lazy initialize the small, fast, low-memory model (u2netp)
            _rembg_session = new_session("u2netp")
        except Exception as e:
            logger.error(f"Failed to initialize rembg session: {e}")
    return _rembg_session'''

good_rembg = '''import os
# Ensure u2net models download to the project directory where we have write access!
os.environ["U2NET_HOME"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".u2net")

try:
    from rembg import remove, new_session
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

_rembg_session = None
def get_rembg_session():
    global _rembg_session
    if _rembg_session is None and REMBG_AVAILABLE:
        try:
            # Ensure the directory exists
            os.makedirs(os.environ["U2NET_HOME"], exist_ok=True)
            # Lazy initialize the small, fast, low-memory model (u2netp)
            _rembg_session = new_session("u2netp")
        except Exception as e:
            logger.error(f"Failed to initialize rembg session: {e}")
    return _rembg_session'''

if bad_rembg in content:
    content = content.replace(bad_rembg, good_rembg)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed U2NET_HOME")
else:
    print("Not found")
