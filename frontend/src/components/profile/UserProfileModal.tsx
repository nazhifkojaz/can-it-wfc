import React, { useEffect, useState } from 'react';
import { User, MapPin, Calendar, Star } from 'lucide-react';
import { authApi } from '../../api/client';
import { User as UserType } from '../../types';
import { Modal, Loading } from '../common';
import { formatDistanceToNow } from 'date-fns';
import styles from './UserProfileModal.module.css';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  username,
}) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !username) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const userData = await authApi.getUserByUsername(username);
        setUser(userData);
      } catch (err: any) {
        if (import.meta.env.DEV) {
          console.error('Failed to fetch user profile:', err);
        }
        if (err.response?.status === 404) {
          setError('User not found');
        } else {
          setError('Failed to load user profile');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [isOpen, username]);

  const displayName = user?.display_name || user?.username || 'Anonymous';
  const memberSince = user?.date_joined
    ? formatDistanceToNow(new Date(user.date_joined), { addSuffix: true })
    : 'Unknown';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Profile" size="sm">
      <div className={styles.modalContent}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <Loading message="Loading profile..." />
          </div>
        ) : error || !user ? (
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{error || 'User not found'}</p>
            <button onClick={onClose} className={styles.closeButton}>
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div className={styles.avatarContainer}>
              <div className={styles.avatar}>
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User size={48} />
                )}
              </div>
            </div>

            {/* User Info */}
            <div className={styles.userInfo}>
              <h2 className={styles.displayName}>{displayName}</h2>
              <p className={styles.username}>@{user.username}</p>

              {/* Bio */}
              {user.bio && (
                <p className={styles.bio}>{user.bio}</p>
              )}

              {/* Member Since */}
              <div className={styles.meta}>
                <Calendar size={14} />
                <span>Member {memberSince}</span>
              </div>
            </div>

            {/* Stats */}
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <div className={styles.statIcon}>
                  <Star size={20} />
                </div>
                <div className={styles.statContent}>
                  <p className={styles.statValue}>{user.total_reviews || 0}</p>
                  <p className={styles.statLabel}>REVIEWS</p>
                </div>
              </div>

              <div className={styles.statItem}>
                <div className={styles.statIcon}>
                  <MapPin size={20} />
                </div>
                <div className={styles.statContent}>
                  <p className={styles.statValue}>{user.total_visits || 0}</p>
                  <p className={styles.statLabel}>VISITS</p>
                </div>
              </div>
            </div>

            {/* Coming Soon */}
            <div className={styles.comingSoon}>
              <p>📍 Reviews and visits coming soon!</p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default UserProfileModal;
