import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { Modal, Loading } from '../common';
import api from '../../api/client';
import { extractApiError } from '../../utils/errorUtils';
import styles from './FlagCafeModal.module.css';

interface FlagCafeModalProps {
  isOpen: boolean;
  onClose: () => void;
  cafeId: number;
  cafeName: string;
  onSuccess?: () => void;
}

interface FlagReason {
  value: string;
  label: string;
  description: string;
}

const FLAG_REASONS: FlagReason[] = [
  {
    value: 'not_cafe',
    label: 'Not a cafe',
    description: 'This place is not actually a cafe (e.g., restaurant, shop)'
  },
  {
    value: 'wrong_location',
    label: 'Wrong location',
    description: 'Coordinates or address are incorrect'
  },
  {
    value: 'permanently_closed',
    label: 'Permanently closed',
    description: 'This cafe has closed down permanently'
  },
  {
    value: 'duplicate',
    label: 'Duplicate entry',
    description: 'Same cafe appears multiple times in database'
  }
];

const FlagCafeModal: React.FC<FlagCafeModalProps> = ({
  isOpen,
  onClose,
  cafeId,
  cafeName,
  onSuccess
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReason) {
      setError('Please select a reason for flagging this cafe');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/cafes/flags/', {
        cafe: cafeId,
        reason: selectedReason,
        description: description.trim()
      });

      // Success
      if (onSuccess) {
        onSuccess();
      }
      handleClose();
    } catch (err: any) {
      setError(extractApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Flag size={24} />
          </div>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>Report Issue</h2>
            <p className={styles.subtitle}>Help us keep the platform accurate</p>
          </div>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cafe Info */}
        <div className={styles.cafeInfo}>
          <p className={styles.cafeName}>{cafeName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Reason Selection */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              What's the issue? <span className={styles.required}>*</span>
            </label>
            <div className={styles.reasonGrid}>
              {FLAG_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  type="button"
                  className={`${styles.reasonCard} ${
                    selectedReason === reason.value ? styles.reasonCardSelected : ''
                  }`}
                  onClick={() => setSelectedReason(reason.value)}
                >
                  <div className={styles.reasonLabel}>{reason.label}</div>
                  <div className={styles.reasonDescription}>{reason.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label htmlFor="description" className={styles.label}>
              Additional details <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any additional details that might help us review this issue..."
              className={styles.textarea}
              rows={4}
              maxLength={500}
            />
            <div className={styles.charCount}>
              {description.length}/500
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.error}>
              <p>{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting || !selectedReason}
            >
              {isSubmitting ? (
                <>
                  <Loading size="sm" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Flag size={18} />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default FlagCafeModal;
