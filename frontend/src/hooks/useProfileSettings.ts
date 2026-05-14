import { useState } from 'react';
import { User } from '../types';
import { UseResultModalReturn } from './useResultModal';
import { authApi, userApi } from '../api/client';
import { extractApiError, getFieldError } from '../utils/errorUtils';
import { trackUserLoggedOut, trackPrivacySettingsChanged } from '../lib/analytics';

interface UseProfileSettingsOptions {
  user: User | null;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
  resultModal: UseResultModalReturn;
}

export function useProfileSettings({ user, updateUser, logout, resultModal }: UseProfileSettingsOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>(
    user?.settings?.profile_visibility || 'public'
  );
  const [loading, setLoading] = useState(false);
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const updatedUser = await authApi.updateProfile({ bio, display_name: displayName });
      updateUser({ ...user, ...updatedUser });
      setIsEditing(false);
      resultModal.showSuccess('Profile Updated', 'Your profile has been updated successfully!');
    } catch (error) {
      const apiError = extractApiError(error);
      const bioError = getFieldError(apiError, 'bio');
      const displayNameError = getFieldError(apiError, 'display_name');
      resultModal.showResultModal({
        type: 'error',
        title: 'Update Failed',
        message: displayNameError || bioError || apiError.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDisplayName = async () => {
    try {
      setSavingDisplayName(true);
      const updatedUser = await authApi.updateProfile({ display_name: displayName });
      updateUser({ ...user, ...updatedUser });
      setEditingDisplayName(false);
      resultModal.showSuccess('Display Name Updated', 'Your display name has been updated successfully!');
    } catch (error) {
      const apiError = extractApiError(error);
      const displayNameError = getFieldError(apiError, 'display_name');
      resultModal.showResultModal({
        type: 'error',
        title: 'Update Failed',
        message: displayNameError || apiError.message,
      });
    } finally {
      setSavingDisplayName(false);
    }
  };

  const handleUsernameUpdate = async () => {
    if (newUsername.length < 3) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Invalid Username',
        message: 'Username must be at least 3 characters',
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Invalid Username',
        message: 'Username can only contain letters, numbers, and underscores',
      });
      return;
    }

    if (newUsername === user?.username) {
      setEditingUsername(false);
      return;
    }

    try {
      setSavingUsername(true);
      const updatedUser = await authApi.updateProfile({ username: newUsername });
      updateUser({ ...user, ...updatedUser });
      setEditingUsername(false);
      resultModal.showSuccess('Username Updated', 'Your username has been updated successfully!');
    } catch (error) {
      const apiError = extractApiError(error);
      const usernameError = getFieldError(apiError, 'username');
      resultModal.showResultModal({
        type: 'error',
        title: 'Update Failed',
        message: usernameError || apiError.message,
      });
    } finally {
      setSavingUsername(false);
    }
  };

  const handleVisibilityToggle = async (value: 'public' | 'private') => {
    setProfileVisibility(value);

    try {
      const updatedSettings = await userApi.updateSettings({ profile_visibility: value });
      if (user) {
        updateUser({ ...user, settings: { ...user.settings, ...updatedSettings } as User['settings'] });
      }
      trackPrivacySettingsChanged({
        setting: 'profile_visibility',
        newValue: value,
      });
    } catch (error) {
      setProfileVisibility(profileVisibility);
      resultModal.showResultModal({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update privacy settings. Please try again.',
      });
    }
  };

  const handleLogout = () => {
    resultModal.showResultModal({
      type: 'warning',
      title: 'Log Out',
      message: 'Are you sure you want to log out?',
      primaryButton: {
        label: 'Log Out',
        onClick: async () => {
          trackUserLoggedOut();
          await logout();
          resultModal.closeResultModal();
        },
      },
      secondaryButton: {
        label: 'Cancel',
        onClick: () => resultModal.closeResultModal(),
      },
    });
  };

  return {
    bio,
    setBio,
    displayName,
    setDisplayName,
    isEditing,
    setIsEditing,
    editingDisplayName,
    setEditingDisplayName,
    profileVisibility,
    loading,
    savingDisplayName,
    editingUsername,
    setEditingUsername,
    newUsername,
    setNewUsername,
    savingUsername,
    handleSaveProfile,
    handleSaveDisplayName,
    handleUsernameUpdate,
    handleVisibilityToggle,
    handleLogout,
  };
}
