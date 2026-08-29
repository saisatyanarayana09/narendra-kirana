import os
import re

filepath = 'accounts/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "from .views import RunMigrateView",
    "from .views import OwnerCustomerDetailView, RunMigrateView"
)

content = content.replace(
    "    path('customers/<int:user_id>/approve-delete/',",
    "    path('customers/<int:pk>/details/', OwnerCustomerDetailView.as_view(), name='customer-details'),\n    path('customers/<int:user_id>/approve-delete/',"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
