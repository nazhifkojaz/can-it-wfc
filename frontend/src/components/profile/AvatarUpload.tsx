import React, { useState, useRef } from 'react';
import { User, Upload, X, Loader } from 'lucide-react';
import { useResultModal } from '../../hooks';
import { authApi } from '../../api/client';
import { CLOUDINARY_CONFIG, validateAvatarFile } from '../../config/cloudinary';
import { extractApiError } from '../../utils/errorUtils';
import { logger } from '../../utils/logger';
import styles from './AvatarUpload.module.css';

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  username: string;
  onUploadSuccess: (newAvatarUrl: string) => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  username,
  onUploadSuccess,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultModal = useResultModal();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Invalid File',
        message: validation.error || 'Invalid file',
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    uploadToCloudinary(file);
  };

  const uploadToCloudinary = async (file: File) => {
    if (!CLOUDINARY_CONFIG.CLOUD_NAME) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Configuration Error',
        message: 'Cloudinary is not configured. Please contact support.',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.UPLOAD_PRESET);
    formData.append('folder', 'can-it-wfc/avatars');
    formData.append('public_id', `user_${username}_${Date.now()}`);

    try {
      setUploading(true);

      const response = await fetch(CLOUDINARY_CONFIG.UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      // Parse response to get detailed error
      const data = await response.json();

      if (!response.ok) {
        logger.error('Cloudinary error', { data }, 'AvatarUpload');
        const errorMessage = data.error?.message || 'Upload failed';
        throw new Error(errorMessage);
      }

      const avatarUrl = data.secure_url;

      if (!avatarUrl) {
        throw new Error('No URL returned from Cloudinary');
      }

      // Update user profile with new avatar URL
      await authApi.updateProfile({ avatar_url: avatarUrl });
      onUploadSuccess(avatarUrl);

      resultModal.showSuccess('Avatar Updated', 'Your profile picture has been updated!');

      setPreview(null);
    } catch (error) {
      const apiError = extractApiError(error);
      logger.error('Avatar upload error', apiError, 'AvatarUpload');

      // More detailed error message
      let errorMessage = 'Failed to upload avatar. Please try again.';
      if (apiError.message && apiError.message !== 'Upload failed') {
        errorMessage = apiError.message;
      }

      resultModal.showResultModal({
        type: 'error',
        title: 'Upload Failed',
        message: errorMessage,
        details: 'Check browser console for more details.',
      });
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    resultModal.showResultModal({
      type: 'warning',
      title: 'Remove Avatar',
      message: 'Are you sure you want to remove your profile picture?',
      primaryButton: {
        label: 'Remove',
        onClick: async () => {
          try {
            await authApi.updateProfile({ avatar_url: '' });
            onUploadSuccess('');

            resultModal.showSuccess('Avatar Removed', 'Your profile picture has been removed.');
          } catch (error) {
            resultModal.showError('Remove Failed', error);
          }
        },
      },
      secondaryButton: {
        label: 'Cancel',
        onClick: () => resultModal.closeResultModal(),
      },
    });
  };

  return (
    <div className={styles.avatarUpload}>
      <div className={styles.avatarWrapper}>
        <div className={styles.avatar}>
          {uploading ? (
            <div className={styles.uploading}>
              <Loader size={40} className={styles.spinner} />
            </div>
          ) : preview ? (
            <img src={preview} alt="Preview" className={styles.avatarImage} />
          ) : currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt={username}
              className={styles.avatarImage}
              referrerPolicy="no-referrer"
            />
          ) : (
            <User size={40} />
          )}
        </div>

        {!uploading && (
          <>
            <button
              className={styles.uploadButton}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload avatar"
              type="button"
            >
              <Upload size={16} />
            </button>

            {currentAvatarUrl && (
              <button
                className={styles.removeButton}
                onClick={handleRemoveAvatar}
                aria-label="Remove avatar"
                type="button"
              >
                <X size={16} />
              </button>
            )}
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className={styles.fileInput}
        disabled={uploading}
      />

      <p className={styles.hint}>
        Max 2MB • JPG, PNG, WebP, GIF
      </p>
    </div>
  );
};

export default AvatarUpload;
