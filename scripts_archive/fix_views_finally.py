import re

filepath = 'backend/store/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("class FlashAnnouncementViewSet")
content = content[:start_idx]

correct_view = """class FlashAnnouncementViewSet(viewsets.ModelViewSet):
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

content = content.strip() + "\n\n\n" + correct_view

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
