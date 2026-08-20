from rest_framework import viewsets, generics
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsOwnerUser
from .models import Notification
from .serializers import NotificationSerializer

class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class OwnerNotificationCreateView(generics.CreateAPIView):
    permission_classes = [IsOwnerUser]
    serializer_class = NotificationSerializer

    def perform_create(self, serializer):
        # Allow owner to create a notification for any user.
        # The user field must be provided in the request payload.
        serializer.save()
