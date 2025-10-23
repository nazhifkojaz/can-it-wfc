import React from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';

interface UserLocationMarkerProps {
  position: LatLngExpression;
}

const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({ position }) => {
  return (
    <>
      {/* Outer pulse circle */}
      <CircleMarker
        center={position}
        radius={20}
        pathOptions={{
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 0,
        }}
        className="user-location-pulse"
      />
      
      {/* Inner dot */}
      <CircleMarker
        center={position}
        radius={8}
        pathOptions={{
          color: 'white',
          fillColor: '#3b82f6',
          fillOpacity: 1,
          weight: 3,
        }}
      >
        <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent={false}>
          Your Location
        </Tooltip>
      </CircleMarker>

      <style>{`
        .user-location-pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.1;
            transform: scale(1.5);
          }
        }
      `}</style>
    </>
  );
};

export default UserLocationMarker;