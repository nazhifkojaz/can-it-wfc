import React, { useState, useRef, useEffect } from 'react';
import { Check, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCafeLists, useLists } from '../../hooks';
import type { Cafe } from '../../types';
import { listApi } from '../../api/client';
import { extractApiError } from '../../utils/errorUtils';
import { ListIcon, AVAILABLE_LIST_ICONS as AVAILABLE_ICONS } from '../../utils/listIcons';
import styles from './SaveToListPopover.module.css';

interface SaveToListPopoverProps {
  cafe: Cafe;
  onClose: () => void;
}

const SaveToListPopover: React.FC<SaveToListPopoverProps> = ({ cafe, onClose }) => {
  const queryClient = useQueryClient();
  const cafeId = cafe.is_registered && cafe.id > 0 ? cafe.id : undefined;
  const { memberships, toggleInList, toggleToGo, toggleFavorites, isToggling } = useCafeLists(cafeId);
  const { lists, createList, isCreating } = useLists();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('bookmark');
  const [pendingListId, setPendingListId] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleToggle = async (listId: number, inList: boolean) => {
    setPendingListId(listId);
    try {
        if (!cafe.is_registered) {
          // Auto-register and add to list
          await listApi.addItemWithRegistration(listId, {
            google_place_id: cafe.google_place_id || '',
            cafe_name: cafe.name,
            cafe_address: cafe.address,
            cafe_latitude: parseFloat(cafe.latitude).toFixed(8),
            cafe_longitude: parseFloat(cafe.longitude).toFixed(8),
          });
          // After registration, invalidate queries so nearby cafes/markers update
          queryClient.invalidateQueries({ queryKey: ['cafes'] });
          queryClient.invalidateQueries({ queryKey: ['lists'] });
          onClose();
      } else {
        await toggleInList(listId, inList);
      }
    } catch (error) {
      const apiError = extractApiError(error);
      console.error('Failed to toggle list:', apiError.message);
    } finally {
      setPendingListId(null);
    }
  };

  const handleToggleFavorites = async () => {
      if (!cafe.is_registered) {
        try {
          await listApi.addToFavoritesWithRegistration({
            google_place_id: cafe.google_place_id || '',
            cafe_name: cafe.name,
            cafe_address: cafe.address,
            cafe_latitude: parseFloat(cafe.latitude).toFixed(8),
            cafe_longitude: parseFloat(cafe.longitude).toFixed(8),
          });
          queryClient.invalidateQueries({ queryKey: ['cafes'] });
          queryClient.invalidateQueries({ queryKey: ['lists'] });
          onClose();
        } catch (error) {
          const apiError = extractApiError(error);
          console.error('Failed to add to favorites:', apiError.message);
        }
        return;
      }
    await toggleFavorites();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    await createList({ name: trimmed, icon: newIcon });
    setNewName('');
    setNewIcon('bookmark');
    setShowCreate(false);
  };

  // For unregistered cafes, derive memberships from lists with in_list: false
  const effectiveMemberships: typeof memberships = cafeId
    ? memberships
    : lists.map((l) => ({
        id: l.id,
        name: l.name,
        list_type: l.list_type,
        icon: l.icon,
        is_default: l.is_default,
        in_list: false,
      }));

  // Sort: to_go first, favorites second, then custom lists
  const sortedMemberships = [...effectiveMemberships].sort((a, b) => {
    if (a.list_type === 'to_go') return -1;
    if (b.list_type === 'to_go') return 1;
    if (a.list_type === 'favorites') return -1;
    if (b.list_type === 'favorites') return 1;
    return 0;
  });

  const toGoMembership = effectiveMemberships.find((m) => m.list_type === 'to_go');
  const favoritesMembership = effectiveMemberships.find((m) => m.list_type === 'favorites');

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.popover} ref={popoverRef}>
        <p className={styles.popoverHeader}>Save to List</p>

        <div className={styles.listRows}>
          {/* To-go */}
          {toGoMembership && (
            <div
              className={`${styles.listRow} ${pendingListId === toGoMembership.id ? styles.saving : ''}`}
              onClick={async () => {
                if (isToggling) return;
                if (!cafe.is_registered) {
                  try {
                    await listApi.addToToGoWithRegistration({
                      google_place_id: cafe.google_place_id || '',
                      cafe_name: cafe.name,
                      cafe_address: cafe.address,
                      cafe_latitude: parseFloat(cafe.latitude).toFixed(8),
                      cafe_longitude: parseFloat(cafe.longitude).toFixed(8),
                    });
                    queryClient.invalidateQueries({ queryKey: ['cafes'] });
                    queryClient.invalidateQueries({ queryKey: ['lists'] });
                  } catch (err) {
                    console.error('Failed to add to to-go:', extractApiError(err as any).message);
                  }
                } else {
                  await toggleToGo();
                }
                onClose();
              }}
            >
              <div className={`${styles.checkbox} ${toGoMembership.in_list ? styles.checked : ''}`}>
                {toGoMembership.in_list && <Check size={12} color="white" strokeWidth={3} />}
              </div>
              <ListIcon icon={toGoMembership.icon} size={14} />
              <div className={styles.listRowInfo}>
                <p className={styles.listRowName}>{toGoMembership.name}</p>
              </div>
            </div>
          )}

          {/* Favorites */}
          {favoritesMembership && (
            <div
              className={`${styles.listRow} ${pendingListId === favoritesMembership.id ? styles.saving : ''}`}
              onClick={() => !isToggling && handleToggleFavorites()}
            >
              <div className={`${styles.checkbox} ${favoritesMembership.in_list ? styles.checked : ''}`}>
                {favoritesMembership.in_list && <Check size={12} color="white" strokeWidth={3} />}
              </div>
              <ListIcon icon={favoritesMembership.icon} size={14} />
              <div className={styles.listRowInfo}>
                <p className={styles.listRowName}>{favoritesMembership.name}</p>
              </div>
            </div>
          )}

          {/* Divider */}
          {sortedMemberships.some((m) => m.list_type === 'custom') && (
            <div style={{ borderTop: '1px solid var(--neo-gray-200)', margin: '4px 0' }} />
          )}

          {/* Custom lists */}
          {sortedMemberships
            .filter((m) => m.list_type === 'custom')
            .map((m) => {
              const isPending = pendingListId === m.id;
              return (
                <div
                  key={m.id}
                  className={`${styles.listRow} ${isPending ? styles.saving : ''}`}
                  onClick={() => !isToggling && handleToggle(m.id, m.in_list)}
                >
                  <div className={`${styles.checkbox} ${m.in_list ? styles.checked : ''}`}>
                    {m.in_list && <Check size={12} color="white" strokeWidth={3} />}
                  </div>
                  <ListIcon icon={m.icon} size={14} />
                  <div className={styles.listRowInfo}>
                    <p className={styles.listRowName}>{m.name}</p>
                  </div>
                </div>
              );
            })}
        </div>

        <div className={styles.popoverFooter}>
          {showCreate ? (
            <form className={styles.createForm} onSubmit={handleCreate}>
              <input
                autoFocus
                className={styles.createInput}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New list name..."
                maxLength={100}
                disabled={isCreating}
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewIcon(icon)}
                    style={{
                      padding: 4,
                      border: `2px solid ${newIcon === icon ? 'var(--neo-primary)' : 'var(--neo-black)'}`,
                      borderRadius: 4,
                      background: newIcon === icon ? 'var(--neo-primary-light)' : 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <ListIcon icon={icon} size={14} />
                  </button>
                ))}
              </div>
              <div className={styles.createActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={!newName.trim() || isCreating}>
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          ) : (
            <button className={styles.createToggleBtn} onClick={() => setShowCreate(true)}>
              <Plus size={14} />
              New List
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SaveToListPopover;
