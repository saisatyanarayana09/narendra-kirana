# Comprehensive Security Audit Report: Smart-Kirana (Pass 1 & Pass 2)

> **Audit Framework**: [Cloudflare Security Audit Skill](https://github.com/cloudflare/security-audit-skill)  
> **Target**: Smart-Kirana (E-Commerce Multi-Portal Monorepo: Django REST Backend, React Web, React Native Mobile)  
> **Evaluation Mode**: Source-First Defensive Code Audit, Threat Modeling & Remediation Verification  
> **Audit Status**: Complete (Pass 1 + Pass 2 Remediated & Verified)

---

## 1. Executive Summary

A two-pass deep security audit of the **Smart-Kirana** codebase was conducted following the **Cloudflare Security Audit Skill** (`SKILL.md` and `ATTACK-CLASSES.md`) methodology. The platform comprises a **Django REST Framework (DRF)** backend with **Django Channels (ASGI)** WebSockets, a **React/Vite** web frontend (customer, owner, and delivery portals), and **React Native Expo** mobile applications.

Across both passes, **12 concrete vulnerabilities** (`SK-01` through `SK-12`) were identified across trust boundaries, remediated in code, and verified with automated regression tests (`37/37` tests passing).

### Findings Breakdown by Severity

| Severity | Count | Findings | Status |
| :--- | :---: | :--- | :---: |
| **Critical** | 1 | **SK-07**: Unprotected `ReferralSettingsView` Allows Arbitrary Wallet Inflation | Remediated |
| **High** | 4 | **SK-01**: Delivery OTP Brute-Force; **SK-08**: Google OAuth Audience & Email Verification Bypass; **SK-09**: Account Lockout/Deactivation Bypass in Google OAuth & Owner Permissions; **SK-10**: Saved SMTP App Password Exfiltration & SSRF via `config_override` | Remediated |
| **Medium** | 4 | **SK-02**: Wildcard Vercel CORS/CSRF Origins; **SK-03**: Plaintext SMTP App Password in API Response; **SK-04**: Inactive Global DRF Throttling; **SK-11**: Agent Self/Superuser Deactivation & Cross-User Notification/Order Note Tampering | Remediated |
| **Low** | 3 | **SK-05**: WebSocket Rider Location Spoofing; **SK-06**: Checkout Promo Expiration/Usage Validation; **SK-12**: Unbounded Audio Decode Memory DoS, Barcode URL Injection & Unthrottled Public Endpoints | Remediated |

---

## 2. Pass 1 Security Findings (SK-01 to SK-06)

- **SK-01 (High)**: Unthrottled 4-Digit Delivery Verification OTP Brute-Force (`backend/orders/delivery_views.py`) — Remediated with `UserRateThrottle`, 5-attempt cache lockout, and `secrets.compare_digest()`.
- **SK-02 (Medium)**: Overly Permissive CORS and CSRF Wildcard Regex for Vercel Subdomains (`backend/config/settings.py`) — Remediated by scoping regex to `r"^https://(narendra-kirana|smart-kirana)[a-zA-Z0-9_-]*\.vercel\.app$"`.
- **SK-03 (Medium)**: Plaintext SMTP App Password Exposed in Store Email Settings API (`backend/store/serializers.py`) — Remediated by redacting `app_password` in `to_representation()`.
- **SK-04 (Medium)**: DRF Global Throttling Inactive Across Non-Account Endpoints (`backend/config/settings.py`) — Remediated by registering `AnonRateThrottle` and `UserRateThrottle` in `DEFAULT_THROTTLE_CLASSES`.
- **SK-05 (Low)**: Missing Delivery Partner Authorization on Order Tracking WebSocket (`backend/orders/consumers.py`) — Remediated by restricting `RIDER_LOCATION_UPDATE` frames to delivery partners and staff/owners.
- **SK-06 (Low)**: Missing Promo Code Expiration and Usage Validation During Cart Calculation (`backend/cart/serializers.py`) — Remediated by verifying `expiration_date` and `max_uses_per_user` in `CartSerializer._calculate_totals()`.

---

## 3. Pass 2 Deep Audit Findings (SK-07 to SK-12)

### Finding SK-07: Unprotected `ReferralSettingsView` Allows Arbitrary Wallet Balance Inflation
- **Severity**: **Critical** | **Status**: **Remediated**
- **Affected File**: `backend/offers/views.py`
- **Root Cause**: `ReferralSettingsView` (`RetrieveUpdateAPIView`) used `permission_classes = [permissions.IsAuthenticated]` for all methods (`GET`, `PUT`, `PATCH`), allowing any authenticated customer to modify `is_active`, `referee_reward`, and `referrer_reward` on the store singleton and immediately credit arbitrary wallet balance on signup.
- **Remediation**: Restricted `PUT`/`PATCH` on `ReferralSettingsView` to `IsOwnerUser` via `get_permissions()`.

### Finding SK-08: Google OAuth Audience (`aud`) Verification Bypass & Unverified Email Acceptance
- **Severity**: **High** | **Status**: **Remediated**
- **Affected File**: `backend/accounts/views.py`
- **Root Cause**: `_verify_google_credential()` called `verify_oauth2_token` with `audience=None` whenever `GOOGLE_CLIENT_ID` was unset in the environment, and did not check `email_verified`.
- **Remediation**: Defaulted `client_id` to `DEFAULT_ADMIN_GOOGLE_CLIENT_ID` when `GOOGLE_CLIENT_ID` is unset and enforced `email_verified` validation across both `access_token` and `id_token` flows.

### Finding SK-09: Account Lockout (`is_locked`) & Deactivation (`is_active`) Bypass in Google OAuth & Owner Permissions
- **Severity**: **High** | **Status**: **Remediated**
- **Affected Files**: `backend/accounts/views.py`, `backend/accounts/permissions.py`
- **Root Cause**: `GoogleOwnerLoginView` and `admin_google_login` did not check `user.is_active` or `user.is_locked`; `GoogleDeliveryLoginView` omitted `user.is_locked`; `GoogleCustomerAuthView` reactivated inactive existing users; `IsOwnerUser` and `IsOwnerOrReadOnly` omitted `is_active` and `is_locked` checks.
- **Remediation**: Enforced `user.is_active` and `not user.is_locked` across all Google OAuth endpoints and owner permission classes.

### Finding SK-10: Saved SMTP App Password Exfiltration & SSRF via `TestStoreEmailView` (`config_override`)
- **Severity**: **High** | **Status**: **Remediated**
- **Affected Files**: `backend/store/email_service.py`, `backend/store/serializers.py`
- **Root Cause**: `test_smtp_connection()` fell back to the saved decrypted `app_password` even when `config_override` changed `smtp_host` to an external server, and `StoreEmailSettingsSerializer.update()` retained `encrypted_app_password` when `smtp_host` was changed without a new password.
- **Remediation**: Restricted saved password fallback to matching `smtp_host` and `sender_email`, cleared stored password when `smtp_host`/`sender_email` changes without a new password, and blocked loopback/private/link-local IPs in `smtp_host`.

### Finding SK-11: Agent Self/Superuser Deactivation & Cross-User Notification/Order Note Tampering
- **Severity**: **Medium** | **Status**: **Remediated**
- **Affected Files**: `backend/accounts/views.py`, `backend/notifications/views.py`, `backend/orders/views.py`, `backend/orders/serializers.py`
- **Root Cause**: `AgentManagementView.delete()` lacked `is_owner`, self-deletion, and superuser checks; `NotificationViewSet` lacked `perform_update(user=self.request.user)`; `OrderViewSet` allowed `partial_update` for non-owners and `OrderSerializer` left `owner_note` writable.
- **Remediation**: Hardened `AgentManagementView.delete()`, pinned `user=self.request.user` in `NotificationViewSet.perform_update()`, restricted `OrderViewSet` `update`/`partial_update` to `IsOwnerUser`, and made `owner_note` read-only in `OrderSerializer`.

### Finding SK-12: Unbounded Audio Decode Memory DoS, Barcode URL Path Injection & Unthrottled Public Endpoints
- **Severity**: **Low** | **Status**: **Remediated**
- **Affected Files**: `backend/store/views.py`, `backend/products/views.py`, `backend/accounts/views.py`, `backend/notifications/views.py`
- **Remediation**: Added 5 MB upload and 10 MB decoded PCM limits in `VoiceSearchView`; validated `barcode` format (`^[A-Za-z0-9_-]{3,64}$`) in `barcode_lookup`; added `AnonRateThrottle` and CR/LF log sanitization to `ReferralLookupView`, `RecordDownloadReferralView`, and `ClientErrorLogView`.
