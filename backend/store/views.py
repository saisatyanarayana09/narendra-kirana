from rest_framework import views, response, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from accounts.permissions import IsOwnerUser
from .models import StoreSettings, Feedback, HomepageSection
from .serializers import StoreSettingsSerializer, FeedbackSerializer, HomepageSectionSerializer


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
    queryset = HomepageSection.objects.all()
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
        for item in request.data:
            HomepageSection.objects.filter(id=item.get('id')).update(display_order=item.get('display_order', 0))
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
