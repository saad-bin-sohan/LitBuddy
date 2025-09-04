# Google Sign-In Implementation

## Overview

This document describes the implementation of Google sign-in functionality for the LitBuddy web application. The feature allows users who previously signed up using Google authentication to sign in using the same Google account.

## Implementation Details

### Backend (No Changes Required)

The backend already supports both Google sign-up and sign-in scenarios through the existing `handleGoogleCallback` function in `backend/controllers/googleAuthController.js`. This function:

1. **Checks for existing users**: First looks for a user with the provided Google ID
2. **Handles new users**: If no user exists with that Google ID, creates a new account
3. **Handles existing users**: If a user exists, logs them in automatically
4. **Prevents conflicts**: Checks if an email already exists with a non-Google account

### Frontend Changes

#### Login Page (`frontend/src/pages/Login.js`)

Added Google sign-in functionality to the existing login form:

1. **Import**: Added `GoogleAuth` component import
2. **Button Placement**: Added Google sign-in button below the regular login form
3. **Error Handling**: Integrated with existing error display system
4. **Success Handling**: Redirects users based on profile completion status

#### Key Features

- **Seamless Integration**: Google sign-in button appears below the regular login form
- **Consistent Styling**: Uses existing auth-divider and Google button styles
- **Error Handling**: Displays errors in the same format as other login errors
- **Smart Redirects**: 
  - Users with incomplete profiles → `/profile-setup`
  - Users with complete profiles → `/my-profile`

### User Flow

1. **New Google User (Sign-up)**:
   - User clicks "Sign in with Google"
   - Google OAuth flow completes
   - Backend creates new account
   - User redirected to profile setup

2. **Existing Google User (Sign-in)**:
   - User clicks "Sign in with Google"
   - Google OAuth flow completes
   - Backend finds existing account
   - User automatically logged in
   - User redirected to appropriate page based on profile completion

3. **Conflict Handling**:
   - If email exists but not as Google user → Error message
   - If account is suspended → Error message with suspension details

### Technical Implementation

#### GoogleAuth Component

The `GoogleAuth` component (`frontend/src/components/GoogleAuth.js`) handles:
- Google OAuth flow using `@react-oauth/google`
- JWT token parsing for user information
- Backend API communication
- Success/error callback handling

#### API Endpoints

- `POST /api/auth/google/callback` - Handles Google OAuth callback
- `POST /api/auth/google/check` - Checks if user exists with Google ID

### Security Considerations

- **Token-based Authentication**: Uses JWT tokens stored in httpOnly cookies
- **Account Verification**: Google users are automatically verified
- **Suspension Handling**: Suspended accounts cannot sign in
- **Email Conflict Prevention**: Prevents account conflicts between Google and regular users

### Styling

The implementation uses existing CSS classes:
- `.auth-divider` - Container for Google button
- `.google-auth-btn` - Button styling
- `.google-auth-button` - Google button appearance
- Responsive design with hover effects and focus states

### Testing

To test the implementation:

1. **Start the servers**:
   ```bash
   # Backend
   cd backend && npm start
   
   # Frontend
   cd frontend && npm start
   ```

2. **Test Google Sign-in**:
   - Navigate to `/login`
   - Click "Sign in with Google"
   - Complete Google OAuth flow
   - Verify successful login and redirect

3. **Test Error Handling**:
   - Try signing in with a Google account that doesn't exist
   - Verify appropriate error messages

### Future Enhancements

Potential improvements:
- Add loading states during Google OAuth
- Implement Google account linking for existing non-Google users
- Add Google account unlinking functionality
- Enhanced error messages for different failure scenarios
