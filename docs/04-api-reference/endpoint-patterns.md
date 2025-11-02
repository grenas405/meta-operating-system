# Deno Genesis API Endpoint Patterns

## Core Principles

**Direct Database Connection**: All API endpoints in Deno Genesis allow for direct database connectivity, eliminating unnecessary abstraction layers while maintaining security and performance.

**Relative Path Structure**: Endpoints use relative paths (`/api/...`) enabling flexible deployment across different domains and subdirectories.

**Consistent Response Patterns**: All endpoints follow standardized success/error response formats for predictable client-side handling.

---

## 1. Authentication Endpoints

### Pattern: `/api/auth/{action}`

**POST /api/auth/login**
```javascript
// Request Structure
{
  "username": "string",
  "password": "string"
}

// Success Response
{
  "token": "string",
  "message": "string"
}

// Error Response
{
  "error": "string"
}
```

**Implementation Characteristics:**
- JWT token-based authentication
- Secure password validation
- Token storage in localStorage on client-side
- Automatic redirect after successful authentication

---

## 2. Dashboard Data Endpoints

### Pattern: `/api/dashboard`

**GET /api/dashboard**
```javascript
// Headers Required
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

// Success Response
{
  "welcomeMessage": "string",
  "contentSections": [
    {
      "label": "string",
      "link": "string"
    }
  ],
  "systemTools": [
    {
      "label": "string", 
      "link": "string"
    }
  ]
}
```

**Implementation Characteristics:**
- Bearer token authentication required
- Structured data for dynamic UI generation
- Graceful handling of missing data fields
- Client-side DOM manipulation based on response

---

## 3. Contact Form Endpoints

### Pattern: `/api/contact`

**POST /api/contact**
```javascript
// Request Structure
{
  "name": "string",
  "email": "string|null",  // Optional
  "phone": "string",       // Required
  "message": "string"
}

// Success Response
{
  "message": "string"
}

// Error Response
{
  "error": "string"
}
```

**GET /api/contact** (Admin Only)
```javascript
// Headers Required
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

// Success Response
[
  {
    "id": "number",
    "name": "string",
    "email": "string",
    "phone": "string",
    "message": "string",
    "submitted_at": "ISO 8601 datetime"
  }
]
```

**DELETE /api/contact/{id}**
```javascript
// Headers Required
{
  "Authorization": "Bearer {token}",
  "Content-Type": "application/json"
}

// Success Response
{
  "message": "string"
}
```

---

## 4. Appointment Booking Endpoints

### Pattern: `/api/appointments`

**POST /api/appointments**
```javascript
// Request Structure
{
  "name": "string",
  "email": "string",
  "phone": "string",      // Auto-formatted to 10 digits
  "service": "string"
}

// Success Response
{
  "message": "string"
}

// Error Response
{
  "error": "string"
}
```

**Implementation Characteristics:**
- Automatic phone number normalization (digits only)
- Client-side validation before submission
- Backend site key resolution from request context
- No explicit site parameter needed in request

---

## 5. Site Settings Endpoints

### Pattern: `/api/settings`

**GET /api/settings?site={siteKey}**
```javascript
// Query Parameters
{
  "site": "string"  // Site identifier (e.g., "pedromd")
}

// Success Response
{
  "contact_email": "string",
  "business_phone": "string"
  // Additional site-specific settings
}

// Error Response
{
  "error": "string"
}
```

**Implementation Characteristics:**
- Query parameter-based site selection
- Used for dynamic content injection
- Automatic DOM element population
- Global site configuration management

---

## Standard Implementation Patterns

### Error Handling Strategy
```javascript
// Consistent error response structure
if (!res.ok) {
  const data = await res.json();
  throw new Error(data.error || "Default error message");
}
```

### Authentication Header Pattern
```javascript
// Standard Bearer token format
headers: {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
}
```

### Client-Side Validation Pattern
```javascript
// Pre-submission validation
if (!requiredField) {
  displayMessage("Error message", "error");
  showNotification("❌ Validation failed", "error");
  return;
}
```

### Response Processing Pattern
```javascript
// Standard success/error handling
if (res.ok) {
  displayMessage(data.message || "✅ Success!", "success");
  showNotification("✅ Operation completed!", "success");
  form.reset(); // If applicable
} else {
  displayMessage(data.error || "❌ Error occurred", "error");
  showNotification(data.error || "❌ Operation failed", "error");
}
```

---

## Database Integration Characteristics

### Direct Connection Pattern
- No middleware abstraction between API and database
- Site-specific database configuration resolution
- Automatic connection pooling and management
- Transaction support for complex operations

### Site Context Resolution
- Backend automatically determines site context from:
  - Request domain/host headers
  - URL path analysis
  - Session/token-based site association
- No need for explicit site parameters in most requests

### Security Considerations
- JWT token validation for protected endpoints
- SQL injection prevention through parameterized queries
- Input sanitization and validation
- Role-based access control for administrative functions

---

## Frontend Integration Standards

### Notification System
All endpoints integrate with a unified notification system:
```javascript
import { showNotification } from "./notifications.js";

// Usage after API calls
showNotification("✅ Success message", "success");
showNotification("❌ Error message", "error");
showNotification("ℹ️ Info message", "info");
```

### Form Integration
Standard form handling pattern:
```javascript
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  
  // Validation, API call, response handling
});
```

### Response Message Display
Consistent UI feedback mechanism:
```javascript
function displayMessage(text, type) {
  messageElement.textContent = text;
  messageElement.style.color = type === "success" ? "green" : "red";
}
```

---

## Deployment Considerations

### Environment Flexibility
- Relative API paths work across different deployment contexts
- No hardcoded domain dependencies
- Environment-based configuration resolution

### Scalability Support  
- Direct database connections for optimal performance
- Stateless API design for horizontal scaling
- Cacheable response patterns where appropriate

### Development/Production Parity
- Same API patterns work in both environments
- Environment-specific configuration through backend resolution
- Consistent error handling and logging across environments