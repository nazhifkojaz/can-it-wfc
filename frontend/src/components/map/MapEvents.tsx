import { useMapEvents } from 'react-leaflet';

interface MapEventsProps {
  onMoveEnd: (center: { lat: number; lng: number }) => void;
}

const MapEvents: React.FC<MapEventsProps> = ({ onMoveEnd }) => {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMoveEnd({ lat: center.lat, lng: center.lng });
    },
  });

  return null;
};

export default MapEvents;
