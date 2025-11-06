import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { Modal } from '../common';
import { FLAG_REASONS, FLAG_REASON_LABELS } from '../../config/constants';
import styles from './FlagReviewModal.module.css';

interface FlagReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description?: string) => Promise<void>;
  reviewUsername: string;
}

const FlagReviewModal: React.FC<FlagReviewModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reviewUsername,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(FLAG_REASONS.SPAM);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      await onSubmit(selectedReason, description || undefined);

      // Reset form
      setSelectedReason(FLAG_REASONS.SPAM);
      setDescription('');
      onClose();
    } catch (error) {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedReason(FLAG_REASONS.SPAM);
      setDescription('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Report Review">
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.intro}>
          <Flag size={32} className={styles.icon} />
          <p>Report <strong>{reviewUsername}'s</strong> review for violating community guidelines.</p>
        </div>

        {/* Reason selection */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>REASON *</label>
          <div className={styles.reasonOptions}>
            {Object.values(FLAG_REASONS).map((reason) => (
              <label key={reason} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className={styles.radioInput}
                />
                <span className={styles.radioText}>
                  {FLAG_REASON_LABELS[reason as keyof typeof FLAG_REASON_LABELS]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Optional description */}
        <div className={styles.fieldGroup}>
          <label htmlFor="description" className={styles.label}>
            ADDITIONAL DETAILS (OPTIONAL)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide more context about why you're reporting this review..."
            rows={3}
            maxLength={500}
            className={styles.textarea}
            disabled={submitting}
          />
          <div className={styles.charCount}>
            {description.length}/500
          </div>
        </div>

        {/* Warning message */}
        <div className={styles.warning}>
          <p><strong>Note:</strong> False reports may result in action against your account. Reviews are automatically hidden after 3 reports.</p>
        </div>

        {/* Action buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleClose}
            className={styles.cancelButton}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? 'Reporting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default FlagReviewModal;
