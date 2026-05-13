import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSharedListDetail } from '../hooks/useSharedListDetail';
import styles from './SharedListPage.module.css';

const SharedListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get('token') || undefined;
  const listId = parseInt(id || '0');

  const { data: list, isLoading, isError } = useSharedListDetail(listId, token);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (cafeId: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(cafeId)) {
        next.delete(cafeId);
      } else {
        next.add(cafeId);
      }
      return next;
    });
  };

  const handleBack = () => {
    if (user) {
      navigate('/map');
    } else {
      navigate('/');
    }
  };

  const handleSignIn = () => {
    const currentUrl = window.location.pathname + window.location.search;
    localStorage.setItem('redirect_after_login', currentUrl);
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <header className={styles.topBar}>
          <span className={styles.logo} onClick={handleBack}>CAN-IT-WFC</span>
        </header>
        <div className={styles.content}>
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonMeta} />
            <div className={styles.skeletonItems}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.skeletonRow}>
                  <div className={styles.skeletonRowIcon} />
                  <div className={styles.skeletonRowLines}>
                    <div className={styles.skeletonRowLine} />
                    <div className={`${styles.skeletonRowLine} ${styles.skeletonRowLineSm}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.footer}>© {new Date().getFullYear()} Can-It-WFC</div>
      </div>
    );
  }

  if (isError || !list) {
    return (
      <div className={styles.container}>
        <header className={styles.topBar}>
          <span className={styles.logo} onClick={handleBack}>CAN-IT-WFC</span>
          {!user && (
            <button className={styles.signInBtn} onClick={handleSignIn}>
              Sign in
            </button>
          )}
        </header>
        <div className={styles.content}>
          <div className={styles.errorCard}>
            <div className={styles.errorIcon}>🔍</div>
            <h1 className={styles.errorTitle}>List Not Found</h1>
            <p className={styles.errorText}>
              This list doesn&apos;t exist, was deleted, or the link is invalid.
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

  return (
    <div className={styles.container}>
      <header className={styles.topBar}>
        <span className={styles.logo} onClick={handleBack}>CAN-IT-WFC</span>
        {!user && (
          <button className={styles.signInBtn} onClick={handleSignIn}>
            Sign in
          </button>
        )}
      </header>

      <div className={styles.content}>
        <div className={styles.listCard}>
          <h1 className={styles.listName}>{list.name}</h1>
          <p className={styles.listMeta}>
            by @{list.owner?.username || 'unknown'} &middot; {list.item_count}{' '}
            {list.item_count === 1 ? 'cafe' : 'cafes'}
          </p>

          <div className={styles.items}>
            {list.items.map((item) => {
              const isExpanded = expandedItems.has(item.cafe.id);
              const cafe = item.cafe;
              const mapsUrl = cafe.google_place_id
                ? `https://www.google.com/maps/place/?q=place_id:${cafe.google_place_id}`
                : `https://www.google.com/maps?q=${cafe.latitude},${cafe.longitude}`;

              return (
                <div key={cafe.id} className={styles.itemWrapper}>
                  <div
                    className={`${styles.itemRow} ${isExpanded ? styles.itemRowExpanded : ''}`}
                    onClick={() => toggleItem(cafe.id)}
                  >
                    <div className={styles.itemIcon}>☕</div>
                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{cafe.name}</p>
                      {cafe.address && !isExpanded && (
                        <p className={styles.itemAddress}>{cafe.address}</p>
                      )}
                    </div>
                    <ChevronDown
                      size={18}
                      className={`${styles.expandChevron} ${isExpanded ? styles.expandChevronOpen : ''}`}
                    />
                  </div>

                  {isExpanded && (
                    <div className={styles.itemDetail}>
                      {cafe.address && (
                        <div className={styles.detailAddress}>
                          <MapPin size={14} className={styles.detailAddressIcon} />
                          <span className={styles.detailAddressText}>{cafe.address}</span>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.gpsBtn}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Open in Google Maps"
                          >
                            <MapPin size={14} />
                          </a>
                        </div>
                      )}
                      {item.note && (
                        <div className={styles.detailNote}>
                          <p className={styles.noteLabel}>Note</p>
                          <p className={styles.noteText}>{item.note}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {!user && (
          <div className={styles.ctaCard}>
            <button className={styles.signInBtn} onClick={handleSignIn}>
              Sign in to save or create your own list
            </button>
          </div>
        )}
      </div>

      <div className={styles.footer}>© {new Date().getFullYear()} Can-It-WFC</div>
    </div>
  );
};

export default SharedListPage;
