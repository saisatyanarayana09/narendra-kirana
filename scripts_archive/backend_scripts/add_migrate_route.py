import os

filepath = 'accounts/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "from .views import RequestDeleteView",
    "from .views import RunMigrateView, RequestDeleteView"
)

content = content.replace(
    "    path('request-delete/',",
    "    path('trigger-migrate/', RunMigrateView.as_view()),\n    path('request-delete/',"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
