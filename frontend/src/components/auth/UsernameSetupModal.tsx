import React, { useState } from 'react';
import { Modal, ResultModal } from '../common';
import { useResultModal } from '../../hooks';
import { authApi } from '../../api/client';
import { extractApiError, getFieldError } from '../../utils/errorUtils';
import styles from './UsernameSetupModal.module.css';

interface UsernameSetupModalProps {
  isOpen: boolean;
  currentUsername: string;
  email: string;
  onComplete: (newUsername: string) => void;
}

const UsernameSetupModal: React.FC<UsernameSetupModalProps> = ({
  isOpen,
  currentUsername,
  email,
  onComplete,
}) => {
  const [username, setUsername] = useState(currentUsername);
  const [loading, setLoading] = useState(false);
  const resultModal = useResultModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (username.length < 3) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Username Too Short',
        message: 'Username must be at least 3 characters long.',
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Invalid Username',
        message: 'Username can only contain letters, numbers, and underscores.',
      });
      return;
    }

    if (username === currentUsername) {
      // No change, just close
      onComplete(username);
      return;
    }

    setLoading(true);
    try {
      // Update username via API
      await authApi.updateProfile({ username });

      resultModal.showResultModal({
        type: 'success',
        title: 'Username Updated!',
        message: `Your username is now @${username}`,
        autoClose: true,
        autoCloseDelay: 2000,
        onClose: () => onComplete(username),
      });
    } catch (error: any) {
      // Check for field-specific username error first
      const usernameError = getFieldError(error, 'username');
      const errorMsg = usernameError || extractApiError(error).message;

      resultModal.showResultModal({
        type: 'error',
        title: 'Username Update Failed',
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Keep auto-generated username
    onComplete(currentUsername);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {}} // Prevent closing - user must choose
        title="Choose Your Username"
      >
        <div className={styles.content}>
          <p className={styles.description}>
            Welcome! You've signed in with <strong>{email}</strong>.
            <br />
            Please choose a username for your account.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="username">Username</label>
              <div className={styles.inputWrapper}>
                <span className={styles.prefix}>@</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_username"
                  required
                  minLength={3}
                  maxLength={30}
                  autoFocus
                  className={styles.input}
                />
              </div>
              <span className={styles.hint}>
                3-30 characters, letters, numbers, and underscores only
              </span>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.skipButton}
                onClick={handleSkip}
                disabled={loading}
              >
                Skip for Now
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Set Username'}
              </button>
            </div>
          </form>

          <p className={styles.note}>
            💡 You can change your username later in your profile settings.
          </p>
        </div>
      </Modal>

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

export default UsernameSetupModal;
