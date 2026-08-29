import re

filepath = 'backend/store/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Just replace the duplicate imports
content = content.replace(', FlashAnnouncement, FlashAnnouncement', ', FlashAnnouncement')
content = content.replace(', FlashAnnouncementSerializer, FlashAnnouncementSerializer', ', FlashAnnouncementSerializer')

# Using re.sub with \nclass  so we don't hit serializer_class
content = re.sub(r'\nclass FlashAnnouncementViewSet\(viewsets\.ModelViewSet\):[\s\S]*?(?=\nclass |$)', '', content)

correct_view = """
class FlashAnnouncementViewSet(viewsets.ModelViewSet):
    queryset = FlashAnnouncement.objects.all()
    serializer_class = FlashAnnouncementSerializer
    permission_classes = [IsOwnerOrReadOnly]
    pagination_class = None

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
            try:
                a = FlashAnnouncement(id=int(update['id']), display_order=int(update['display_order']))
                anns.append(a)
            except (KeyError, ValueError, TypeError):
                continue
        if anns:
            FlashAnnouncement.objects.bulk_update(anns, ['display_order'])
        return Response({'status': 'reordered'})
"""

content = content.strip() + "\n\n" + correct_view

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
