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
    """Allow cart and checkout operations only for customer accounts."""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_customer
