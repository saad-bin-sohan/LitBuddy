# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the LitBuddy application.

## Prerequisites

1. A Google account
2. Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Set the following:
   - **Name**: LitBuddy OAuth Client
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (for development)
     - `https://your-domain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000` (for development)
     - `https://your-domain.com` (for production)

## Step 3: Get Your Client ID

After creating the OAuth client, you'll get a Client ID. Copy this value.

## Step 4: Configure Environment Variables

### Frontend (.env file)

Create a `.env` file in the `frontend` directory with:

```
REACT_APP_BACKEND_URL=http://localhost:5001/api
REACT_APP_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

### Backend (.env file)

Create a `.env` file in the `backend` directory with:

```
# Your existing backend environment variables
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_uri
# ... other variables

# Google OAuth (optional - for additional verification)
GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
```

## Step 5: Test the Integration

1. Start your backend server: `cd backend && npm start`
2. Start your frontend server: `cd frontend && npm start`
3. Go to the registration page
4. Click "Sign up with Google"
5. Complete the Google OAuth flow
6. You should be redirected to the profile setup page

## How It Works

1. **User clicks "Sign up with Google"**: The Google OAuth flow starts
2. **Google authentication**: User authenticates with Google
3. **Backend processing**: The backend receives Google user data and:
   - Checks if a user with this Google ID already exists
   - If not, creates a new user with Google OAuth data
   - Sets `isGoogleUser: true` and `hasCompletedSetup: false`
4. **Profile setup**: User is redirected to complete their profile setup
5. **Normal flow**: After profile setup, user can use the app normally

## Security Features

- Google users are automatically verified (`isVerified: true`)
- Google users don't have passwords (they use Google authentication)
- The system prevents duplicate accounts with the same email
- Google profile pictures are stored for display purposes

## Troubleshooting

### Common Issues

1. **"Invalid client ID"**: Make sure your `REACT_APP_GOOGLE_CLIENT_ID` is correct
2. **"Redirect URI mismatch"**: Check that your redirect URIs in Google Console match your app URLs
3. **"API not enabled"**: Make sure Google+ API is enabled in your Google Cloud project

### Development vs Production

- For development: Use `http://localhost:3000`
- For production: Use your actual domain (e.g., `https://litbuddy.com`)
- Update both JavaScript origins and redirect URIs in Google Console

## Files Modified

### Backend
- `models/userModel.js`: Added Google OAuth fields
- `controllers/googleAuthController.js`: New controller for Google OAuth
- `routes/googleAuthRoutes.js`: New routes for Google OAuth
- `server.js`: Added Google OAuth routes

### Frontend
- `components/GoogleAuth.js`: Google OAuth component
- `api/authApi.js`: Added Google OAuth API functions
- `pages/Register.js`: Added Google sign-up button
- `App.js`: Added Google OAuth provider
- `styles.css`: Added Google OAuth styles

### Dependencies Added
- Backend: `passport`, `passport-google-oauth20`
- Frontend: `@react-oauth/google`
