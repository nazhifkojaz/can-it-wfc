import React, { useState, useCallback } from 'react';
import { Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { usePanel } from '../../contexts/PanelContext';
import { cafeApi } from '../../api/client';
import { queryKeys } from '../../config/queryKeys';
import {
  useRecentReviews,
  useFeaturedLists,
  useTrendingCafes,
  useTrendingLists,
} from '../../hooks/useDiscover';
import CafeDetailSheet from '../cafe/CafeDetailSheet';
import ListView from '../lists/ListView';
import FeaturedListsSection from './sections/FeaturedListsSection';
import TrendingListsSection from './sections/TrendingListsSection';
import TrendingCafesSection from './sections/TrendingCafesSection';
import RecentReviewsSection from './sections/RecentReviewsSection';
import type { DiscoverReview, DiscoverFeaturedList, DiscoverTrendingCafe, DiscoverTrendingList } from '../../types/discover';
import type { CafeListItem } from '../../types';
import styles from './DiscoverPanel.module.css';

type DiscoverView =
  | { mode: 'browse' }
  | { mode: 'cafe'; cafeId: number }
  | { mode: 'list'; listId: number };

const DiscoverPanel: React.FC = () => {
  const { hidePanel, showPanel } = usePanel();
  const [view, setView] = useState<DiscoverView>({ mode: 'browse' });

  const featured = useFeaturedLists();
  const trendingLists = useTrendingLists();
  const trending = useTrendingCafes();
  const reviews = useRecentReviews();

  const isAnyLoading = featured.isLoading || trendingLists.isLoading || trending.isLoading || reviews.isLoading;
  const isAnyRefreshing = isAnyLoading && !(featured.lists.length > 0 || trendingLists.lists.length > 0 || trending.cafes.length > 0 || reviews.reviews.length > 0);
  const allFailed = featured.error && trendingLists.error && trending.error && reviews.error;

  const refetchAll = useCallback(() => {
    featured.refetch();
    trendingLists.refetch();
    trending.refetch();
    reviews.refetch();
  }, [featured.refetch, trendingLists.refetch, trending.refetch, reviews.refetch]);

  const backToBrowse = useCallback(() => {
    setView({ mode: 'browse' });
  }, []);

  // Fetch full cafe data when entering cafe sub-view
  const cafeViewId = view.mode === 'cafe' ? view.cafeId : null;
  const { data: cafeData } = useQuery({
    queryKey: queryKeys.cafeDetail(cafeViewId!),
    queryFn: () => cafeApi.getById(cafeViewId!),
    enabled: view.mode === 'cafe',
  });

  // Handlers for section callbacks
  const handleReviewClick = useCallback((review: DiscoverReview) => {
    setView({ mode: 'cafe', cafeId: review.cafe.id });
  }, []);

  const handleUserClick = useCallback((username: string) => {
    showPanel('userProfile', { username });
  }, [showPanel]);

  const handleFindCafe = useCallback(() => {
    hidePanel();
  }, [hidePanel]);

  const handleListClick = useCallback((list: DiscoverFeaturedList) => {
    setView({ mode: 'list', listId: list.id });
  }, []);

  const handleTrendingListClick = useCallback((list: DiscoverTrendingList) => {
    setView({ mode: 'list', listId: list.id });
  }, []);

  const handleTrendingCafeClick = useCallback((cafe: DiscoverTrendingCafe) => {
    setView({ mode: 'cafe', cafeId: cafe.id });
  }, []);

  const handleListViewCafeClick = useCallback((item: CafeListItem) => {
    setView({ mode: 'cafe', cafeId: item.cafe.id });
  }, []);

  const handleLogVisit = useCallback(() => {
    backToBrowse();
  }, [backToBrowse]);

  // Sub-view: CafeDetailSheet
  if (view.mode === 'cafe') {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.headerBtn}
              onClick={backToBrowse}
              aria-label="Back to Discover"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className={styles.title}>Discover</h2>
          </div>
        </div>
        <div className={styles.subView}>
          {cafeData ? (
            <CafeDetailSheet
              cafe={cafeData}
              isOpen
              onClose={backToBrowse}
              onLogVisit={handleLogVisit}
              source="discover"
            />
          ) : (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingText}>Loading cafe...</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sub-view: ListView
  if (view.mode === 'list') {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.headerBtn}
              onClick={backToBrowse}
              aria-label="Back to Discover"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className={styles.title}>Discover</h2>
          </div>
        </div>
        <div className={styles.subView}>
          <ListView
            listId={view.listId}
            onBack={backToBrowse}
            onCafeClick={handleListViewCafeClick}
          />
        </div>
      </div>
    );
  }

  // Default: browse mode
  return (
    <div className={styles.panel} role="dialog" aria-label="Discover">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.headerBtn}
            onClick={hidePanel}
            aria-label="Close panel"
          >
            <Home size={20} />
          </button>
          <h2 className={styles.title}>Discover</h2>
        </div>
        <button
          className={styles.headerBtn}
          onClick={refetchAll}
          disabled={isAnyLoading}
          aria-label="Refresh Discover"
          aria-busy={isAnyLoading}
        >
          <RefreshCw
            size={18}
            className={isAnyRefreshing ? styles.spin : ''}
          />
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {allFailed && !isAnyLoading ? (
          <div className={styles.globalError}>
            <p>Couldn&apos;t load Discover.</p>
            <button className={styles.retryBtn} onClick={refetchAll}>
              Retry
            </button>
          </div>
        ) : (
          <>
            <FeaturedListsSection
              lists={featured.lists}
              isLoading={featured.isLoading}
              error={featured.error}
              onListClick={handleListClick}
              onRefetch={featured.refetch}
            />
            <TrendingListsSection
              lists={trendingLists.lists}
              isLoading={trendingLists.isLoading}
              error={trendingLists.error}
              onListClick={handleTrendingListClick}
              onRefetch={trendingLists.refetch}
            />
            <TrendingCafesSection
              cafes={trending.cafes}
              isLoading={trending.isLoading}
              error={trending.error}
              onCafeClick={handleTrendingCafeClick}
              onRefetch={trending.refetch}
            />
            <RecentReviewsSection
              reviews={reviews.reviews}
              isLoading={reviews.isLoading}
              isLoadingMore={reviews.isLoadingMore}
              error={reviews.error}
              hasMore={reviews.hasMore}
              onLoadMore={reviews.loadMore}
              onReviewClick={handleReviewClick}
              onUserClick={handleUserClick}
              onRefetch={reviews.refetch}
              onFindCafe={handleFindCafe}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DiscoverPanel;
