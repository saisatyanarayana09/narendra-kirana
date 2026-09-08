from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed


class SafeJWTAuthentication(JWTAuthentication):
    """
    Standard SimpleJWT JWTAuthentication raises InvalidToken (resulting in HTTP 401)
    immediately during request.user evaluation whenever an Authorization: Bearer <token>
    header is present but expired, malformed, or invalid.

    In Single-Page Applications and Mobile Apps, clients may send stale/expired tokens
    while visiting public endpoints (e.g. GET /store/settings/, GET /products/, GET /categories/).
    Standard DRF aborts the entire request with 401 before checking view permissions,
    preventing users or the mobile app startup from viewing public store settings or catalogs.

    SafeJWTAuthentication catches InvalidToken / AuthenticationFailed and returns None,
    allowing DRF to treat the caller as an AnonymousUser:
    - Public views (AllowAny) proceed with HTTP 200 OK.
    - Protected views (IsAuthenticated, IsOwnerUser, IsCustomerUser) will still correctly
      reject unauthenticated requests with HTTP 401/403.
    """

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, AuthenticationFailed):
            return None
