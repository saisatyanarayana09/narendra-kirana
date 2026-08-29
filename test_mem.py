import os
import psutil
import io
from PIL import Image

def test():
    process = psutil.Process(os.getpid())
    print("Memory before rembg import:", process.memory_info().rss / 1024 / 1024, "MB")
    
    os.environ["U2NET_HOME"] = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".u2net")
    from rembg import remove, new_session
    print("Memory after import:", process.memory_info().rss / 1024 / 1024, "MB")
    
    session = new_session("u2netp")
    print("Memory after new_session:", process.memory_info().rss / 1024 / 1024, "MB")
    
    # Dummy image
    img = Image.new('RGB', (500, 500), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    
    out = remove(img_byte_arr.getvalue(), session=session)
    print("Memory after remove:", process.memory_info().rss / 1024 / 1024, "MB")

test()
