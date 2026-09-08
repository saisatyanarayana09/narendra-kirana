import time
import io
import wave

from django.db import connection
from django.http import JsonResponse
from django.utils import timezone
from django.views import View
from django.views.generic import TemplateView
from rest_framework import views, response, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from accounts.permissions import IsOwnerUser, IsOwnerOrReadOnly
from .models import StoreSettings, Feedback, HomepageSection, StoreEmailSettings
from .serializers import (
    StoreSettingsSerializer, 
    FeedbackSerializer, 
    HomepageSectionSerializer,
    StoreEmailSettingsSerializer
)


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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_authenticators(self):
        if self.request.method in ['GET', 'OPTIONS', 'HEAD']:
            return []
        return super().get_authenticators()

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

    def put(self, request):
        return self.patch(request)


class StoreEmailSettingsView(views.APIView):
    permission_classes = [IsOwnerUser]

    def get(self, request):
        email_settings = StoreEmailSettings.load()
        serializer = StoreEmailSettingsSerializer(email_settings, context={'request': request})
        return response.Response(serializer.data)

    def patch(self, request):
        email_settings = StoreEmailSettings.load()
        serializer = StoreEmailSettingsSerializer(email_settings, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return response.Response(serializer.data)
        return response.Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request):
        return self.patch(request)


class TestStoreEmailView(views.APIView):
    permission_classes = [IsOwnerUser]

    def post(self, request):
        from .email_service import test_smtp_connection
        from django.utils import timezone

        test_email = request.data.get('test_email')
        if not test_email or '@' not in test_email:
            return response.Response(
                {'error': 'Please provide a valid recipient email address.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        config_override = request.data.get('config_override') or None
        success, detail = test_smtp_connection(test_email, config_override=config_override)

        # Update last tested timestamp and status on StoreEmailSettings
        try:
            email_settings = StoreEmailSettings.load()
            email_settings.last_tested_at = timezone.now()
            email_settings.last_test_status = "SUCCESS" if success else f"FAILED: {detail[:200]}"
            email_settings.save()
        except Exception:
            pass

        if success:
            return response.Response({'success': True, 'message': detail})
        else:
            return response.Response({'success': False, 'error': detail}, status=status.HTTP_400_BAD_REQUEST)



import re

def strip_emojis(text):
    if not text:
        return text
    p = re.compile(r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50\u2b55\u200d\ufe0f]', flags=re.UNICODE)
    cleaned = p.sub('', text)
    return re.sub(r'\s+', ' ', cleaned).strip()

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

    def perform_create(self, serializer):
        title = serializer.validated_data.get('title', '')
        if title:
            title = strip_emojis(title)
        section = serializer.save(title=title)
        self._sync_products(section)

    def perform_update(self, serializer):
        title = serializer.validated_data.get('title', '')
        if title:
            title = strip_emojis(title)
            section = serializer.save(title=title)
        else:
            section = serializer.save()
        self._sync_products(section)

    def _sync_products(self, section):
        if 'product_ids' in self.request.data:
            product_ids = self.request.data.get('product_ids', [])
            if isinstance(product_ids, list):
                from .models import HomepageSectionProduct
                from products.models import Product

                section.section_products.all().delete()
                for idx, pid in enumerate(product_ids):
                    try:
                        product = Product.objects.get(id=pid)
                        HomepageSectionProduct.objects.create(
                            section=section,
                            product=product,
                            position=idx
                        )
                    except (Product.DoesNotExist, ValueError, TypeError):
                        continue

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


class VoiceSearchView(views.APIView):
    """
    Decodes uploaded audio (m4a/aac/wav/3gp/mp3) from mobile/web clients,
    resamples to 16kHz mono WAV in-memory via PyAV, and transcribes via speech recognition.
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        audio_file = request.FILES.get('audio')
        language = request.data.get('language', 'en-IN')
        if not audio_file:
            return response.Response({'error': 'No audio file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            import av
            import speech_recognition as sr
        except ImportError:
            return response.Response(
                {'error': 'Audio processing libraries (av, SpeechRecognition) not installed on server.', 'query': '', 'text': ''},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )

        try:
            input_bytes = audio_file.read()
            in_buf = io.BytesIO(input_bytes)
            container = av.open(in_buf)
            resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)

            out_buf = io.BytesIO()
            with wave.open(out_buf, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(16000)

                for frame in container.decode(audio=0):
                    for r in resampler.resample(frame):
                        wav_file.writeframes(r.to_ndarray().tobytes())
            out_buf.seek(0)

            recognizer = sr.Recognizer()
            with sr.AudioFile(out_buf) as source:
                audio_data = recognizer.record(source)

            # Recognize using Google Speech Recognition
            query = recognizer.recognize_google(audio_data, language=language)
            return response.Response({'query': query, 'text': query})
        except sr.UnknownValueError:
            return response.Response({'query': '', 'text': '', 'detail': 'Could not understand audio.'}, status=status.HTTP_200_OK)
        except sr.RequestError as e:
            return response.Response({'error': f'Speech recognition service unavailable: {e}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return response.Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

