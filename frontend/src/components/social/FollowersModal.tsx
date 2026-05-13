import React, { useEffect, useState, useCallback } from 'react';
import { User, Check, X } from 'lucide-react';
import { Modal, Loading } from '../common';
import { userApi } from '../../api/client';
import { FollowUser } from '../../types';
import FollowButton from './FollowButton';
import { logger } from '../../utils/logger';
import styles from './FollowersModal.module.css';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  type: 'followers' | 'following';
  onUserClick: (username: string) => void;
  isOwnModal?: boolean;
}

const FollowersModal: React.FC<FollowersModalProps> = ({
  isOpen,
  onClose,
  username,
  type,
  onUserClick,
  isOwnModal = false,
}) => {
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<FollowUser[]>([]);
  const [handlingRequest, setHandlingRequest] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = type === 'followers'
        ? await userApi.getUserFollowers(username)
        : await userApi.getUserFollowing(username);
      setUsers(data);
    } catch (err) {
      logger.error('Failed to load users', err, 'FollowersModal');
      setError(`Failed to load ${type}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [type, username]);

  useEffect(() => {
    if (!isOpen) return;
    fetchUsers();
  }, [isOpen, username, type, fetchUsers]);

  useEffect(() => {
    if (!isOpen || !isOwnModal || type !== 'followers') return;
    const fetchRequests = async () => {
      try {
        const data = await userApi.getFollowRequests();
        setRequests(data);
      } catch (err) {
        logger.error('Failed to load follow requests', err, 'FollowersModal');
      }
    };
    fetchRequests();
  }, [isOpen, isOwnModal, type]);

  const handleAccept = async (userId: number) => {
    setHandlingRequest(userId);
    try {
      await userApi.handleFollowRequest(userId, 'accept');
      setRequests(prev => prev.filter(r => r.id !== userId));
    } catch (err) {
      logger.error('Failed to accept follow request', err, 'FollowersModal');
    } finally {
      setHandlingRequest(null);
    }
  };

  const handleReject = async (userId: number) => {
    setHandlingRequest(userId);
    try {
      await userApi.handleFollowRequest(userId, 'reject');
      setRequests(prev => prev.filter(r => r.id !== userId));
    } catch (err) {
      logger.error('Failed to reject follow request', err, 'FollowersModal');
    } finally {
      setHandlingRequest(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'followers' ? 'Followers' : 'Following'}
      size="md"
    >
      <div className={styles.usersList}>
        {/* Follow Requests Section */}
        {isOwnModal && type === 'followers' && requests.length > 0 && (
          <div className={styles.requestsSection}>
            <h4 className={styles.requestsTitle}>Follow Requests ({requests.length})</h4>
            {requests.map(user => (
              <div key={user.id} className={styles.requestItem}>
                <div className={styles.userInfo} onClick={() => onUserClick(user.username)}>
                  <div className={styles.avatar}>
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.effective_display_name || user.display_name} />
                    ) : (
                      <User size={24} />
                    )}
                  </div>
                  <div className={styles.userDetails}>
                    <h3>{user.effective_display_name || user.display_name}</h3>
                    <p>@{user.username}</p>
                    <p className={styles.stats}>
                      {user.total_visits} visits · {user.total_reviews} reviews
                    </p>
                  </div>
                </div>
                <div className={styles.requestActions}>
                  <button
                    className={styles.acceptBtn}
                    onClick={() => handleAccept(user.id)}
                    disabled={handlingRequest === user.id}
                    title="Accept"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleReject(user.id)}
                    disabled={handlingRequest === user.id}
                    title="Reject"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
            <div className={styles.requestsDivider} />
          </div>
        )}

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
                    <img src={user.avatar_url} alt={user.effective_display_name || user.display_name} />
                  ) : (
                    <User size={24} />
                  )}
                </div>
                <div className={styles.userDetails}>
                  <h3>{user.effective_display_name || user.display_name}</h3>
                  <p>@{user.username}</p>
                  <p className={styles.stats}>
                    {user.total_visits} visits · {user.total_reviews} reviews
                  </p>
                </div>
              </div>
              <FollowButton
                username={user.username}
                followStatus={user.follow_status as 'none' | 'active' | 'pending' | 'rejected' | undefined}
                isFollowing={user.is_following}
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
