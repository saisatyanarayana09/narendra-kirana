import sys
import os
from pathlib import Path

backend_path = str(Path(__file__).resolve().parent.parent / 'backend')
sys.path.insert(0, backend_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

