import React from 'react';
import {
  ChevronRight,
  Bookmark,
  Heart,
  Coffee,
  Wifi,
  Star,
  MapPin,
  Briefcase,
  Users,
  Moon,
  Sun,
  Music,
  BookOpen,
  Camera,
  Gift,
  Home,
  Plane,
  Zap,
} from 'lucide-react';
import type { CafeList } from '../../types';
import styles from './Lists.module.css';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  bookmark: Bookmark,
  heart: Heart,
  coffee: Coffee,
  wifi: Wifi,
  star: Star,
  'map-pin': MapPin,
  briefcase: Briefcase,
  users: Users,
  moon: Moon,
  sun: Sun,
  music: Music,
  'book-open': BookOpen,
  camera: Camera,
  gift: Gift,
  home: Home,
  plane: Plane,
  zap: Zap,
};

interface ListCardProps {
  list: CafeList;
  onClick: (list: CafeList) => void;
}

const ListCard: React.FC<ListCardProps> = ({ list, onClick }) => {
  const IconComponent = ICON_MAP[list.icon] || Bookmark;

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
