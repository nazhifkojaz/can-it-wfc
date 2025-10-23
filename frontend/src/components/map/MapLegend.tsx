import React from 'react';

const MapLegend: React.FC = () => {
  return (
    <div className="map-legend">
      <h4>Legend</h4>
      <div className="legend-items">
        <div className="legend-item">
          <div className="legend-marker marker-green"></div>
          <span>Visited & Reviewed</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker marker-blue"></div>
          <span>Visited (No review)</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker marker-gray"></div>
          <span>Not visited yet</span>
        </div>
      </div>

      <style>{`
        .map-legend {
          position: absolute;
          bottom: 80px;
          right: 16px;
          background: white;
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 1000;
        }

        .map-legend h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--gray-900);
        }

        .legend-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--gray-700);
        }

        .legend-marker {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        .marker-green {
          background: #10b981;
        }

        .marker-blue {
          background: #60a5fa;
        }

        .marker-gray {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default MapLegend;
