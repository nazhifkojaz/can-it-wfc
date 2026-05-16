import React, { useEffect, useState } from 'react';
import { Home, User as UserIcon, Star, MapPin, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePanel } from '../../contexts/PanelContext';
import { userApi } from '../../api/client';
import { UserProfile, CafeListItem } from '../../types';
import { Loading, EmptyState } from '../common';
import FollowButton from '../social/FollowButton';
import FollowersModal from '../social/FollowersModal';
import { useFollowersModal, useUserLists, useUserReviews } from '../../hooks';
import ListCard from '../lists/ListCard';
import ListView from '../lists/ListView';
import ReviewsTab from '../profile/ReviewsTab';
import { logger } from '../../utils/logger';
import { extractApiError } from '../../utils/errorUtils';
import './UserProfilePanel.css';

const UserProfilePanel: React.FC = () => {
  const { hidePanel, panelData, activePanel } = usePanel();
  const navigate = useNavigate();
  const username = panelData?.username;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reviews' | 'lists' | 'stats'>('reviews');
  const { openFollowersModal, followersModalProps } = useFollowersModal();

  const [openListId, setOpenListId] = useState<number | null>(null);

  // Reviews tab state
  const {
    reviews: userReviews,
    loading: reviewsLoading,
    fetchNextPage: fetchNextReviewsPage,
    hasNextPage: hasNextReviewsPage,
    isFetchingNextPage: isFetchingNextReviewsPage,
  } = useUserReviews(username);

  const canLoadLists =
    activeTab === 'lists' &&
    !!profile &&
    !(profile.profile_visibility === 'private' && !profile.is_own_profile);
  const {
    lists,
    loading: listsLoading,
    error: listsError,
    refetch: refetchLists,
  } = useUserLists(username, canLoadLists);

  // Reset state when panel changes away
  React.useEffect(() => {
    if (activePanel !== 'userProfile') {
      setProfile(null);
      setActiveTab('reviews');
      setOpenListId(null);
    }
  }, [activePanel]);

  useEffect(() => {
    if (!username) {
      setError('No user specified');
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const profileData = await userApi.getUserProfile(username);
        setProfile(profileData);
      } catch (err: unknown) {
        const apiError = extractApiError(err);
        logger.error('Failed to load profile', err, 'UserProfilePanel');
        setError(apiError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="user-profile-panel">
        <div className="panel-header">
          <button className="home-button" onClick={hidePanel}>
            <Home size={20} />
          </button>
          <h2 className="panel-title">Profile</h2>
        </div>
        <div className="loading-container">
          <Loading message="Loading profile..." />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="user-profile-panel">
        <div className="panel-header">
          <button className="home-button" onClick={hidePanel}>
            <Home size={20} />
          </button>
          <h2 className="panel-title">Profile</h2>
        </div>
        <div className="error-state">
          <h3>Profile Not Found</h3>
          <p>{error || 'User does not exist'}</p>
          <button className="btn-primary" onClick={hidePanel}>
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  const isPrivate = profile.profile_visibility === 'private' && !profile.is_own_profile;

  return (
    <div className="user-profile-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-left">
          <button className="home-button" onClick={hidePanel}>
            <Home size={20} />
          </button>
          <h2 className="panel-title">Profile</h2>
        </div>
      </div>

      {/* Content */}
      <div className="panel-content">
        {/* Profile Card */}
        <div className="profile-card">
          <div className="profile-avatar">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.effective_display_name || profile.display_name} />
            ) : (
              <div className="avatar-placeholder">
                <UserIcon size={48} />
              </div>
            )}
          </div>

          <div className="profile-info">
            <h1 className="display-name">{profile.effective_display_name || profile.display_name}</h1>
            <p className="username">@{profile.username}</p>
            {profile.bio && <p className="bio">{profile.bio}</p>}

            {profile.settings && (
              <div className="privacy-badge">
                {profile.settings.profile_visibility === 'public' ? '🌍 Public' : '🔒 Private'}
              </div>
            )}

            {/* Follow Button */}
            {!profile.is_own_profile && (
              <FollowButton
                username={profile.username}
                followStatus={profile.follow_status || 'none'}
                isFollowing={profile.is_following}
                onStatusChange={(status) => {
                  setProfile(prev => prev ? {
                    ...prev,
                    is_following: status === 'active',
                    follow_status: status,
                  } : null);
                }}
              />
            )}
          </div>

          {/* Stats */}
          {!isPrivate && (
            <div className="profile-stats">
              <div
                className="stat-item clickable"
                onClick={() => openFollowersModal('followers')}
              >
                <UserIcon size={20} />
                <div>
                  <div className="stat-value">{profile.followers_count || 0}</div>
                  <div className="stat-label">Followers</div>
                </div>
              </div>
              <div className="stat-divider" />
              <div
                className="stat-item clickable"
                onClick={() => openFollowersModal('following')}
              >
                <UserIcon size={20} />
                <div>
                  <div className="stat-value">{profile.following_count || 0}</div>
                  <div className="stat-label">Following</div>
                </div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <MapPin size={20} />
                <div>
                  <div className="stat-value">{profile.total_visits}</div>
                  <div className="stat-label">Visits</div>
                </div>
              </div>
              <div className="stat-divider" />
              <div className="stat-item">
                <Star size={20} />
                <div>
                  <div className="stat-value">{profile.total_reviews}</div>
                  <div className="stat-label">Reviews</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Private Profile Message */}
        {isPrivate && (
          <div className="private-message">
            <h3>🔒 This profile is private</h3>
            <p>Only {profile.effective_display_name || profile.display_name} can see their profile details.</p>
          </div>
        )}

        {/* Tabs */}
        {!isPrivate && (
          <>
            <div className="profile-tabs-container">
              <div className="profile-tabs">
                <button
                  className={`profile-tab ${activeTab === 'reviews' ? 'active' : ''}`}
                  onClick={() => setActiveTab('reviews')}
                >
                  Reviews
                </button>
                <button
                  className={`profile-tab ${activeTab === 'lists' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lists')}
                >
                  Lists
                </button>
                <button
                  className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stats')}
                >
                  Stats
                </button>
              </div>
            </div>

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="tab-content">
                <ReviewsTab
                  reviews={userReviews}
                  loading={reviewsLoading}
                  fetchNextPage={fetchNextReviewsPage}
                  hasNextPage={hasNextReviewsPage}
                  isFetchingNextPage={isFetchingNextReviewsPage}
                  isOwnProfile={false}
                />
              </div>
            )}

            {/* Lists Tab */}
            {activeTab === 'lists' && (
              <div className="tab-content">
                {listsLoading ? (
                  <div className="lists-grid">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="list-card-skeleton">
                        <div className="skeleton-icon" />
                        <div className="skeleton-lines">
                          <div className="skeleton-line skeleton-line-short" />
                          <div className="skeleton-line skeleton-line-long" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : listsError ? (
                  <div className="lists-error">
                    <p>Couldn&apos;t load lists.</p>
                    <button
                      className="lists-retry-btn"
                      onClick={() => refetchLists()}
                    >
                      Retry
                    </button>
                  </div>
                ) : lists.length === 0 ? (
                  <EmptyState
                    icon={<List size={48} />}
                    title="No public lists yet"
                    description="This user hasn&apos;t made any lists public."
                  />
                ) : (
                  <div className="lists-grid">
                    {lists.map((list) => (
                      <ListCard
                        key={list.id}
                        list={list}
                        onClick={() => setOpenListId(list.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="tab-content">
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>Total Visits</h3>
                    <p className="stat-number">{profile.total_visits}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Total Reviews</h3>
                    <p className="stat-number">{profile.total_reviews}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Member Since</h3>
                    <p className="stat-text">
                      {new Date(profile.date_joined).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* List View Overlay */}
      {openListId && (
        <div className="list-view-overlay">
          <ListView
            listId={openListId}
            onBack={() => setOpenListId(null)}
            onCafeClick={(item: CafeListItem) => {
              setOpenListId(null);
              hidePanel();
              setTimeout(() => {
                navigate(`/map?cafe=${item.cafe.id}`);
              }, 100);
            }}
          />
        </div>
      )}

      {/* Followers/Following Modal */}
      <FollowersModal
        {...followersModalProps}
        username={username || ''}
      />
    </div>
  );
};

export default UserProfilePanel;
