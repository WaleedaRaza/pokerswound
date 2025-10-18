# User Profile API Endpoints Plan

## 1. Get User Profile
```
GET /api/v2/user/profile
Headers: Authorization: Bearer <token> (optional for guests)
Response: {
  id: string,
  username: string,
  display_name: string,
  bio: string,
  avatar_url: string,
  email: string | null,
  is_guest: boolean,
  created_at: string,
  updated_at: string
}
```

## 2. Update User Profile
```
PUT /api/v2/user/profile
Headers: Authorization: Bearer <token> (optional for guests)
Body: {
  username?: string,
  display_name?: string,
  bio?: string,
  avatar_url?: string
}
Response: {
  success: boolean,
  user: UserProfile,
  message?: string
}
```

## 3. Check Username Availability
```
GET /api/v2/user/check-username?username=<username>
Response: {
  available: boolean,
  message?: string
}
```

## 4. Upload Avatar (Future)
```
POST /api/v2/user/avatar
Headers: Content-Type: multipart/form-data
Body: FormData with image file
Response: {
  success: boolean,
  avatar_url: string
}
```

## Validation Rules:
- Username: 3-20 chars, alphanumeric + underscore/hyphen only
- Display Name: 1-50 chars, any characters
- Bio: 0-500 chars
- Username must be unique (case-insensitive)
- Rate limiting: 5 profile updates per minute per user
