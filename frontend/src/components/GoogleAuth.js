// frontend/src/components/GoogleAuth.js

import React, { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { AuthContext } from '../contexts/AuthContext';
import { googleAuthCallback } from '../api/authApi';

const GoogleAuth = ({ onSuccess, onError, buttonText = "Sign up with Google", className = "" }) => {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (response) => {
    try {
      console.log('Google response:', response);
      
      let googleData;
      
      // Handle different response formats based on flow type
      if (response.credential) {
        // Implicit flow - credential is a JWT token
        console.log('Using implicit flow with credential');
        try {
          if (typeof response.credential !== 'string') {
            throw new Error('Credential is not a string');
          }
          
          const parts = response.credential.split('.');
          if (parts.length !== 3) {
            throw new Error('Invalid JWT format: expected 3 parts');
          }
          
          const payload = JSON.parse(atob(parts[1]));
          console.log('Decoded payload:', payload);
          googleData = {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture
          };
        } catch (parseError) {
          console.error('Error parsing credential:', parseError);
          throw new Error('Failed to parse Google credential');
        }
      } else if (response.access_token) {
        // Auth code flow - we need to get user info from Google
        console.log('Using auth code flow with access_token');
        try {
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${response.access_token}`,
            },
          });
          
          if (!userInfoResponse.ok) {
            throw new Error('Failed to fetch user info from Google');
          }
          
          const userInfo = await userInfoResponse.json();
          console.log('User info from Google:', userInfo);
          googleData = {
            googleId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
          };
        } catch (fetchError) {
          console.error('Error fetching user info:', fetchError);
          throw new Error('Failed to get user information from Google');
        }
      } else {
        console.error('Unexpected response format:', response);
        throw new Error('Unexpected Google response format');
      }

      if (!googleData.googleId || !googleData.email) {
        console.error('Missing required data:', googleData);
        throw new Error('Missing required Google user information');
      }

      console.log('Sending to backend:', googleData);

      // Call our backend to handle the Google OAuth
      const data = await googleAuthCallback(googleData);
      
      console.log('Backend response:', data);
      
      // Set user in context
      setUser(data.user);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(data.user);
      } else {
        // Default behavior: redirect to profile setup if not completed
        if (!data.user.hasCompletedSetup) {
          navigate('/profile-setup');
        } else {
          navigate('/my-profile');
        }
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      if (onError) {
        onError(error.message || 'Google authentication failed');
      }
    }
  };

  const login = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (error) => {
      console.error('Google OAuth error:', error);
      if (onError) {
        onError('Google authentication failed. Please try again.');
      }
    },
    flow: 'implicit', // Changed from 'auth-code' to 'implicit' for simpler handling
  });

  return (
    <button
      onClick={() => login()}
      className={`google-auth-button ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        width: '100%',
        padding: '12px 16px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#fff',
        color: '#333',
        fontSize: '16px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
      onMouseEnter={(e) => {
        e.target.style.backgroundColor = '#f8f9fa';
        e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.target.style.backgroundColor = '#fff';
        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {buttonText}
    </button>
  );
};

export default GoogleAuth;
