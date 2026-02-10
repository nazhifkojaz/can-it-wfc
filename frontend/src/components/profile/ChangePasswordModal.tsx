import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { Modal, ResultModal } from '../common';
import { useResultModal } from '../../hooks';
import { authApi } from '../../api/client';
import { extractApiError, getFieldError } from '../../utils/errorUtils';
import { logger } from '../../utils/logger';
import { trackPasswordChanged } from '../../lib/analytics';
import styles from './ChangePasswordModal.module.css';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Password validation requirements (must match backend validators.py)
const passwordRequirements = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'One special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(p) },
];

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const resultModal = useResultModal();

  // Check if all password requirements are met
  const isPasswordValid = useMemo(() => {
    return passwordRequirements.every(req => req.test(newPassword));
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation - check all requirements are met
    if (!isPasswordValid) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Password Requirements Not Met',
        message: 'Please ensure your password meets all requirements',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Passwords Don\'t Match',
        message: 'New password and confirmation must match',
      });
      return;
    }

    try {
      setLoading(true);
      await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });

      trackPasswordChanged();

      // Clear form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      resultModal.showResultModal({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been updated successfully!',
        autoClose: true,
        autoCloseDelay: 2000,
      });

      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Change password error', error as Error, 'ChangePasswordModal');

      // Check for field-specific errors first, then fall back to general message
      const apiError = extractApiError(error);
      const oldPasswordError = getFieldError(apiError, 'old_password');
      const newPasswordError = getFieldError(apiError, 'new_password');
      const errorMessage = oldPasswordError || newPasswordError || apiError.message;

      resultModal.showResultModal({
        type: 'error',
        title: 'Change Password Failed',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Change Password">
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Old Password */}
          <div className={styles.formGroup}>
            <label htmlFor="old-password" className={styles.label}>
              Current Password
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="old-password"
                type={showOldPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password"
                className={styles.input}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowOldPassword(!showOldPassword)}
                aria-label={showOldPassword ? 'Hide password' : 'Show password'}
              >
                {showOldPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className={styles.formGroup}>
            <label htmlFor="new-password" className={styles.label}>
              New Password
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={styles.input}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Requirements Checklist */}
            {newPassword && (
              <div className={styles.requirements}>
                {passwordRequirements.map(req => {
                  const isMet = req.test(newPassword);
                  return (
                    <div key={req.id} className={`${styles.requirement} ${isMet ? styles.met : styles.unmet}`}>
                      {isMet ? <Check size={14} /> : <X size={14} />}
                      <span>{req.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {!newPassword && (
              <p className={styles.hint}>
                Must include uppercase, lowercase, number & special character
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className={styles.formGroup}>
            <label htmlFor="confirm-password" className={styles.label}>
              Confirm New Password
            </label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={styles.input}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                loading ||
                !oldPassword ||
                !newPassword ||
                !confirmPassword ||
                !isPasswordValid ||
                newPassword !== confirmPassword
              }
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ResultModal for validation errors - must be outside Modal for proper z-index */}
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

export default ChangePasswordModal;
