import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  Home,
  MapPin,
  Clock,
  Plus,
  Trash2,
  DollarSign,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useResultModal, useVisits, useFollowersModal, useProfileSettings, useMyReviews, VisitFilters } from '../../hooks';
import { usePanel } from '../../contexts/PanelContext';
import { SharedResultModal, Loading, EmptyState, ConfirmDialog } from '../common';
import AvatarUpload from '../profile/AvatarUpload';
import ReviewForm from '../review/ReviewForm';
import CafeDetailSheet from '../cafe/CafeDetailSheet';
import AddVisitReviewModal from '../visit/AddVisitReviewModal';
import FollowersModal from '../social/FollowersModal';
import ListsPanel from '../lists/ListsPanel';
import ListView from '../lists/ListView';
import SavedListsTab from '../profile/SavedListsTab';
import ReviewsTab from '../profile/ReviewsTab';
import { reviewApi } from '../../api/client';
import { formatDistanceToNow, differenceInDays, differenceInHours, startOfMonth, subMonths, startOfYear, format, addDays } from 'date-fns';
import { formatDate, formatRating } from '../../utils';
import { CURRENCIES } from '../../utils/currency';
import { formatVisitTime, groupVisitsByDate, getAmountSpentLabel } from '../../utils/visit';
import { REVIEW_CONFIG, VISIT_TIME_LABELS } from '../../config/constants';
import { Visit, Review, Cafe } from '../../types';
import { useInView } from 'react-intersection-observer';
import { logger } from '../../utils/logger';
import { trackVisitDeleted, trackProfileTabViewed } from '../../lib/analytics';
import './ProfilePanel.css';

const ProfilePanel: React.FC = () => {
  const { hidePanel } = usePanel();
  const { user, logout, updateUser } = useAuth();
  const resultModal = useResultModal();

  // Tab state
  const [activeTab, setActiveTab] = useState<'settings' | 'visits' | 'reviews' | 'lists' | 'saved'>('visits');
  const [isVisitsDropdownOpen, setIsVisitsDropdownOpen] = useState(false);
  const visitsDropdownRef = useRef<HTMLDivElement>(null);
  const [isListsDropdownOpen, setIsListsDropdownOpen] = useState(false);
  const listsDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedListId, setSelectedListId] = useState<number | null>(null);

  // Visit filter/sort state
  const [datePreset, setDatePreset] = useState<string>('all');
  const [customDateFrom, setCustomDateFrom] = useState<string>('');
  const [customDateTo, setCustomDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const visitFilters: VisitFilters = React.useMemo(() => {
    const filters: VisitFilters = {
      ordering: sortBy === 'oldest' ? 'visit_date' : '-visit_date',
    };
    if (datePreset === 'custom' && customDateFrom) {
      filters.visit_date__gte = customDateFrom;
    }
    if (datePreset === 'custom' && customDateTo) {
      filters.visit_date__lte = customDateTo;
    }
    if (datePreset === 'this_month') {
      filters.visit_date__gte = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    }
    if (datePreset === 'last_3_months') {
      filters.visit_date__gte = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
    }
    if (datePreset === 'this_year') {
      filters.visit_date__gte = format(startOfYear(new Date()), 'yyyy-MM-dd');
    }
    return filters;
  }, [datePreset, customDateFrom, customDateTo, sortBy]);

  // Followers/Following modal state
  const { openFollowersModal, followersModalProps } = useFollowersModal();

  // Settings state and handlers
  const {
    bio,
    setBio,
    displayName,
    setDisplayName,
    isEditing,
    setIsEditing,
    editingDisplayName,
    setEditingDisplayName,
    profileVisibility,
    loading,
    savingDisplayName,
    editingUsername,
    setEditingUsername,
    newUsername,
    setNewUsername,
    savingUsername,
    handleSaveProfile,
    handleSaveDisplayName,
    handleUsernameUpdate,
    handleVisibilityToggle,
    handleLogout,
  } = useProfileSettings({ user, updateUser, logout, resultModal });

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
  } = useVisits(visitFilters);

  // My reviews hook
  const {
    reviews: myReviews,
    loading: reviewsLoading,
    fetchNextPage: fetchNextReviewsPage,
    hasNextPage: hasNextReviewsPage,
    isFetchingNextPage: isFetchingNextReviewsPage,
  } = useMyReviews();

  // Click outside dropdown handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (visitsDropdownRef.current && !visitsDropdownRef.current.contains(e.target as Node)) {
        setIsVisitsDropdownOpen(false);
      }
      if (listsDropdownRef.current && !listsDropdownRef.current.contains(e.target as Node)) {
        setIsListsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // Track reviews per cafe
  const [cafeReviews, setCafeReviews] = useState<Map<number, Review | null>>(new Map());

  const [showEditVisit, setShowEditVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [editAmountSpent, setEditAmountSpent] = useState<string>('');
  const [editCurrency, setEditCurrency] = useState<string>('USD');
  const [editVisitTime, setEditVisitTime] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [visitToDelete, setVisitToDelete] = useState<Visit | null>(null);
  const [hasReviewForDelete, setHasReviewForDelete] = useState<boolean | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [showAddVisitReview, setShowAddVisitReview] = useState(false);
  const [visitCafe, setVisitCafe] = useState<Cafe | undefined>(undefined);

  // Cafe-level review state
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

  // Load review statuses for all cafes
  // Memoize cafe IDs to prevent unnecessary refetches
  const cafeIds = React.useMemo(() => {
    if (!visits || visits.length === 0) return [];
    return [...new Set(visits.filter(v => v.cafe).map(v => v.cafe.id))];
  }, [visits]);

  // Convert to stable string key for dependency comparison
  const cafeIdsKey = cafeIds.join(',');

  React.useEffect(() => {
    const loadReviewStatuses = async () => {
      if (cafeIds.length === 0) return;

      try {
        // NEW: Use bulk endpoint - single request instead of N parallel requests
        const reviewMap = await reviewApi.getUserCafeReviews(cafeIds);

        // Convert to Map for state
        const reviewEntries: [number, Review | null][] = Object.entries(reviewMap).map(
          ([id, review]) => [parseInt(id), review]
        );
        setCafeReviews(new Map(reviewEntries));
      } catch (error) {
        logger.error('Error loading review statuses', error, 'ProfilePanel');
      }
    };

    if (activeTab === 'visits' && cafeIds.length > 0) {
      loadReviewStatuses();
    }
  }, [cafeIdsKey, activeTab]); // Use string key instead of array

  // Helper function to get review for a cafe
  const getReviewForCafe = (cafeId: number): Review | null => {
    return cafeReviews.get(cafeId) ?? null;
  };

  // Check if visit is still editable
  const canEditVisit = (visit: Visit): boolean => {
    const visitDate = new Date(visit.visit_date);
    const daysSince = differenceInDays(new Date(), visitDate);
    return daysSince <= REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT;
  };

  const getEditTimeLeft = (visit: Visit): string | null => {
    const deadline = addDays(new Date(visit.visit_date), REVIEW_CONFIG.DAYS_TO_REVIEW_AFTER_VISIT + 1);
    const now = new Date();
    const hoursLeft = differenceInHours(deadline, now);
    if (hoursLeft <= 0) return null;
    if (hoursLeft < 24) return `${hoursLeft}h left`;
    const daysLeft = Math.floor(hoursLeft / 24);
    const remainHours = hoursLeft % 24;
    return `${daysLeft}d ${remainHours}h left`;
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


  // Cafe-level review handlers
  const handleAddCafeReview = (cafeId: number, cafeName: string) => {
    setReviewCafeId(cafeId);
    setReviewCafeName(cafeName);
    setExistingReview(null);
    setIsViewMode(false);
    setShowReviewForm(true);
  };

  const handleEditCafeReview = (cafeId: number, cafeName: string, review: Review) => {
    setReviewCafeId(cafeId);
    setReviewCafeName(cafeName);
    setExistingReview(review);
    setIsViewMode(false);
    setShowReviewForm(true);
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

      resultModal.showSuccess('Visit Updated!', 'Your visit has been updated successfully.');
    } catch (error) {
      resultModal.showError('Failed to Update Visit', error);
    }
  };

  const handleDeleteClick = async (visit: Visit, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisitToDelete(visit);
    setShowDeleteConfirm(true);

    // Check if user has a review for this cafe
    try {
      const review = await reviewApi.getUserCafeReview(visit.cafe.id);
      setHasReviewForDelete(!!review);
    } catch {
      setHasReviewForDelete(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!visitToDelete) return;

    setIsDeleting(true);

    try {
      await deleteVisit(visitToDelete.id);

      // Track analytics
      trackVisitDeleted({
        cafeId: visitToDelete.cafe.id,
        cafeName: visitToDelete.cafe.name,
      });

      setShowDeleteConfirm(false);
      setVisitToDelete(null);
      refetchVisits();

      resultModal.showSuccess('Visit Deleted', 'Your visit has been deleted successfully.');
    } catch (error) {
      resultModal.showError('Failed to Delete Visit', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setVisitToDelete(null);
  };

  const handleLogVisit = () => {
    if (selectedCafe) {
      setVisitCafe(selectedCafe);
    }
    setShowAddVisitReview(true);
    setSelectedCafe(null);
  };

  const handleVisitReviewSuccess = () => {
    setShowAddVisitReview(false);
    setVisitCafe(undefined);
    setSelectedCafe(null);
    refetchVisits();
  };

  const handleReviewSuccessFromVisits = async () => {
    setShowReviewForm(false);
    setReviewCafeId(null);
    setReviewCafeName('');

    if (visits && visits.length > 0) {
      const cafeIds = [...new Set(visits.map(v => v.cafe.id))];
      try {
        const reviewMap = await reviewApi.getUserCafeReviews(cafeIds);
        const reviewEntries: [number, Review | null][] = Object.entries(reviewMap).map(
          ([id, review]) => [parseInt(id), review]
        );
        setCafeReviews(new Map(reviewEntries));
      } catch (error) {
        logger.error('Error loading review statuses', error, 'ProfilePanel');
      }
    }

    refetchVisits();

    resultModal.showSuccess('Review Submitted!', 'Your review has been submitted successfully.');
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

        {/* Display Name Section - Always Editable */}
        {editingDisplayName ? (
          <div className="username-edit-form">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name (optional)"
              className="username-input"
              maxLength={50}
            />
            <div className="username-edit-actions">
              <button
                className="button-secondary-small"
                onClick={() => {
                  setDisplayName(user?.display_name || '');
                  setEditingDisplayName(false);
                }}
                disabled={savingDisplayName}
              >
                Cancel
              </button>
              <button
                className="button-primary-small"
                onClick={handleSaveDisplayName}
                disabled={savingDisplayName}
              >
                {savingDisplayName ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="username-display">
            <h1 className="username">
              {user.effective_display_name || user.display_name || user.username}
            </h1>
            <button
              className="edit-username-button"
              onClick={() => setEditingDisplayName(true)}
              aria-label="Edit display name"
              title="Edit display name"
            >
              <Edit size={16} />
            </button>
          </div>
        )}

        {/* Username Section - Editable with 30-day cooldown */}
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
          <div className="username-secondary">
            <p className="username-label">@{user.username}</p>
            <button
              className="edit-username-secondary-button"
              onClick={() => setEditingUsername(true)}
              aria-label="Edit username"
              title="Edit username (30-day cooldown applies)"
            >
              <Edit size={14} />
            </button>
          </div>
        )}

        <p className="email" data-ph-mask>
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
          onClick={() => openFollowersModal('followers')}
        >
          <UserIcon size={24} />
          <div className="stat-info">
            <p className="stat-value">{user.followers_count || 0}</p>
            <p className="stat-label">Followers</p>
          </div>
        </div>

        <div
          className="stat-card clickable"
          onClick={() => openFollowersModal('following')}
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
          {/* Visits / Reviews Dropdown */}
          <div
            ref={visitsDropdownRef}
            className={`profile-tab-dropdown ${activeTab === 'visits' || activeTab === 'reviews' ? 'active' : ''}`}
          >
            <button
              className="profile-tab-dropdown-label"
              onClick={() => {
                setActiveTab(activeTab === 'reviews' ? 'reviews' : 'visits');
                trackProfileTabViewed({ tab: activeTab === 'reviews' ? 'reviews' : 'visits' });
              }}
            >
              {activeTab === 'reviews' ? 'Reviews' : 'Visits'}
            </button>
            <button
              className="profile-tab-dropdown-trigger"
              onClick={() => setIsVisitsDropdownOpen(!isVisitsDropdownOpen)}
              aria-label="Toggle visits/reviews menu"
            >
              <ChevronDown size={14} className={isVisitsDropdownOpen ? 'chevron-up' : ''} />
            </button>
            {isVisitsDropdownOpen && (
              <div className="profile-tab-dropdown-menu">
                <button
                  className={`profile-tab-dropdown-item ${activeTab === 'visits' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('visits');
                    setIsVisitsDropdownOpen(false);
                    trackProfileTabViewed({ tab: 'visits' });
                  }}
                >
                  {activeTab === 'visits' && '● '}Visits
                </button>
                <button
                  className={`profile-tab-dropdown-item ${activeTab === 'reviews' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('reviews');
                    setIsVisitsDropdownOpen(false);
                    trackProfileTabViewed({ tab: 'reviews' });
                  }}
                >
                  {activeTab === 'reviews' && '● '}Reviews
                </button>
              </div>
            )}
          </div>

          {/* Lists / Saved Dropdown */}
          <div
            ref={listsDropdownRef}
            className={`profile-tab-dropdown ${activeTab === 'lists' || activeTab === 'saved' ? 'active' : ''}`}
          >
            <button
              className="profile-tab-dropdown-label"
              onClick={() => {
                setActiveTab(activeTab === 'saved' ? 'saved' : 'lists');
                trackProfileTabViewed({ tab: activeTab === 'saved' ? 'saved' : 'lists' });
              }}
            >
              {activeTab === 'saved' ? 'Saved' : 'Lists'}
            </button>
            <button
              className="profile-tab-dropdown-trigger"
              onClick={() => setIsListsDropdownOpen(!isListsDropdownOpen)}
              aria-label="Toggle lists/saved menu"
            >
              <ChevronDown size={14} className={isListsDropdownOpen ? 'chevron-up' : ''} />
            </button>
            {isListsDropdownOpen && (
              <div className="profile-tab-dropdown-menu">
                <button
                  className={`profile-tab-dropdown-item ${activeTab === 'lists' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('lists');
                    setIsListsDropdownOpen(false);
                    trackProfileTabViewed({ tab: 'lists' });
                  }}
                >
                  {activeTab === 'lists' && '● '}My Lists
                </button>
                <button
                  className={`profile-tab-dropdown-item ${activeTab === 'saved' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('saved');
                    setIsListsDropdownOpen(false);
                    trackProfileTabViewed({ tab: 'saved' });
                  }}
                >
                  {activeTab === 'saved' && '● '}Saved
                </button>
              </div>
            )}
          </div>

          <button
            className={`profile-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settings');
              trackProfileTabViewed({ tab: 'settings' });
            }}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Visits Tab Content */}
      {activeTab === 'visits' && (
        <div className="tab-content">
          <div className="visits-toolbar">
            <div className="visits-toolbar-group">
              <select
                className="visits-toolbar-select"
                value={datePreset}
                onChange={(e) => {
                  setDatePreset(e.target.value);
                  if (e.target.value !== 'custom') {
                    setShowDatePicker(false);
                  } else {
                    setShowDatePicker(true);
                  }
                }}
              >
                <option value="all">All time</option>
                <option value="this_month">This month</option>
                <option value="last_3_months">Last 3 months</option>
                <option value="this_year">This year</option>
                <option value="custom">Custom range</option>
              </select>
              <select
                className="visits-toolbar-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
            {showDatePicker && (
              <div className="visits-date-range">
                <input
                  type="date"
                  className="visits-date-input"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  placeholder="From"
                />
                <span className="visits-date-separator">→</span>
                <input
                  type="date"
                  className="visits-date-input"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  placeholder="To"
                />
              </div>
            )}
          </div>
          {visitsLoading ? (
            <Loading message="Loading your visits..." />
          ) : visits.length === 0 ? (
            <EmptyState
              icon={<MapPin size={64} />}
              title={datePreset !== 'all' ? "No visits found" : "No visits yet"}
              description={datePreset !== 'all' ? "Try adjusting your filters" : "Start exploring cafes and log your visits!"}
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

                        {/* Edit Visit Button (within edit window) */}
                        {canEditVisit(visit) && (
                          <button
                            className="edit-visit-button"
                            onClick={() => handleEditVisit(visit)}
                          >
                            <Edit size={16} />
                            Edit Visit Details
                            {getEditTimeLeft(visit) && (
                              <span className="time-left">{getEditTimeLeft(visit)}</span>
                            )}
                          </button>
                        )}

                        {/* Review Status */}
                        {(() => {
                          const review = getReviewForCafe(visit.cafe.id);

                          if (review) {
                            return (
                              <div className="review-actions">
                                <button
                                  className="review-block"
                                  onClick={() => handleEditCafeReview(visit.cafe.id, visit.cafe.name, review)}
                                  aria-label="Edit your review"
                                >
                                  <div className="review-block-content">
                                    <span className="review-block-stars">
                                      {'⭐'.repeat(review.wfc_rating)}
                                    </span>
                                    {review.comment && (
                                      <span className="review-block-comment">
                                        "{review.comment}"
                                      </span>
                                    )}
                                  </div>
                                  <Edit size={18} className="review-block-edit" />
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <div className="review-actions">
                                <button
                                  className="add-review-button"
                                  onClick={() => handleAddCafeReview(visit.cafe.id, visit.cafe.name)}
                                >
                                  <Plus size={18} />
                                  Add Review for {visit.cafe.name}
                                </button>
                              </div>
                            );
                          }
                        })()}
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

      {/* Reviews Tab Content */}
      {activeTab === 'reviews' && (
        <div className="tab-content">
          <ReviewsTab
            reviews={myReviews}
            loading={reviewsLoading}
            fetchNextPage={fetchNextReviewsPage}
            hasNextPage={hasNextReviewsPage}
            isFetchingNextPage={isFetchingNextReviewsPage}
            isOwnProfile={true}
            onDeleteReview={(reviewId, cafeName) => {
              setVisitToDelete({ id: reviewId, cafe: { name: cafeName } } as unknown as Visit);
              setShowDeleteConfirm(true);
            }}
            onEditReview={(review) => {
              handleEditCafeReview(review.cafe.id, review.cafe.name, review);
            }}
          />
        </div>
      )}

      {/* Lists Tab Content */}
      {activeTab === 'lists' && (
        <div className="tab-content">
          <ListsPanel
            onCafeClick={(item) => {
              setSelectedCafe(item.cafe);
            }}
          />
        </div>
      )}

      {/* Saved Tab Content */}
      {activeTab === 'saved' && (
        <div className="tab-content">
          <SavedListsTab
            onListClick={(list) => {
              setSelectedListId(list.id);
            }}
          />
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
              {/* Profile Visibility Toggle */}
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-icon">
                    {profileVisibility === 'public' ? <Eye size={20} /> : <EyeOff size={20} />}
                  </div>
                  <div>
                    <p className="setting-label">Profile Visibility</p>
                    <p className="setting-description">
                      {profileVisibility === 'public'
                        ? 'Your profile and name are visible to everyone'
                        : 'Only followers can see your profile. Your name is masked as '
                          + (user.display_name || user.username || 'Use').substring(0, 3) + '***'
                      }
                    </p>
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={profileVisibility === 'public'}
                    onChange={(e) => handleVisibilityToggle(e.target.checked ? 'public' : 'private')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

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
            hasReviewForDelete !== false ? (
              <>Are you sure you want to delete your visit to <span className="neo-highlight">{visitToDelete.cafe.name}</span>? Your review for this cafe will remain unchanged and will stay public. This action cannot be undone.</>
            ) : (
              <>Are you sure you want to delete your visit to <span className="neo-highlight">{visitToDelete.cafe.name}</span>? This action cannot be undone.</>
            )
          }
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          variant="danger"
          isLoading={isDeleting}
        />
      )}

      {/* List View (for saved lists) */}
      {selectedListId && (
        <div className="list-view-overlay">
          <ListView
            listId={selectedListId}
            onBack={() => setSelectedListId(null)}
            onCafeClick={(item) => {
              setSelectedListId(null);
              setSelectedCafe(item.cafe);
            }}
          />
        </div>
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

      {/* Add Visit + Review Modal (for favorites) */}
      <AddVisitReviewModal
        isOpen={showAddVisitReview}
        onClose={() => {
          setShowAddVisitReview(false);
          setVisitCafe(undefined);
        }}
        onSuccess={handleVisitReviewSuccess}
        preselectedCafe={visitCafe}
      />

      {/* Review Form Modal (shared) */}
      {showReviewForm && reviewCafeId !== null && (
        <ReviewForm
          cafeId={reviewCafeId}
          cafeName={reviewCafeName}
          existingReview={existingReview}
          isViewMode={isViewMode}
          isOpen={showReviewForm}
          onClose={() => {
            setShowReviewForm(false);
            setExistingReview(null);
            setIsViewMode(false);
            setReviewCafeId(null);
            setReviewCafeName('');
          }}
          onSuccess={handleReviewSuccessFromVisits}
        />
      )}

      {/* ResultModal for logout confirmation and other actions */}
      <SharedResultModal resultModal={resultModal} />

      {/* Followers/Following Modal */}
      <FollowersModal
        {...followersModalProps}
        username={user?.username || ''}
        isOwnModal={true}
      />
    </div>
  );
};

export default ProfilePanel;
