import React, { useState } from 'react';
import {
  Mail,
  Calendar,
  Coffee,
  Star,
  Edit,
  LogOut,
  Eye,
  EyeOff,
  ChevronRight,
  Home,
  MapPin,
  Heart,
  Clock,
  Plus,
  Trash2,
  DollarSign,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useResultModal, useVisits, useFavorites } from '../../hooks';
import { usePanel } from '../../contexts/PanelContext';
import { ResultModal, Loading, EmptyState, ConfirmDialog } from '../common';
import ChangePasswordModal from '../profile/ChangePasswordModal';
import AvatarUpload from '../profile/AvatarUpload';
import ReviewForm from '../review/ReviewForm';
import CafeDetailSheet from '../cafe/CafeDetailSheet';
import AddVisitModal from '../visit/AddVisitModal';
import FollowersModal from '../social/FollowersModal';
import { authApi, reviewApi } from '../../api/client';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { formatDate, formatRating, formatPriceRange } from '../../utils';
import { formatCurrency, CURRENCIES } from '../../utils/currency';
import { formatVisitTime } from '../../utils/visit';
import { REVIEW_CONFIG, VISIT_TIME_LABELS } from '../../config/constants';
import { Visit, Review, Cafe } from '../../types';
import { useInView } from 'react-intersection-observer';
import './ProfilePanel.css';

const ProfilePanel: React.FC = () => {
  const { hidePanel, showPanel, activePanel } = usePanel();
  const { user, logout, updateUser } = useAuth();
  const resultModal = useResultModal();

  // Tab state
  const [activeTab, setActiveTab] = useState<'settings' | 'visits' | 'favorites'>('visits');

  // Followers/Following modal state
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following'>('followers');

  // Settings tab state
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [isAnonymous, setIsAnonymous] = useState(user?.is_anonymous_display || false);
  const [loading, setLoading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');
  const [savingUsername, setSavingUsername] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Visits tab state and hooks
  const {
    visits,
    loading: visitsLoading,
    deleteVisit,
    updateVisit,
    refetch: refetchVisits,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useVisits();
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState<Set<number>>(new Set());
  const [showEditVisit, setShowEditVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editAmountSpent, setEditAmountSpent] = useState<string>('');
  const [editCurrency, setEditCurrency] = useState<string>('USD');
  const [editVisitTime, setEditVisitTime] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<Visit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Favorites tab state and hooks
  const { favorites, loading: favoritesLoading, toggleFavorite, refetch: refetchFavorites } = useFavorites();
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [visitCafe, setVisitCafe] = useState<Cafe | undefined>(undefined);
  const [reviewVisitId, setReviewVisitId] = useState<number | null>(null);
  const [reviewCafeId, setReviewCafeId] = useState<number | null>(null);
  const [reviewCafeName, setReviewCafeName] = useState<string>('');

  // Infinite scroll for visits
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  // Infinite scroll effect
  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Visit helper functions
  const canAddReview = (visit: Visit): boolean => {
    const visitDate = new Date(visit.visit_date);
    const daysSince = differenceInDays(new Date(), visitDate);
    return daysSince <= REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT && !visit.has_review;
  };

  const canEditReview = (visit: Visit): boolean => {
    const visitDate = new Date(visit.visit_date);
    const daysSince = differenceInDays(new Date(), visitDate);
    return visit.has_review && daysSince <= REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT;
  };

  const canEditVisit = (visit: Visit): boolean => {
    const visitDate = new Date(visit.visit_date);
    const daysSince = differenceInDays(new Date(), visitDate);
    return daysSince <= REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT;
  };

  const getDaysRemaining = (visit: Visit): number => {
    const visitDate = new Date(visit.visit_date);
    const deadline = new Date(visitDate);
    deadline.setDate(deadline.getDate() + REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT);
    return Math.max(0, differenceInDays(deadline, new Date()));
  };

  const getAmountSpentLabel = (visit: Visit): string => {
    if (!visit.amount_spent) return 'Not specified';
    const currency = visit.currency || 'USD';
    return formatCurrency(visit.amount_spent, currency);
  };

  const groupVisitsByDate = (visits: Visit[]) => {
    const grouped: { [key: string]: Visit[] } = {};
    visits.forEach(visit => {
      const date = format(new Date(visit.visit_date), 'MMMM yyyy');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(visit);
    });
    return grouped;
  };

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

  // Visit handlers
  const handleAddReview = (visit: Visit) => {
    setSelectedVisit(visit);
    setExistingReview(null);
    setIsViewMode(false);
    setShowReviewForm(true);
  };

  const handleEditReview = async (visit: Visit) => {
    setLoadingReviews(prev => new Set(prev).add(visit.id));
    try {
      const data = await reviewApi.getMyReviews();
      const reviewsList = Array.isArray(data) ? data : (data as any).results || [];
      const review = reviewsList.find((r: Review) => r.visit.id === visit.id);

      if (!review) {
        throw new Error('Review not found');
      }

      setSelectedVisit(visit);
      setExistingReview(review);
      setIsViewMode(false);
      setShowReviewForm(true);
    } catch (error) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Load Review',
        message: 'Failed to load review. Please try again.',
      });
    } finally {
      setLoadingReviews(prev => {
        const next = new Set(prev);
        next.delete(visit.id);
        return next;
      });
    }
  };

  const handleViewReview = async (visit: Visit) => {
    setLoadingReviews(prev => new Set(prev).add(visit.id));
    try {
      const data = await reviewApi.getMyReviews();
      const reviewsList = Array.isArray(data) ? data : (data as any).results || [];
      const review = reviewsList.find((r: Review) => r.visit.id === visit.id);

      if (!review) {
        throw new Error('Review not found');
      }

      setSelectedVisit(visit);
      setExistingReview(review);
      setIsViewMode(true);
      setShowReviewForm(true);
    } catch (error) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Load Review',
        message: 'Failed to load review. Please try again.',
      });
    } finally {
      setLoadingReviews(prev => {
        const next = new Set(prev);
        next.delete(visit.id);
        return next;
      });
    }
  };

  const handleReviewSuccess = () => {
    setShowReviewForm(false);
    setSelectedVisit(null);
    setExistingReview(null);
    setIsViewMode(false);
    refetchVisits();
  };

  const handleEditVisit = (visit: Visit) => {
    setEditingVisit(visit);
    setEditAmountSpent(visit.amount_spent ? visit.amount_spent.toString() : '');
    setEditCurrency(visit.currency || 'USD');
    setEditVisitTime(visit.visit_time || null);
    setShowEditVisit(true);
  };

  const handleSaveVisitEdit = async () => {
    if (!editingVisit) return;

    try {
      await updateVisit(editingVisit.id, {
        amount_spent: editAmountSpent ? parseFloat(editAmountSpent) : null,
        currency: editAmountSpent ? editCurrency : null,
        visit_time: editVisitTime,
      });

      setShowEditVisit(false);
      setEditingVisit(null);
      refetchVisits();

      resultModal.showResultModal({
        type: 'success',
        title: 'Visit Updated!',
        message: 'Your visit has been updated successfully.',
        autoClose: true,
        autoCloseDelay: 2000,
      });
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to update visit';
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Update Visit',
        message: errorMsg,
      });
    }
  };

  const handleDeleteClick = (visit: Visit, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisitToDelete(visit);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!visitToDelete) return;

    setIsDeleting(true);

    try {
      await deleteVisit(visitToDelete.id);
      setShowDeleteConfirm(false);
      setVisitToDelete(null);
      refetchVisits();

      resultModal.showResultModal({
        type: 'success',
        title: 'Visit Deleted',
        message: 'Your visit has been deleted successfully.',
        autoClose: true,
        autoCloseDelay: 2000,
      });
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || error?.message || 'Failed to delete visit';
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Delete Visit',
        message: errorMsg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setVisitToDelete(null);
  };

  // Favorites handlers
  const handleCafeClick = (cafe: Cafe) => {
    setSelectedCafe(cafe);
  };

  const handleRemoveFavorite = async (cafeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleFavorite(cafeId);
    } catch (error: any) {
      resultModal.showResultModal({
        type: 'error',
        title: 'Failed to Remove Favorite',
        message: error.message || 'Failed to remove favorite. Please try again.',
      });
    }
  };

  const handleLogVisit = () => {
    if (selectedCafe) {
      setVisitCafe(selectedCafe);
    }
    setShowAddVisit(true);
    setSelectedCafe(null);
  };

  const handleVisitSuccess = () => {
    setShowAddVisit(false);
    setVisitCafe(undefined);
    setSelectedCafe(null);
    refetchFavorites();
    refetchVisits();

    resultModal.showResultModal({
      type: 'success',
      title: 'Visit Logged!',
      message: 'Your visit has been recorded successfully.',
      autoClose: true,
      autoCloseDelay: 2000,
    });
  };

  const handleAddReviewFromFavorites = (visitId: number, cafeId: number, cafeName: string) => {
    setReviewVisitId(visitId);
    setReviewCafeId(cafeId);
    setReviewCafeName(cafeName);
    setShowAddVisit(false);
    setVisitCafe(undefined);
    setShowReviewForm(true);
  };

  const handleReviewSuccessFromFavorites = () => {
    setShowReviewForm(false);
    setReviewVisitId(null);
    setReviewCafeId(null);
    setReviewCafeName('');
    refetchFavorites();
    refetchVisits();

    resultModal.showResultModal({
      type: 'success',
      title: 'Review Submitted!',
      message: 'Your review has been submitted successfully.',
      autoClose: true,
      autoCloseDelay: 2000,
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
        <div
          className="stat-card clickable"
          onClick={() => {
            setFollowModalType('followers');
            setShowFollowersModal(true);
          }}
        >
          <UserIcon size={24} />
          <div className="stat-info">
            <p className="stat-value">{user.followers_count || 0}</p>
            <p className="stat-label">Followers</p>
          </div>
        </div>

        <div
          className="stat-card clickable"
          onClick={() => {
            setFollowModalType('following');
            setShowFollowersModal(true);
          }}
        >
          <UserIcon size={24} />
          <div className="stat-info">
            <p className="stat-value">{user.following_count || 0}</p>
            <p className="stat-label">Following</p>
          </div>
        </div>

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

      {/* Tabs */}
      <div className="profile-tabs-container">
        <div className="profile-tabs">
          <button
            className={`profile-tab ${activeTab === 'visits' ? 'active' : ''}`}
            onClick={() => setActiveTab('visits')}
          >
            Visits
          </button>
          <button
            className={`profile-tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites
          </button>
          <button
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Visits Tab Content */}
      {activeTab === 'visits' && (
        <div className="tab-content">
          {visitsLoading ? (
            <Loading message="Loading your visits..." />
          ) : visits.length === 0 ? (
            <EmptyState
              icon={<MapPin size={64} />}
              title="No visits yet"
              description="Start exploring cafes and log your visits!"
            />
          ) : (
            <div className="visits-timeline">
              {Object.entries(groupVisitsByDate(visits)).map(([month, monthVisits]) => (
                <div key={month} className="month-group">
                  <h2 className="month-header">
                    <Calendar size={18} />
                    {month}
                  </h2>

                  <div className="visits-list">
                    {monthVisits.map((visit) => (
                      <div key={visit.id} className="visit-card">
                        {/* Cafe Info */}
                        <div className="visit-header">
                          <div className="visit-info">
                            <h3 className="cafe-name">{visit.cafe.name}</h3>
                            <p className="visit-date">
                              <Clock size={14} />
                              {formatDate(visit.visit_date)}
                            </p>
                          </div>
                          <button
                            className="delete-button"
                            onClick={(e) => handleDeleteClick(visit, e)}
                            aria-label="Delete visit"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <p className="cafe-address">
                          <MapPin size={14} />
                          {visit.cafe.address}
                        </p>

                        {/* Visit Details */}
                        {(visit.amount_spent || visit.visit_time) && (
                          <div className="visit-details">
                            {visit.amount_spent && (
                              <span className="detail-badge">
                                {getAmountSpentLabel(visit)}
                              </span>
                            )}
                            {visit.visit_time && (
                              <span className="detail-badge">
                                <Clock size={14} />
                                {formatVisitTime(visit.visit_time)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Visit Stats */}
                        <div className="visit-stats">
                          {visit.cafe.average_wfc_rating && (
                            <span className="stat">
                              ⭐ {formatRating(visit.cafe.average_wfc_rating)}
                            </span>
                          )}
                          <span className="stat">
                            📍 {visit.cafe.total_visits} visits
                          </span>
                        </div>

                        {/* Edit Visit Button (within 7 days) */}
                        {canEditVisit(visit) && (
                          <button
                            className="edit-visit-button"
                            onClick={() => handleEditVisit(visit)}
                          >
                            <Edit size={16} />
                            Edit Visit Details
                          </button>
                        )}

                        {/* Review Status */}
                        {canEditReview(visit) ? (
                          <div className="review-actions">
                            <div className="deadline-notice">
                              <p className="deadline-text">
                                {getDaysRemaining(visit)} {getDaysRemaining(visit) === 1 ? 'day' : 'days'} left to edit
                              </p>
                            </div>
                            <button
                              className="add-review-button"
                              onClick={() => handleEditReview(visit)}
                              disabled={loadingReviews.has(visit.id)}
                            >
                              <Edit size={18} />
                              {loadingReviews.has(visit.id) ? 'Loading...' : 'Edit Review'}
                            </button>
                          </div>
                        ) : visit.has_review ? (
                          <div className="review-actions">
                            <div className="review-status completed">
                              ✓ Review added
                            </div>
                            <button
                              className="add-review-button"
                              onClick={() => handleViewReview(visit)}
                              disabled={loadingReviews.has(visit.id)}
                              style={{ marginTop: '8px' }}
                            >
                              <Eye size={18} />
                              {loadingReviews.has(visit.id) ? 'Loading...' : 'View Review'}
                            </button>
                          </div>
                        ) : canAddReview(visit) ? (
                          <div className="review-actions">
                            <div className="deadline-notice">
                              <p className="deadline-text">
                                {getDaysRemaining(visit)} {getDaysRemaining(visit) === 1 ? 'day' : 'days'} left to review
                              </p>
                            </div>
                            <button
                              className="add-review-button"
                              onClick={() => handleAddReview(visit)}
                            >
                              <Plus size={18} />
                              Add Review
                            </button>
                          </div>
                        ) : (
                          <div className="review-status expired">
                            Review period expired
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More Trigger */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="load-more-trigger">
                  {isFetchingNextPage && (
                    <div className="load-more-spinner">
                      <Loading message="Loading more visits..." />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Favorites Tab Content */}
      {activeTab === 'favorites' && (
        <div className="tab-content">
          {favoritesLoading ? (
            <Loading message="Loading favorites..." />
          ) : favorites.length === 0 ? (
            <EmptyState
              icon={<Heart size={64} />}
              title="No favorites yet"
              description="Start adding cafes to your favorites to see them here!"
            />
          ) : (
            <div className="favorites-grid">
              {favorites.map((cafe) => (
                <div
                  key={cafe.id}
                  className="cafe-card"
                  onClick={() => handleCafeClick(cafe)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => e.key === 'Enter' && handleCafeClick(cafe)}
                >
                  <div className="card-header">
                    <h3 className="cafe-name">{cafe.name}</h3>
                    <button
                      className="favorite-button active"
                      onClick={(e) => handleRemoveFavorite(cafe.id, e)}
                      aria-label="Remove from favorites"
                    >
                      <Heart size={20} fill="currentColor" />
                    </button>
                  </div>

                  <p className="cafe-address">
                    <MapPin size={14} />
                    {cafe.address}
                  </p>

                  <div className="cafe-meta">
                    {cafe.average_wfc_rating && (
                      <span className="rating">
                        <Star size={14} fill="currentColor" />
                        {formatRating(cafe.average_wfc_rating)}
                      </span>
                    )}
                    {cafe.price_range && (
                      <span className="price">{formatPriceRange(cafe.price_range)}</span>
                    )}
                    {cafe.distance && (
                      <span className="distance">{cafe.distance}</span>
                    )}
                  </div>

                  <div className="cafe-stats">
                    <span className="stat">{cafe.total_reviews || 0} reviews</span>
                    <span className="stat">{cafe.total_visits || 0} visits</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <>
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
        </>
      )}

      {/* Edit Visit Modal */}
      {showEditVisit && editingVisit && (
        <div className="modal-overlay" onClick={() => setShowEditVisit(false)}>
          <div className="edit-visit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Visit Details</h2>
              <button className="close-button" onClick={() => setShowEditVisit(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <p className="edit-cafe-name">{editingVisit.cafe.name}</p>
              <p className="edit-visit-date">
                <Clock size={14} />
                {formatDate(editingVisit.visit_date)}
              </p>

              <div className="form-group">
                <label htmlFor="edit-amount-spent">
                  <DollarSign size={16} />
                  Amount Spent (Optional)
                </label>
                <div className="currency-input-group">
                  <input
                    id="edit-amount-spent"
                    type="number"
                    value={editAmountSpent}
                    onChange={(e) => setEditAmountSpent(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="currency-input"
                  />
                  <select
                    id="edit-currency"
                    value={editCurrency}
                    onChange={(e) => setEditCurrency(e.target.value)}
                    className="currency-select"
                  >
                    {CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.symbol} {curr.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-visit-time">
                  <Clock size={16} />
                  Visit Time
                </label>
                <select
                  id="edit-visit-time"
                  value={editVisitTime || ''}
                  onChange={(e) => setEditVisitTime(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Not specified</option>
                  {Object.entries(VISIT_TIME_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="deadline-info">
                <p>
                  {getDaysRemaining(editingVisit)} {getDaysRemaining(editingVisit) === 1 ? 'day' : 'days'} left to edit
                </p>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowEditVisit(false)}
              >
                Cancel
              </button>
              <button
                className="save-button"
                onClick={handleSaveVisitEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {visitToDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Delete Visit?"
          message={
            visitToDelete.has_review
              ? <>Are you sure you want to delete your visit to <span className="neo-highlight">{visitToDelete.cafe.name}</span>? This will also permanently delete your review. This action cannot be undone.</>
              : <>Are you sure you want to delete your visit to <span className="neo-highlight">{visitToDelete.cafe.name}</span>? This action cannot be undone.</>
          }
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          variant="danger"
          isLoading={isDeleting}
        />
      )}

      {/* Cafe Detail Sheet (for favorites) */}
      {selectedCafe && (
        <CafeDetailSheet
          cafe={selectedCafe}
          isOpen={!!selectedCafe}
          onClose={() => setSelectedCafe(null)}
          onLogVisit={handleLogVisit}
        />
      )}

      {/* Add Visit Modal (for favorites) */}
      <AddVisitModal
        isOpen={showAddVisit}
        onClose={() => {
          setShowAddVisit(false);
          setVisitCafe(undefined);
        }}
        onSuccess={handleVisitSuccess}
        onAddReview={handleAddReviewFromFavorites}
        preselectedCafe={visitCafe}
      />

      {/* Review Form Modal (shared) */}
      {showReviewForm && (selectedVisit || (reviewVisitId !== null && reviewCafeId !== null)) && (
        <ReviewForm
          visitId={selectedVisit?.id || reviewVisitId!}
          cafeId={selectedVisit?.cafe.id || reviewCafeId!}
          cafeName={selectedVisit?.cafe.name || reviewCafeName}
          existingReview={existingReview}
          isViewMode={isViewMode}
          isOpen={showReviewForm}
          onClose={() => {
            setShowReviewForm(false);
            setExistingReview(null);
            setIsViewMode(false);
            setReviewVisitId(null);
            setReviewCafeId(null);
            setReviewCafeName('');
          }}
          onSuccess={selectedVisit ? handleReviewSuccess : handleReviewSuccessFromFavorites}
        />
      )}

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

      {/* Followers/Following Modal */}
      <FollowersModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        username={user?.username || ''}
        type={followModalType}
        onUserClick={(clickedUsername) => {
          setShowFollowersModal(false);
          showPanel('userProfile', { username: clickedUsername });
        }}
      />
    </div>
  );
};

export default ProfilePanel;
