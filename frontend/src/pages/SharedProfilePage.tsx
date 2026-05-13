import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User as UserIcon, Star, MapPin, List, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSharedProfile } from '../hooks/useSharedProfile';
import { useUserReviews, useFollowersModal } from '../hooks';
import { CafeList } from '../types';
import { userApi } from '../api/client';
import FollowButton from '../components/social/FollowButton';
import FollowersModal from '../components/social/FollowersModal';
import ListCard from '../components/lists/ListCard';
import ReviewsTab from '../components/profile/ReviewsTab';
import { EmptyState } from '../components/common';
import styles from './SharedProfilePage.module.css';

const SharedProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const { data: profile, isLoading, isError } = useSharedProfile(username || '');
  const { followersModalProps } = useFollowersModal();

  const [activeTab, setActiveTab] = useState<'reviews' | 'lists' | 'stats'>('reviews');
  const [shouldFetchReviews, setShouldFetchReviews] = useState(false);
  const [lists, setLists] = useState<CafeList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);

  const {
    reviews: userReviews,
    loading: reviewsLoading,
    fetchNextPage: fetchNextReviewsPage,
    hasNextPage: hasNextReviewsPage,
    isFetchingNextPage: isFetchingNextReviewsPage,
  } = useUserReviews(username, shouldFetchReviews);

  const handleBack = () => {
    if (authUser) {
      navigate('/map');
    } else {
      navigate('/');
    }
  };

  const handleSignIn = () => {
    const currentUrl = window.location.pathname;
    localStorage.setItem('redirect_after_login', currentUrl);
    navigate('/');
  };

  useEffect(() => {
    if (activeTab === 'reviews' && profile && !profile.message) {
      setShouldFetchReviews(true);
    }
  }, [activeTab, profile]);

  useEffect(() => {
    if (!profile || profile.message === 'This profile is private') return;
    const fetchLists = async () => {
      setListsLoading(true);
      setListsError(null);
      try {
        const data = await userApi.getUserLists(username || '');
        setLists(data);
      } catch {
        setListsError('Could not load lists');
      } finally {
        setListsLoading(false);
      }
    };
    if (activeTab === 'lists') {
      fetchLists();
    }
  }, [activeTab, username, profile]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.topBar}>
          <span className={styles.logo} onClick={handleBack}>CAN-IT-WFC</span>
        </header>
        <div className={styles.content}>
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonName} />
            <div className={styles.skeletonUsername} />
            <div className={styles.skeletonBio} />
            <div className={styles.skeletonStats}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.skeletonStat} />
              ))}
            </div>
          </div>
        </div>
        <div className={styles.footer}>© {new Date().getFullYear()} Can-It-WFC</div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className={styles.container}>
        <header className={styles.topBar}>
          <span className={styles.logo} onClick={handleBack}>CAN-IT-WFC</span>
          {!authUser && (
            <button className={styles.signInBtn} onClick={handleSignIn}>
              Sign in
            </button>
          )}
        </header>
        <div className={styles.content}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>🔍</div>
            <h1 className={styles.errorTitle}>Profile Not Found</h1>
            <p className={styles.errorText}>
              This profile doesn&apos;t exist or has been removed.
            </p>
            <button className={styles.errorBtn} onClick={handleBack}>
              Go Home
            </button>
          </div>
        </div>
        <div className={styles.footer}>© {new Date().getFullYear()} Can-It-WFC</div>
      </div>
    );
  }

  const isPrivate = profile.message === 'This profile is private';
  const isOwnProfile = profile.is_own_profile;

  if (isPrivate) {
    return (
      <div className={styles.container}>
        <header className={styles.topBar}>
          <span className={styles.logo} onClick={handleBack}>CAN-IT-WFC</span>
          {!authUser && (
            <button className={styles.signInBtn} onClick={handleSignIn}>
              Sign in
            </button>
          )}
        </header>
        <div className={styles.content}>
          <div className={styles.privateCard}>
            <div className={styles.privateHeader}>
              <div className={styles.avatarLarge}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  <UserIcon size={48} />
                )}
              </div>
              <h1 className={styles.privateName}>
                {profile.effective_display_name || profile.display_name || profile.username}
              </h1>
              <p className={styles.privateUsername}>@{profile.username}</p>
            </div>
            <div className={styles.privateLocked}>
              <EyeOff size={32} />
              <h2 className={styles.privateTitle}>This profile is private</h2>
              <p className={styles.privateDescription}>
                Only approved followers can view this profile.
              </p>
              {authUser && !isOwnProfile && (
                <FollowButton
                  username={profile.username}
                  followStatus={profile.follow_status || 'none'}
                  isFollowing={false}
                />
              )}
              {!authUser && (
                <button className={styles.signInBtn} onClick={handleSignIn}>
                  Sign in to request access
                </button>
              )}
            </div>
          </div>
        </div>
        <div className={styles.footer}>© {new Date().getFullYear()} Can-It-WFC</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.topBar}>
        <span className={styles.logo} onClick={handleBack}>CAN-IT-WFC</span>
        {!authUser && (
          <button className={styles.signInBtn} onClick={handleSignIn}>
            Sign in
          </button>
        )}
      </header>

      <div className={styles.content}>
        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarLarge}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" />
              ) : (
                <UserIcon size={48} />
              )}
            </div>
            <h1 className={styles.profileName}>
              {profile.effective_display_name || profile.display_name || profile.username}
            </h1>
            <p className={styles.profileUsername}>@{profile.username}</p>
            {profile.bio && <p className={styles.profileBio}>{profile.bio}</p>}

            {authUser && !isOwnProfile && (
              <FollowButton
                username={profile.username}
                followStatus={profile.follow_status || 'none'}
                isFollowing={profile.is_following}
                onStatusChange={() => {
                  // Profile re-fetches via React Query on next mount
                }}
              />
            )}
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <UserIcon size={18} />
              <div className={styles.statText}>
                <span className={styles.statValue}>{profile.followers_count}</span>
                <span className={styles.statLabel}>Followers</span>
              </div>
            </div>
            <div className={styles.statItem}>
              <UserIcon size={18} />
              <div className={styles.statText}>
                <span className={styles.statValue}>{profile.following_count}</span>
                <span className={styles.statLabel}>Following</span>
              </div>
            </div>
            <div className={styles.statItem}>
              <MapPin size={18} />
              <div className={styles.statText}>
                <span className={styles.statValue}>{profile.total_visits}</span>
                <span className={styles.statLabel}>Visits</span>
              </div>
            </div>
            <div className={styles.statItem}>
              <Star size={18} />
              <div className={styles.statText}>
                <span className={styles.statValue}>{profile.total_reviews}</span>
                <span className={styles.statLabel}>Reviews</span>
              </div>
            </div>
          </div>

          <div className={styles.tabsContainer}>
            <button
              className={`${styles.tab} ${activeTab === 'reviews' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'lists' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('lists')}
            >
              Lists
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'stats' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              Stats
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'reviews' && (
              <ReviewsTab
                reviews={userReviews}
                loading={reviewsLoading}
                fetchNextPage={fetchNextReviewsPage}
                hasNextPage={hasNextReviewsPage}
                isFetchingNextPage={isFetchingNextReviewsPage}
                isOwnProfile={false}
              />
            )}

            {activeTab === 'lists' && (
              <div className={styles.listsGrid}>
                {listsLoading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className={styles.listSkeleton}>
                      <div className={styles.skeletonIcon} />
                      <div className={styles.skeletonLines}>
                        <div className={styles.skeletonLineShort} />
                        <div className={styles.skeletonLineLong} />
                      </div>
                    </div>
                  ))
                ) : listsError ? (
                  <div className={styles.listsError}>
                    <p>Couldn&apos;t load lists.</p>
                  </div>
                ) : lists.length === 0 ? (
                  <EmptyState
                    icon={<List size={48} />}
                    title="No public lists yet"
                    description="This user hasn&apos;t made any lists public."
                  />
                ) : (
                  lists.map((list) => (
                    <ListCard
                      key={list.id}
                      list={list}
                      onClick={() => {}}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'stats' && (
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <h3>Total Visits</h3>
                  <p className={styles.statNumber}>{profile.total_visits}</p>
                </div>
                <div className={styles.statCard}>
                  <h3>Total Reviews</h3>
                  <p className={styles.statNumber}>{profile.total_reviews}</p>
                </div>
                <div className={styles.statCard}>
                  <h3>Member Since</h3>
                  <p className={styles.statText}>
                    {new Date(profile.date_joined).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {!authUser && (
          <div className={styles.ctaCard}>
            <button className={styles.signInBtn} onClick={handleSignIn}>
              Sign in to follow or create your own lists
            </button>
          </div>
        )}
      </div>

      <FollowersModal
        {...followersModalProps}
        username={profile.username}
        isOwnModal={isOwnProfile || false}
      />

      <div className={styles.footer}>© {new Date().getFullYear()} Can-It-WFC</div>
    </div>
  );
};

export default SharedProfilePage;
