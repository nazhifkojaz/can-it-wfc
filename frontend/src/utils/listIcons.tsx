import {
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

export const LIST_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; fill?: string; color?: string; strokeWidth?: number }>> = {
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

export const AVAILABLE_LIST_ICONS = Object.keys(LIST_ICON_MAP);

export const ListIcon: React.FC<{ icon: string; size?: number; className?: string; fill?: string }> = ({ icon, size = 14, className, fill }) => {
  const IconComponent = LIST_ICON_MAP[icon] || Bookmark;
  return <IconComponent size={size} className={className} fill={fill} />;
};
