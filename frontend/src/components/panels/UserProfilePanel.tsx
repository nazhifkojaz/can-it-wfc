import React, { useEffect, useState } from 'react';
import { Home, User as UserIcon, Calendar, Star, MapPin, DollarSign, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePanel } from '../../contexts/PanelContext';
import { userApi } from '../../api/client';
import { UserProfile, UserActivityItem, CafeList, CafeListItem } from '../../types';
import { Loading, EmptyState } from '../common';
import FollowButton from '../social/FollowButton';
import FollowersModal from '../social/FollowersModal';
import { useFollowersModal, useUserReviews } from '../../hooks';
import ListCard from '../lists/ListCard';
import ListView from '../lists/ListView';
import ReviewsTab from '../profile/ReviewsTab';
import { formatVisitTime } from '../../utils/visit';
import { formatRelativeDate } from '../../utils/date';
import { logger } from '../../utils/logger';
import { extractApiError } from '../../utils/errorUtils';
import './UserProfilePanel.css';

const UserProfilePanel: React.FC = () => {
  const { hidePanel, panelData, activePanel } = usePanel();
  const navigate = useNavigate();
  const username = panelData?.username;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<UserActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'reviews' | 'lists' | 'stats'>('activity');
  const { openFollowersModal, followersModalProps } = useFollowersModal();

  // Lists tab state
  const [lists, setLists] = useState<CafeList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);
  const [openListId, setOpenListId] = useState<number | null>(null);

  // Reviews tab state
  const {
    reviews: userReviews,
    loading: reviewsLoading,
    fetchNextPage: fetchNextReviewsPage,
    hasNextPage: hasNextReviewsPage,
    isFetchingNextPage: isFetchingNextReviewsPage,
  } = useUserReviews(username);

  // Reset state when panel changes away
  React.useEffect(() => {
    if (activePanel !== 'userProfile') {
      setProfile(null);
      setActivity([]);
      setActiveTab('activity');
      setLists([]);
      setListsError(null);
    }
  }, [activePanel]);

  // Merge visits with reviews for same cafe into single entries
  const mergeActivities = (activities: UserActivityItem[]): UserActivityItem[] => {
    const merged: UserActivityItem[] = [];
    const reviewsByCafeId = new Map<number, UserActivityItem>();

    // First, collect all reviews by their cafe ID
    activities.forEach(item => {
      if (item.type === 'review' && item.cafe_id) {
        reviewsByCafeId.set(item.cafe_id, item);
      }
    });

    // Process all activities
    activities.forEach(item => {
      if (item.type === 'visit') {
        // Check if user has a review for this cafe
        const review = reviewsByCafeId.get(item.cafe_id);
        if (review) {
          // Merge visit with cafe review data
          merged.push({
            ...item,
            type: 'visit',
            wfc_rating: review.wfc_rating,
            comment: review.comment,
          });
        } else {
          // Visit without review for this cafe
          merged.push(item);
        }
      } else if (item.type === 'review') {
        // Show standalone reviews (for cafes without recent visit in feed)
        // Only show if not already merged with a visit
        const hasVisitForCafe = activities.some(
          a => a.type === 'visit' && a.cafe_id === item.cafe_id
        );
        if (!hasVisitForCafe) {
          merged.push(item);
        }
      }
    });

    return merged;
  };

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

        // Fetch profile
        const profileData = await userApi.getUserProfile(username);
        setProfile(profileData);

        // Fetch activity (only if profile is public or own profile)
        if (profileData.profile_visibility !== 'private' || profileData.is_own_profile) {
          const activityData = await userApi.getUserActivity(username, 20);
          // Merge visits with their reviews
          const mergedActivity = mergeActivities(activityData.activity);
          setActivity(mergedActivity);
        }
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

  // Fetch public lists when Lists tab is active
  useEffect(() => {
    if (activeTab !== 'lists' || !username || !profile) return;
    if (profile.profile_visibility === 'private' && !profile.is_own_profile) return;
    if (lists.length > 0 || listsLoading || listsError) return;

    const fetchLists = async () => {
      try {
        setListsLoading(true);
        setListsError(null);
        const data = await userApi.getUserLists(username);
        setLists(data);
      } catch (err: unknown) {
        const apiError = extractApiError(err);
        logger.error('Failed to load user lists', err, 'UserProfilePanel');
        setListsError(apiError.message);
      } finally {
        setListsLoading(false);
      }
    };

    fetchLists();
  }, [activeTab, username, profile, lists.length, listsLoading, listsError]);

  const handleActivityClick = (cafeId: number) => {
    hidePanel();
    setTimeout(() => {
      navigate(`/map?cafe=${cafeId}`);
    }, 100);
  };

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
            <p>Only {profile.effective_display_name || profile.display_name} can see their activity and details.</p>
          </div>
        )}

        {/* Tabs */}
        {!isPrivate && (
          <>
            <div className="profile-tabs-container">
              <div className="profile-tabs">
                <button
                  className={`profile-tab ${activeTab === 'activity' ? 'active' : ''}`}
                  onClick={() => setActiveTab('activity')}
                >
                  Activity
                </button>
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

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="tab-content">
                {activity.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-text">No activity yet</p>
                  </div>
                ) : (
                  <div className="activity-list">
                    {activity.map((item) => (
                      <ActivityItem
                        key={`${item.type}-${item.id}`}
                        item={item}
                        onClick={() => handleActivityClick(item.cafe_id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

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
                      onClick={() => {
                        setListsError(null);
                        setLists([]);
                      }}
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

// Activity Item Component
const ActivityItem: React.FC<{
  item: UserActivityItem;
  onClick: () => void;
}> = ({ item, onClick }) => {
  // Determine if this is a combined visit + review
  const hasReview = item.wfc_rating !== undefined && item.wfc_rating !== null;
  const hasVisitDetails = item.visit_time || item.amount_spent;

  return (
    <div className="activity-item" onClick={onClick}>
      <div className="activity-icon">
        {hasReview ? <Star size={20} /> : <MapPin size={20} />}
      </div>

      <div className="activity-content">
        <div className="activity-header">
          <span className="activity-type">
            {hasReview ? 'Visited & Reviewed' : 'Visited'}
          </span>
          <span className="activity-cafe">{item.cafe_name}</span>
        </div>

        {hasReview && (
          <div className="activity-rating">
            <Star size={14} fill="currentColor" />
            <span>{item.wfc_rating}/5</span>
          </div>
        )}

        {item.comment && <p className="activity-comment">"{item.comment}"</p>}

        {hasVisitDetails && (
          <div className="visit-details">
            {item.visit_time && (
              <span className="visit-time">
                <Calendar size={14} />
                {formatVisitTime(item.visit_time)}
              </span>
            )}
            {item.amount_spent && (
              <span className="visit-spent">
                <DollarSign size={14} />
                {item.currency} {Number(item.amount_spent).toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div className="activity-date">{formatRelativeDate(item.date)}</div>
      </div>
    </div>
  );
};

export default UserProfilePanel;
