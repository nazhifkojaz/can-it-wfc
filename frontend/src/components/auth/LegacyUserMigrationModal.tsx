import React, { useState } from 'react';
import { Modal } from '../common';
import { useAuth } from '../../contexts/AuthContext';
import { useResultModal } from '../../hooks';
import { ResultModal } from '../common';
import GoogleLoginButton from './GoogleLoginButton';
import { extractApiError } from '../../utils/errorUtils';
import { logger } from '../../utils/logger';
import styles from './LegacyUserMigrationModal.module.css';

interface LegacyUserMigrationModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const LegacyUserMigrationModal: React.FC<LegacyUserMigrationModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const { checkMigrationStatus } = useAuth();
  const resultModal = useResultModal();
  const [linking, setLinking] = useState(false);

  const handleOAuthSuccess = async () => {
    try {
      setLinking(true);
      // Check migration status after successful OAuth link
      const status = await checkMigrationStatus();

      if (!status.needs_migration) {
        resultModal.showResultModal({
          type: 'success',
          title: 'Account Linked Successfully!',
          message: 'Your social account has been linked. You can now continue using the app.',
          autoClose: true,
          autoCloseDelay: 2000,
          onClose: onComplete,
        });
      }
    } catch (error) {
      logger.error('Migration status check failed', error as Error, 'LegacyUserMigrationModal');
      const apiError = extractApiError(error);
      resultModal.showResultModal({
        type: 'error',
        title: 'Migration Failed',
        message: apiError.message || 'Failed to link your account. Please try again.',
      });
    } finally {
      setLinking(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {}}
        title="Account Action Required"
        showCloseButton={false}
        closeOnOverlayClick={false}
        closeOnEscape={false}
      >
        <div className={styles.content}>
          <div className={styles.icon}>🔐</div>
          <h3 className={styles.title}>We've Moved to Social Login</h3>
          <p className={styles.description}>
            We've updated our authentication system to use social login only. To continue using your account,
            please link it to your Google account.
          </p>
          <p className={styles.note}>
            <strong>Important:</strong> Your social account email must match your current account email
            (<span className={styles.email}>your-email@example.com</span>).
          </p>

          <div className={styles.buttons}>
            <GoogleLoginButton mode="signin" />
          </div>

          {linking && (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Linking your account...</p>
            </div>
          )}

          <p className={styles.helpText}>
            If you need help, please contact support with your username and email.
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

export default LegacyUserMigrationModal;
