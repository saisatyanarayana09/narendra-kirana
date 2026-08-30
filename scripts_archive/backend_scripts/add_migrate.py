import os

filepath = 'accounts/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_view = '''
from django.core.management import call_command

class RunMigrateView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        try:
            call_command('migrate')
            return Response({'status': 'Database migrated successfully!'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
'''

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content + "\n" + new_view)
