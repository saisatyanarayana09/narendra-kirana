import re

filepath = 'backend/services/image_enhancement_service.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace eager initialization with lazy
bad_block = '''try:
    from rembg import remove, new_session
    # Initialize the small, fast, low-memory model (u2netp)
    REMBG_SESSION = new_session("u2netp")
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    REMBG_SESSION = None'''

good_block = '''try:
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

if bad_block in content:
    content = content.replace(bad_block, good_block)
    
    # Also replace usage
    content = content.replace('session=REMBG_SESSION', 'session=get_rembg_session()')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced lazy init")
else:
    print("Not found")
