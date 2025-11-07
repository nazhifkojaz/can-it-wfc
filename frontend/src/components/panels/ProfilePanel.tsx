import React, { useState } from 'react';
import {
  User,
  Mail,
  Calendar,
  Coffee,
  Star,
  Edit,
  LogOut,
  Eye,
  EyeOff,
  ChevronRight,
  Home
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useResultModal } from '../../hooks';
import { usePanel } from '../../contexts/PanelContext'; // Import usePanel
import { ResultModal } from '../common';
import ChangePasswordModal from '../profile/ChangePasswordModal';
import AvatarUpload from '../profile/AvatarUpload';
import { authApi } from '../../api/client';
import { formatDistanceToNow } from 'date-fns';
import './ProfilePanel.css';

const ProfilePanel: React.FC = () => {
  const { hidePanel } = usePanel(); // Use hidePanel from context
  const { user, logout, updateUser } = useAuth();
  const resultModal = useResultModal();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [isAnonymous, setIsAnonymous] = useState(user?.is_anonymous_display || false);
  const [loading, setLoading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!user) {
    return (
      <div className="profile-page">
        <div className="empty-state">
          <p>Please log in to view your profile</p>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const updatedUser = await authApi.updateProfile({ bio });
      // Merge with existing user to preserve all fields (like date_joined)
      updateUser({ ...user, ...updatedUser });
      setIsEditing(false);

      resultModal.showResultModal({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your bio has been updated successfully!',
        autoClose: true,
        autoCloseDelay: 2000,
      });
    } catch (error: any) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Update Failed',
        message: error.response?.data?.bio?.[0] ||
                 error.response?.data?.detail ||
                 'Failed to update profile',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameUpdate = async () => {
    // Validation
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
      // Merge with existing user to preserve all fields (like date_joined)
      updateUser({ ...user, ...updatedUser });
      setEditingUsername(false);

      resultModal.showResultModal({
        type: 'success',
        title: 'Username Updated',
        message: 'Your username has been updated successfully!',
        autoClose: true,
        autoCloseDelay: 2000,
      });
    } catch (error: any) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Update Failed',
        message: error.response?.data?.username?.[0] ||
                 error.response?.data?.detail ||
                 'Username may already be taken',
      });
    } finally {
      setSavingUsername(false);
    }
  };

  const handleAnonymousToggle = async (checked: boolean) => {
    // Optimistic update
    setIsAnonymous(checked);

    try {
      const updatedUser = await authApi.updateProfile({
        is_anonymous_display: checked
      });
      // Merge with existing user to preserve all fields (like date_joined)
      updateUser({ ...user, ...updatedUser });
    } catch (error: any) {
      // Revert on error
      setIsAnonymous(!checked);
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
        onClick: () => {
          logout();
          resultModal.closeResultModal();
        },
      },
      secondaryButton: {
        label: 'Cancel',
        onClick: () => resultModal.closeResultModal(),
      },
    });
  };

  return (
    <div className="profile-page">
      {/* Top Navigation */}
      <div className="page-header">
        <div className="header-left">
          <button
            className="home-button"
            onClick={hidePanel}
            aria-label="Return to map"
          >
            <Home size={20} />
          </button>
          <h2 className="page-title">Profile</h2>
        </div>
      </div>

      {/* Profile Header */}
      <div className="profile-header">
        <AvatarUpload
          currentAvatarUrl={user.avatar_url}
          username={user.username}
          onUploadSuccess={(newUrl) => {
            updateUser({ ...user, avatar_url: newUrl });
          }}
        />

        {editingUsername ? (
          <div className="username-edit-form">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="username"
              className="username-input"
              maxLength={30}
            />
            <div className="username-edit-actions">
              <button
                className="button-secondary-small"
                onClick={() => {
                  setNewUsername(user?.username || '');
                  setEditingUsername(false);
                }}
                disabled={savingUsername}
              >
                Cancel
              </button>
              <button
                className="button-primary-small"
                onClick={handleUsernameUpdate}
                disabled={savingUsername}
              >
                {savingUsername ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="username-display">
            <h1 className="username">{user.username}</h1>
            <button
              className="edit-username-button"
              onClick={() => setEditingUsername(true)}
              aria-label="Edit username"
            >
              <Edit size={16} />
            </button>
          </div>
        )}

        <p className="email">
          <Mail size={14} />
          {user.email}
        </p>
        <p className="member-since">
          <Calendar size={14} />
          Member for {formatDistanceToNow(new Date(user.date_joined))}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-section">
        <div className="stat-card">
          <Coffee size={24} />
          <div className="stat-info">
            <p className="stat-value">{user.total_visits}</p>
            <p className="stat-label">Visits</p>
          </div>
        </div>

        <div className="stat-card">
          <Star size={24} />
          <div className="stat-info">
            <p className="stat-value">{user.total_reviews}</p>
            <p className="stat-label">Reviews</p>
          </div>
        </div>
      </div>

      {/* Bio Section */}
      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Bio</h2>
          {!isEditing && (
            <button 
              className="edit-button"
              onClick={() => setIsEditing(true)}
            >
              <Edit size={16} />
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="edit-form">
            <textarea
              className="bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
              maxLength={200}
            />
            <p className="character-count">{bio.length} / 200</p>
            
            <div className="form-actions">
              <button
                className="button-secondary"
                onClick={() => {
                  setBio(user.bio || '');
                  setIsEditing(false);
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="button-primary"
                onClick={handleSaveProfile}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="bio-text">
            {user.bio || 'No bio yet. Click edit to add one!'}
          </p>
        )}
      </div>

      {/* Settings Section */}
      <div className="section">
        <h2 className="section-title">Settings</h2>

        <div className="settings-list">
          {/* Anonymous Display Toggle */}
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-icon">
                {isAnonymous ? <EyeOff size={20} /> : <Eye size={20} />}
              </div>
              <div>
                <p className="setting-label">Anonymous Display</p>
                <p className="setting-description">
                  Show as {isAnonymous ? `***${user.username.slice(-4)}` : user.username} in reviews
                </p>
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => handleAnonymousToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Change Password */}
          <button
            className="setting-item clickable"
            onClick={() => setShowChangePassword(true)}
          >
            <div className="setting-info">
              <div className="setting-icon">
                <Edit size={20} />
              </div>
              <p className="setting-label">Change Password</p>
            </div>
            <ChevronRight size={20} />
          </button>

          {/* Logout */}
          <button className="setting-item clickable danger" onClick={handleLogout}>
            <div className="setting-info">
              <div className="setting-icon danger">
                <LogOut size={20} />
              </div>
              <p className="setting-label">Log Out</p>
            </div>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* ChangePasswordModal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => {
          // Password changed successfully - modal handles the success message
        }}
      />

      {/* ResultModal for logout confirmation and other actions */}
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
    </div>
  );
};

export default ProfilePanel;
