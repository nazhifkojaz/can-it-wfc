import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal, ResultModal } from '../common';
import { useResultModal } from '../../hooks';
import { authApi } from '../../api/client';
import { extractApiError, getFieldError } from '../../utils/errorUtils';
import styles from './ChangePasswordModal.module.css';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return { score: 0, label: '', color: '' };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++; // Mixed case
  if (/\d/.test(password)) score++; // Has numbers
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++; // Has special chars

  // Cap at 4
  score = Math.min(score, 4);

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'var(--neo-danger)', 'var(--neo-warning)', 'var(--neo-info)', 'var(--neo-success)'];

  return {
    score,
    label: labels[score],
    color: colors[score],
  };
};

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

  const passwordStrength = calculatePasswordStrength(newPassword);

  // Check if password is strong enough (at least "Fair" = score 2)
  const isPasswordStrongEnough = passwordStrength.score >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (newPassword.length < 8) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Password Too Short',
        message: 'Password must be at least 8 characters',
      });
      return;
    }

    if (!isPasswordStrongEnough) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Password Too Weak',
        message: 'Please use a stronger password with a mix of letters, numbers, and symbols',
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
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Change password error:', error);
      }

      // Check for field-specific errors first, then fall back to general message
      const oldPasswordError = getFieldError(error, 'old_password');
      const newPasswordError = getFieldError(error, 'new_password');
      const errorMessage = oldPasswordError || newPasswordError || extractApiError(error).message;

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

            {/* Password Strength Indicator */}
            {newPassword && (
              <div className={styles.strengthIndicator}>
                <div className={styles.strengthBar}>
                  <div
                    className={styles.strengthBarFill}
                    style={{
                      width: `${(passwordStrength.score / 4) * 100}%`,
                      backgroundColor: passwordStrength.color,
                    }}
                  />
                </div>
                <p className={styles.strengthLabel} style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </p>
              </div>
            )}

            {/* Show warning if password is too weak */}
            {newPassword && !isPasswordStrongEnough && (
              <p className={styles.warningHint}>
                ⚠️ Password is too weak. Add more variety to continue.
              </p>
            )}

            <p className={styles.hint}>
              Use 8+ characters with a mix of letters, numbers & symbols
            </p>
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
                !isPasswordStrongEnough ||
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
