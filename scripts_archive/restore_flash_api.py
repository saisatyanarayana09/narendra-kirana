import re

filepath = 'backend/store/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

flash_serializer = """class FlashAnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashAnnouncement
        fields = '__all__'

class StoreSettingsSerializer"""
content = content.replace("class StoreSettingsSerializer", flash_serializer)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

filepath = 'backend/store/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure imports are there
content = content.replace('from .models import StoreSettings, Feedback, HomepageSection', 'from .models import StoreSettings, Feedback, HomepageSection, FlashAnnouncement')
content = content.replace('from .serializers import StoreSettingsSerializer, FeedbackSerializer, HomepageSectionSerializer', 'from .serializers import StoreSettingsSerializer, FeedbackSerializer, HomepageSectionSerializer, FlashAnnouncementSerializer')

flash_view = """class FlashAnnouncementViewSet(viewsets.ModelViewSet):
    queryset = FlashAnnouncement.objects.all()
    serializer_class = FlashAnnouncementSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_staff or getattr(self.request.user, 'is_owner', False):
            return qs
        return qs.filter(is_active=True)

    @action(detail=False, methods=['post'], permission_classes=[IsOwnerUser])
    def reorder(self, request):
        updates = request.data
        anns = []
        for update in updates:
            a = FlashAnnouncement(id=update['id'], display_order=update['display_order'])
            anns.append(a)
        FlashAnnouncement.objects.bulk_update(anns, ['display_order'])
        return Response({'status': 'reordered'})
"""
content = content + "\n\n" + flash_view

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

filepath = 'backend/store/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("router.register(r'homepage-sections', HomepageSectionViewSet)", "router.register(r'homepage-sections', HomepageSectionViewSet)\nrouter.register(r'announcements', FlashAnnouncementViewSet)")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
