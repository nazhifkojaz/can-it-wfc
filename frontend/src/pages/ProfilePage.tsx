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
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/layout/MobileLayout';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [isAnonymous, setIsAnonymous] = useState(user?.is_anonymous_display || false);

  if (!user) {
    return (
      <MobileLayout>
        <div className="profile-page">
          <div className="empty-state">
            <p>Please log in to view your profile</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  const handleSaveProfile = async () => {
    try {
      // TODO: Implement API call to update profile
      // await userApi.update({ bio, is_anonymous_display: isAnonymous });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  return (
    <MobileLayout>
      <div className="profile-page">
        {/* Top Navigation */}
        <div className="page-header">
          <div className="header-left">
            <button
              className="home-button"
              onClick={() => navigate('/map')}
              aria-label="Return to map"
            >
              <Home size={20} />
            </button>
            <h2 className="page-title">Profile</h2>
          </div>
        </div>

        {/* Profile Header */}
        <div className="profile-header">
          <div className="avatar-section">
            <div className="avatar">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} />
              ) : (
                <User size={40} />
              )}
            </div>
            <button className="edit-avatar-button">
              <Edit size={16} />
            </button>
          </div>

          <h1 className="username">{user.username}</h1>
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
                >
                  Cancel
                </button>
                <button
                  className="button-primary"
                  onClick={handleSaveProfile}
                >
                  Save
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
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {/* Change Password */}
            <button className="setting-item clickable">
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
      </div>
    </MobileLayout>
  );
};

export default ProfilePage;