# Comprehensive Security Audit Report: Smart-Kirana

> **Audit Framework**: [Cloudflare Security Audit Skill](https://github.com/cloudflare/security-audit-skill)  
> **Target**: Smart-Kirana (E-Commerce Multi-Portal Monorepo: Django REST Backend, React Web, React Native Mobile)  
> **Evaluation Mode**: Source-First Defensive Code Audit & Threat Modeling  
> **Audit Status**: Complete  

---

## 1. Executive Summary

A comprehensive multi-phase security audit of the **Smart-Kirana** codebase was conducted following the **Cloudflare Security Audit Skill** methodology. The platform comprises a **Django REST Framework (DRF)** backend with **Django Channels (ASGI)** WebSockets, a **React/Vite** web frontend (customer, owner, and delivery portals), and **React Native Expo** mobile applications.

The overall security posture of the application is **strong in foundational data isolation and ORM safety** (parameterized queries, deterministic row locking via `select_for_update()`, image EXIF stripping with Pillow, and hardware-backed mobile token storage via `expo-secure-store`). However, the audit identified **6 specific boundary issues and configuration gaps** that should be resolved to prevent brute-force attacks, cross-origin abuse, and credential exposure.

### Findings Breakdown by Severity

| Severity | Count | Primary Areas |
| :--- | :---: | :--- |
| **Critical** | 0 | None identified |
| **High** | 1 | Delivery Verification OTP Brute-Force |
| **Medium** | 3 | Wildcard CORS/CSRF Origins, Cleartext App Password in API, Inactive Global Throttling |
| **Low** | 2 | WebSocket Rider Location Spoofing, Checkout Promo Expiration Validation |
| **Informational**| 2 | Production Secret Key Fallback, Debug Error Traces |

---

## 2. Reconnaissance & Threat Landscape

### 2.1 Technology Stack & Architectural Surfaces
- **Backend**: Python 3.13, Django 5.x, Django REST Framework, Django Channels (ASGI), SimpleJWT, PostgreSQL/SQLite, Daphne.
- **Web Frontend**: React 19, Vite, Tailwind CSS, Axios, Lucide Icons.
- **Mobile Apps**: React Native 0.86, Expo 57, React Navigation, SecureStore.
- **Real-Time Layer**: Redis / In-Memory Channel Layer over ASGI WebSockets.

### 2.2 Trust Boundaries & Roles

1. **Anonymous vs Authenticated**: Unauthenticated users can access public catalog, store hours, and signup/login/password reset.
2. **Customer vs Customer (Horizontal Multi-Tenancy)**: Cart, orders, wallet, addresses, and notifications must be strictly isolated to `request.user`.
3. **Customer vs Store Owner (Vertical Privilege Boundary)**: Catalog inventory editing, order acceptance/rejection, store settings, and database backups are restricted to owner/staff.
4. **Delivery Partner vs Order State**: Riders can only interact with assigned orders and update their delivery status.

---

## 3. Confirmed Security Findings

### Finding SK-01: Unthrottled 4-Digit Delivery Verification OTP Brute-Force
- **Severity**: **High**
- **Affected File**: `backend/orders/delivery_views.py` (lines 211-245)
- **Vulnerability Type**: Insecure Direct Authentication / Missing Rate Limiting & Attempt Lockout
- **Boundary**: Delivery Partner API -> Order Delivery Completion State

#### Description & Root Cause
When a delivery partner marks an order as delivered via `DeliveryVerifyAndCompleteView` (POST `/api/v1/delivery/orders/<pk>/complete/`), the backend verifies the customer's OTP:
1. `delivery_otp` is generated in `backend/orders/views.py` as a **4-digit numerical string** (`0000` to `9999`, exactly 10,000 combinations).
2. The view has **no attempt counter** and **no failure invalidation**. Unlike the password reset flow (`PasswordResetOTP.attempts >= 5`), the delivery OTP remains valid after unlimited failed guesses.
3. The view has **no throttle class applied**, and DRF global throttling is inactive.
4. Standard string comparison (`!=`) is used rather than constant-time comparison (`secrets.compare_digest`).

#### Impact
A rogue or compromised delivery partner can script an automated HTTP loop testing 10,000 codes in under 2 minutes, bypassing the customer verification step and falsely completing orders.

#### Recommended Minimal Fix
Add an attempt counter field (`delivery_otp_attempts`) to `Order`, enforce a maximum of 5 attempts before locking the order for store owner verification, use constant-time comparison, and attach a rate throttle.

---

### Finding SK-02: Overly Permissive CORS and CSRF Wildcard Regex for Vercel Subdomains
- **Severity**: **Medium**
- **Affected File**: `backend/config/settings.py` (lines 252-260)
- **Vulnerability Type**: Cross-Origin Resource Sharing (CORS) & CSRF Origin Misconfiguration
- **Boundary**: External Untrusted Web Domains -> Backend API

#### Description & Root Cause
In `backend/config/settings.py`, `CORS_ALLOWED_ORIGIN_REGEXES` matches `r"^https://.*\.vercel\.app$"`, and `CSRF_TRUSTED_ORIGINS` includes `https://*.vercel.app`. Any third-party attacker with a free Vercel account can deploy an arbitrary website (`https://evil-phishing-target.vercel.app`) that is recognized by the server as an authorized origin.

#### Recommended Minimal Fix
Remove the broad regex wildcard and restrict origins strictly to explicit environment variables (`FRONTEND_URL` / explicit domains).

---

### Finding SK-03: Plaintext SMTP App Password Exposed in Store Email Settings API
- **Severity**: **Medium**
- **Affected File**: `backend/store/serializers.py` (lines 50-52)
- **Vulnerability Type**: Sensitive Data Exposure / Cleartext Credential Serialization
- **Boundary**: Backend Database / Cipher Storage -> HTTP API Response

#### Description & Root Cause
In `StoreEmailSettingsSerializer`, `app_password` is flagged as `write_only=True`, but `to_representation()` explicitly calls `data['app_password'] = instance.get_decrypted_password() or ""` and injects the plaintext credential into the API representation.

#### Recommended Minimal Fix
Never return the decrypted password. Set `data['app_password'] = ""` in `to_representation()`. Rely on `has_password: true/false` and `masked_password: "••••••••"`.

---

### Finding SK-04: DRF Global Throttling Inactive Across Non-Account Endpoints
- **Severity**: **Medium**
- **Affected File**: `backend/config/settings.py` (lines 279-284)
- **Vulnerability Type**: Missing Default Rate Throttling / Resource Exhaustion
- **Boundary**: Public Internet -> Backend Processing & Database Connections

#### Description & Root Cause
In Django REST Framework, `DEFAULT_THROTTLE_RATES` sets thresholds, but **no throttles are executed** unless `'DEFAULT_THROTTLE_CLASSES'` is registered. All non-account endpoints (orders, cart, products) remain unthrottled globally.

#### Recommended Minimal Fix
Add `DEFAULT_THROTTLE_CLASSES` with `AnonRateThrottle` and `UserRateThrottle` to `REST_FRAMEWORK` in `settings.py`.

---

### Finding SK-05: Missing Delivery Partner Authorization on Order Tracking WebSocket
- **Severity**: **Low**
- **Affected File**: `backend/orders/consumers.py` (lines 172-195)
- **Vulnerability Type**: Missing Role Authorization on Channel Event Reception
- **Boundary**: WebSocket Channel Message -> Group Broadcast Stream

#### Description & Root Cause
In `OrderTrackingConsumer`, any participant in the channel (including the customer) can send `RIDER_LOCATION_UPDATE` frames. The consumer updates DB position only if the user has a delivery profile, but it **always broadcasts** the spoofed coordinates to everyone in the channel group.

#### Recommended Minimal Fix
Verify that the sending user is the assigned delivery partner before broadcasting coordinates to the group.

---

### Finding SK-06: Missing Promo Code Expiration and Usage Validation During Checkout
- **Severity**: **Low**
- **Affected Files**: `backend/orders/views.py` (lines 330-377) & `backend/cart/serializers.py` (lines 84-92)
- **Vulnerability Type**: Business Logic Flaw / State Invalidation
- **Boundary**: Client Cart State -> Order Placement

#### Description & Root Cause
While applying a promo code checks `expiration_date` and `max_uses_per_user`, subsequent calculations in `CartSerializer` and the checkout transaction in `OrderViewSet.create()` only check `cart.promo_code.is_active`. They do not check if `promo_code.expiration_date < timezone.now()`.

#### Recommended Minimal Fix
Add expiration check to `CartSerializer._calculate_totals()` and re-validate within `OrderViewSet.create()`.

---

## 4. Strengths Observed

1. **SQL Injection Resistance**: Full adoption of Django ORM query building without raw string interpolation or unsafe `.extra()` blocks.
2. **Race Condition Prevention**: Consistent usage of `select_for_update()` and `transaction.atomic()` during inventory deduction, cart mutations, and wallet updates.
3. **File Upload Hardening**: Profile image uploads are processed through Pillow, re-encoded strictly to JPEG, center-cropped, and EXIF metadata is stripped.
4. **Credential Storage on Mobile**: The mobile app correctly utilizes hardware-backed `expo-secure-store` for JWT access and refresh tokens.
5. **Horizontal Access Control on Invoices**: Invoice view checks `order.customer_id == request.user.id` and restricts non-owner/staff access.
