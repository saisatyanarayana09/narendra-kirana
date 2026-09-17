from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsOwnerUser
from .models import Notification, DevicePushToken
from .serializers import NotificationSerializer, DevicePushTokenSerializer

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


class RegisterPushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        platform = request.data.get('platform', 'expo').strip().lower()
        device_name = request.data.get('device_name', '').strip()

        if not token:
            return Response({'detail': 'Push token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Update existing token to current user, or create new
        device_token, created = DevicePushToken.objects.update_or_create(
            token=token,
            defaults={
                'user': request.user,
                'platform': platform,
                'device_name': device_name,
            }
        )

        return Response(
            DevicePushTokenSerializer(device_token).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class UnregisterPushTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if token:
            DevicePushToken.objects.filter(user=request.user, token=token).delete()
        else:
            DevicePushToken.objects.filter(user=request.user).delete()

        return Response({'status': 'unregistered'}, status=status.HTTP_200_OK)


import logging
client_logger = logging.getLogger('client_errors')

class ClientErrorLogView(APIView):
    permission_classes = []

    def post(self, request):
        error_name = str(request.data.get('error_name', 'Unknown'))
        error_message = str(request.data.get('error_message', ''))
        stack = str(request.data.get('stack', ''))
        component_stack = str(request.data.get('component_stack', ''))
        app_version = str(request.data.get('app_version', ''))
        platform = str(request.data.get('platform', ''))
        user = request.user if request.user and request.user.is_authenticated else None
        user_info = f"User #{user.id} ({user.username})" if user else "Anonymous"

        client_logger.error(
            "🚨 [CLIENT CRASH REPORT] %s: %s | Platform: %s | App Version: %s | %s\nStack:\n%s\nComponent Stack:\n%s",
            error_name, error_message, platform, app_version, user_info, stack, component_stack
        )
        return Response({'status': 'logged'}, status=status.HTTP_200_OK)


