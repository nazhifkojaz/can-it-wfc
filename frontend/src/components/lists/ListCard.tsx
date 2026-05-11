import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { CafeList } from '../../types';
import { LIST_ICON_MAP } from '../../utils/listIcons';
import styles from './Lists.module.css';

interface ListCardProps {
  list: CafeList;
  onClick: (list: CafeList) => void;
}

const ListCard: React.FC<ListCardProps> = ({ list, onClick }) => {
  const IconComponent = LIST_ICON_MAP[list.icon] || LIST_ICON_MAP.bookmark;

  return (
    <div className={styles.listCard} onClick={() => onClick(list)}>
      <div className={styles.listCardIcon}>
        <IconComponent size={20} />
      </div>
      <div className={styles.listCardInfo}>
        <p className={styles.listCardName}>
          {list.name}
          {list.is_default && <span className={styles.defaultBadge}>Default</span>}
        </p>
        <p className={styles.listCardCount}>
          {list.item_count} {list.item_count === 1 ? 'cafe' : 'cafes'}
        </p>
      </div>
      <ChevronRight size={18} color="var(--neo-gray-400)" />
    </div>
  );
};

export default ListCard;
