import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { Modal, Loading } from '../common';
import { userApi } from '../../api/client';
import { FollowUser } from '../../types';
import FollowButton from './FollowButton';
import styles from './FollowersModal.module.css';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  type: 'followers' | 'following';
  onUserClick: (username: string) => void;
}

const FollowersModal: React.FC<FollowersModalProps> = ({
  isOpen,
  onClose,
  username,
  type,
  onUserClick
}) => {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = type === 'followers'
          ? await userApi.getUserFollowers(username)
          : await userApi.getUserFollowing(username);
        setUsers(data);
      } catch (err) {
        console.error('Failed to load users:', err);
        setError(`Failed to load ${type}. Please try again.`);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, username, type]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'followers' ? 'Followers' : 'Following'}
      size="md"
    >
      <div className={styles.usersList}>
        {loading ? (
          <Loading message="Loading..." />
        ) : error ? (
          <p className={styles.emptyState} style={{ color: 'var(--neo-danger, #e74c3c)' }}>
            {error}
          </p>
        ) : users.length === 0 ? (
          <p className={styles.emptyState}>
            {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          </p>
        ) : (
          users.map(user => (
            <div key={user.id} className={styles.userItem}>
              <div
                className={styles.userInfo}
                onClick={() => onUserClick(user.username)}
              >
                <div className={styles.avatar}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.display_name} />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className={styles.userDetails}>
                  <h3>{user.display_name}</h3>
                  <p>@{user.username}</p>
                  <p className={styles.stats}>
                    {user.total_visits} visits · {user.total_reviews} reviews
                  </p>
                </div>
              </div>
              <FollowButton
                username={user.username}
                isFollowing={user.is_following || false}
                onFollowChange={(following) => {
                  setUsers(prev => prev.map(u =>
                    u.id === user.id ? { ...u, is_following: following } : u
                  ));
                }}
              />
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export default FollowersModal;
