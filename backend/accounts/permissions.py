from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners to edit objects.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated and request.user.is_owner

class IsOwnerUser(permissions.BasePermission):
    """
    Custom permission to only allow owners to access the view.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_owner


class IsCustomerUser(permissions.BasePermission):
    """Allow cart and checkout operations for customer accounts as well as staff and owners."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if getattr(request.user, 'is_locked', False):
            return False
        return bool(
            getattr(request.user, 'is_customer', True) or 
            request.user.is_staff or 
            request.user.is_superuser or 
            getattr(request.user, 'is_owner', False)
        )
