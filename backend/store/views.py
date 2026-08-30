import time

from django.db import connection
from django.http import JsonResponse
from django.utils import timezone
from django.views import View
from django.views.generic import TemplateView
from rest_framework import views, response, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from accounts.permissions import IsOwnerUser, IsOwnerOrReadOnly
from .models import StoreSettings, Feedback, HomepageSection
from .serializers import StoreSettingsSerializer, FeedbackSerializer, HomepageSectionSerializer


from django.shortcuts import redirect

class RootDashboardView(TemplateView):
    """Secure dashboard shown at the service root for authenticated admins."""
    template_name = 'admin/dashboard.html'
    
    def get(self, request, *args, **kwargs):
        if not request.user.is_authenticated or not request.user.is_staff:
            return redirect('/narendra_secure_vault_99/login/')
            
        # Extremely lightweight query to prevent Neon database from auto-suspending (Scale to Zero)
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        except Exception:
            pass
        return super().get(request, *args, **kwargs)


class BackendHealthView(View):
    """Small public health endpoint consumed by the root monitor page."""

    def get(self, request):
        started = time.perf_counter()
        database_status = 'connected'
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
                cursor.fetchone()
        except Exception:
            database_status = 'unavailable'

        latency_ms = round((time.perf_counter() - started) * 1000, 1)
        is_healthy = database_status == 'connected'
        return JsonResponse({
            'status': 'operational' if is_healthy else 'degraded',
            'database': database_status,
            'latency_ms': latency_ms,
            'timestamp': timezone.now().isoformat(),
            'api_base': '/api/v1/',
        }, status=200 if is_healthy else 503)


class StoreSettingsView(views.APIView):
    def get_permissions(self):
        if self.request.method in ['GET', 'OPTIONS', 'HEAD']:
            return [AllowAny()]
        return [IsOwnerUser()]

    def get(self, request):
        settings = StoreSettings.load()
        serializer = StoreSettingsSerializer(settings, context={'request': request})
        return response.Response(serializer.data)

    def patch(self, request):
        settings = StoreSettings.load()
        serializer = StoreSettingsSerializer(settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class HomepageSectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for dynamic homepage sections.
    """
    queryset = HomepageSection.objects.prefetch_related(
        'section_products__product__gallery_images',
        'section_products__product__category'
    ).all()
    serializer_class = HomepageSectionSerializer
    pagination_class = None

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsOwnerUser()]

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Expects a list of dicts: [{'id': 1, 'display_order': 0}, ...]
        """
        updates = request.data
        if not isinstance(updates, list):
            return response.Response({'error': 'Expected a list of updates'}, status=400)
            
        for item in updates:
            try:
                section_id = int(item.get('id'))
                display_order = int(item.get('display_order', 0))
                HomepageSection.objects.filter(id=section_id).update(display_order=display_order)
            except (ValueError, TypeError):
                continue
        return response.Response({'status': 'order updated'})



class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all().order_by('-created_at')
    serializer_class = FeedbackSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsOwnerUser()]

    def perform_create(self, serializer):
        customer = self.request.user if self.request.user.is_authenticated and not getattr(self.request.user, 'is_owner', False) else None
        serializer.save(customer=customer)
