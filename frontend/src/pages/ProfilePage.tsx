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
  ChevronRight 
} from 'lucide-react';
import MobileLayout from '../components/layout/MobileLayout';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const ProfilePage: React.FC = () => {
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
        {/* Header */}
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

        <style>{`
          .profile-page {
            height: 100%;
            overflow-y: auto;
            background: var(--gray-50);
            padding-bottom: 20px;
          }

          /* Desktop: Add bottom padding to account for transparent navbar */
          @media (min-width: 1024px) {
            .profile-page {
              padding-bottom: calc(var(--bottom-nav-height) + 20px);
            }
          }

          .profile-header {
            background: white;
            padding: 32px 20px;
            text-align: center;
            border-bottom: 1px solid var(--gray-200);
          }

          .avatar-section {
            position: relative;
            display: inline-block;
            margin-bottom: 16px;
          }

          .avatar {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            background: var(--gray-200);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--gray-500);
            overflow: hidden;
          }

          .avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .edit-avatar-button {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: var(--primary);
            color: white;
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s;
          }

          .edit-avatar-button:hover {
            background: var(--primary-dark);
          }

          .username {
            font-size: 24px;
            font-weight: 700;
            color: var(--gray-900);
            margin: 0 0 8px 0;
          }

          .email,
          .member-since {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 14px;
            color: var(--gray-600);
            margin: 4px 0;
          }

          .stats-section {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            padding: 20px;
          }

          .stat-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .stat-card svg {
            color: var(--primary);
            flex-shrink: 0;
          }

          .stat-info {
            flex: 1;
          }

          .stat-value {
            font-size: 28px;
            font-weight: 700;
            color: var(--gray-900);
            margin: 0;
            line-height: 1;
          }

          .stat-label {
            font-size: 14px;
            color: var(--gray-600);
            margin: 4px 0 0 0;
          }

          .section {
            background: white;
            margin: 16px 20px;
            padding: 20px;
            border-radius: 16px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }

          .section-title {
            font-size: 18px;
            font-weight: 700;
            color: var(--gray-900);
            margin: 0;
          }

          .edit-button {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 12px;
            background: var(--gray-100);
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            color: var(--gray-700);
            cursor: pointer;
            transition: background 0.2s;
          }

          .edit-button:hover {
            background: var(--gray-200);
          }

          .bio-text {
            font-size: 15px;
            color: var(--gray-700);
            line-height: 1.6;
            margin: 0;
          }

          .edit-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .bio-input {
            width: 100%;
            padding: 12px;
            border: 2px solid var(--gray-200);
            border-radius: 8px;
            font-size: 15px;
            font-family: inherit;
            resize: vertical;
            transition: border-color 0.2s;
          }

          .bio-input:focus {
            outline: none;
            border-color: var(--primary);
          }

          .character-count {
            text-align: right;
            font-size: 12px;
            color: var(--gray-500);
            margin: 0;
          }

          .form-actions {
            display: flex;
            gap: 12px;
          }

          .button-primary,
          .button-secondary {
            flex: 1;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }

          .button-primary {
            background: var(--primary);
            color: white;
          }

          .button-primary:hover {
            background: var(--primary-dark);
          }

          .button-secondary {
            background: var(--gray-100);
            color: var(--gray-700);
          }

          .button-secondary:hover {
            background: var(--gray-200);
          }

          .settings-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
            background: var(--gray-50);
            border-radius: 12px;
          }

          .setting-item.clickable {
            width: 100%;
            border: none;
            text-align: left;
            cursor: pointer;
            transition: background 0.2s;
          }

          .setting-item.clickable:hover {
            background: var(--gray-100);
          }

          .setting-item.danger .setting-icon,
          .setting-item.danger .setting-label {
            color: var(--danger);
          }

          .setting-info {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
          }

          .setting-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary);
          }

          .setting-icon.danger {
            color: var(--danger);
          }

          .setting-label {
            font-size: 15px;
            font-weight: 600;
            color: var(--gray-900);
            margin: 0;
          }

          .setting-description {
            font-size: 13px;
            color: var(--gray-600);
            margin: 4px 0 0 0;
          }

          .toggle {
            position: relative;
            display: inline-block;
            width: 48px;
            height: 28px;
            flex-shrink: 0;
          }

          .toggle input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--gray-300);
            border-radius: 28px;
            transition: 0.3s;
          }

          .toggle-slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 4px;
            bottom: 4px;
            background: white;
            border-radius: 50%;
            transition: 0.3s;
          }

          .toggle input:checked + .toggle-slider {
            background: var(--primary);
          }

          .toggle input:checked + .toggle-slider:before {
            transform: translateX(20px);
          }

          .empty-state {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
          }

          .empty-state p {
            color: var(--gray-600);
            font-size: 14px;
          }
        `}</style>
      </div>
    </MobileLayout>
  );
};

export default ProfilePage;