import React, { useEffect, useState } from 'react';
import { Home, Calendar, Star, MapPin, DollarSign, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePanel } from '../../contexts/PanelContext';
import { useAuth } from '../../contexts/AuthContext';
import { userApi } from '../../api/client';
import { ActivityItem } from '../../types';
import { Loading } from '../common';
import { formatDistanceToNow } from 'date-fns';
import { formatVisitTime } from '../../utils/visit';
import './ActivityPanel.css';

const ActivityPanel: React.FC = () => {
  const { hidePanel, showPanel } = usePanel();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchFeed = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await userApi.getActivityFeed(50);
        setActivities(data.activities);
      } catch (err: any) {
        console.error('Failed to load feed:', err);
        setError('Failed to load your activity');
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [user]);

  const handleActivityClick = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'own_visit':
      case 'own_review':
      case 'following_visit':
      case 'following_review':
        // Jump to cafe on map
        hidePanel();
        setTimeout(() => {
          navigate(`/map?cafe=${activity.cafe_id}`);
        }, 100);
        break;

      case 'new_follower':
        // Open follower's profile
        if (activity.actor_username) {
          showPanel('userProfile', { username: activity.actor_username });
        }
        break;

      case 'following_followed':
        // Open the newly followed user's profile
        if (activity.target_username) {
          showPanel('userProfile', { username: activity.target_username });
        }
        break;
    }
  };

  if (!user) {
    return (
      <div className="activity-panel">
        <div className="panel-header">
          <h2>Activity</h2>
        </div>
        <div className="empty-state">
          <p>Please log in to see your activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="header-left">
          <button className="home-button" onClick={hidePanel} aria-label="Close panel">
            <Home size={20} />
          </button>
          <h2 className="panel-title">Your Activity</h2>
        </div>
      </div>

      {/* Content */}
      <div className="panel-content">
        {loading ? (
          <div className="loading-container">
            <Loading message="Loading your activity..." />
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="empty-state">
            <p className="empty-text">No activity yet</p>
            <p className="empty-subtext">Visit cafes and follow users to see activity here!</p>
            <button className="btn-primary" onClick={hidePanel}>
              Explore Cafes
            </button>
          </div>
        ) : (
          <div className="activity-list">
            {activities.map((activity) => (
              <EnhancedActivityItem
                key={activity.id}
                activity={activity}
                onClick={() => handleActivityClick(activity)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Activity Item Component
const EnhancedActivityItem: React.FC<{
  activity: ActivityItem;
  onClick: () => void;
}> = ({ activity, onClick }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'own_visit':
      case 'following_visit':
        return <MapPin size={20} />;
      case 'own_review':
      case 'following_review':
        return <Star size={20} />;
      case 'new_follower':
      case 'following_followed':
        return activity.actor_avatar_url ? (
          <img
            src={activity.actor_avatar_url}
            alt=""
            className="activity-avatar"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--neo-black)'
            }}
          />
        ) : (
          <User size={20} />
        );
    }
  };

  const getTitle = () => {
    switch (activity.type) {
      case 'own_visit':
        return 'You visited';
      case 'own_review':
        return 'You reviewed';
      case 'following_visit':
        return `@${activity.actor_username} visited`;
      case 'following_review':
        return `@${activity.actor_username} reviewed`;
      case 'new_follower':
        return `@${activity.actor_username} followed you`;
      case 'following_followed':
        return `@${activity.actor_username} followed @${activity.target_username}`;
    }
  };

  const hasVisitDetails = activity.visit_time || activity.amount_spent;

  return (
    <div className="activity-item" onClick={onClick}>
      <div className="activity-icon">
        {getIcon()}
      </div>

      <div className="activity-content">
        <div className="activity-header">
          <span className="activity-type">{getTitle()}</span>
          {activity.cafe_name && (
            <span className="activity-cafe">{activity.cafe_name}</span>
          )}
        </div>

        {activity.wfc_rating && (
          <div className="activity-rating">
            <Star size={14} fill="currentColor" />
            <span>{activity.wfc_rating}/5</span>
          </div>
        )}

        {activity.comment && (
          <p className="activity-comment">"{activity.comment}"</p>
        )}

        {hasVisitDetails && (
          <div className="visit-details">
            {activity.visit_time && (
              <span className="visit-time">
                <Calendar size={14} />
                {formatVisitTime(activity.visit_time)}
              </span>
            )}
            {activity.amount_spent && (
              <span className="visit-spent">
                <DollarSign size={14} />
                {activity.currency} {Number(activity.amount_spent).toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div className="activity-date">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </div>
      </div>
    </div>
  );
};

export default ActivityPanel;
