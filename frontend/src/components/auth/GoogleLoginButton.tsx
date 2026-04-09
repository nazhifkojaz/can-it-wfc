import React from 'react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { useResultModal } from '../../hooks';
import { ResultModal } from '../common';
import { User } from '../../types';
import { extractApiError } from '../../utils/errorUtils';
import { logger } from '../../utils/logger';
import styles from './GoogleLoginButton.module.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || '';

interface GoogleLoginButtonProps {
  mode?: 'signin' | 'signup';
  onSuccess?: (provider: 'google', result: { user: User; created: boolean }) => void;
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ mode = 'signin', onSuccess }) => {
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
      <div className={styles.googleButton}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          text={mode === 'signup' ? 'signup_with' : 'signin_with'}
          theme="outline"
          size="large"
        />
      </div>

      <ResultModal
        isOpen={resultModal.isOpen}
        onClose={resultModal.closeResultModal}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        details={resultModal.details}
        primaryButton={resultModal.primaryButton}
        secondaryButton={resultModal.secondaryButton}
        autoClose={resultModal.autoClose}
        autoCloseDelay={resultModal.autoCloseDelay}
      />
    </>
  );
};

export default GoogleLoginButton;
