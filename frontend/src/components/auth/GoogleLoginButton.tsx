import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { useResultModal } from '../../hooks';
import { SharedResultModal } from '../common';
import { User } from '../../types';
import { extractApiError } from '../../utils/errorUtils';
import { logger } from '../../utils/logger';
import styles from './GoogleLoginButton.module.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';

interface GoogleLoginButtonProps {
  mode?: 'signin' | 'signup';
  variant?: 'default' | 'nav' | 'hero';
  onSuccess?: (provider: 'google', result: { user: User; created: boolean }) => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ mode = 'signin', variant = 'default', onSuccess }) => {
  const { login } = useAuth();
  const resultModal = useResultModal();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Google Sign-In Failed',
        message: 'No credential received from Google. Please try again.',
      });
      return;
    }

    try {
      const result = await login('google', credentialResponse.credential);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess('google', result);
      }
    } catch (error) {
      logger.error('Google login error', error as Error, 'GoogleLoginButton');
      const apiError = extractApiError(error);
      resultModal.showResultModal({
        type: 'error',
        title: 'Google Sign-In Failed',
        message: apiError.message,
      });
    }
  };

  const handleError = () => {
    resultModal.showResultModal({
      type: 'error',
      title: 'Google Sign-In Failed',
      message: 'Failed to authenticate with Google. Please try again.',
    });
  };

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className={styles.error}>
        <p>Google Sign-In is not configured. Please contact support.</p>
      </div>
    );
  }

  return (
    <>
      <div className={`${styles.googleButton} ${styles[variant]}`}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          text={mode === 'signup' ? 'signup_with' : 'signin_with'}
          theme="outline"
          size={variant === 'nav' ? 'medium' : 'large'}
          width="100%"
        />
      </div>

      <SharedResultModal resultModal={resultModal} />
    </>
  );
};

export default GoogleLoginButton;
