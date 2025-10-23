import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If user is logged in, redirect to map
  React.useEffect(() => {
    if (user) {
      navigate('/map');
    }
  }, [user, navigate]);

  return (
    <div className="home-page">
      <div className="hero">
        <h1>Can-It-WFC</h1>
        <p>Discover the best cafes for remote work</p>
        
        <div className="cta-buttons">
          <button 
            className="btn-primary"
            onClick={() => navigate('/login')}
          >
            Get Started
          </button>
          <button 
            className="btn-secondary"
            onClick={() => navigate('/register')}
          >
            Sign Up
          </button>
        </div>
      </div>

      <style>{`
        .home-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .hero {
          text-align: center;
          color: white;
          max-width: 600px;
        }

        .hero h1 {
          font-size: 56px;
          font-weight: 800;
          margin: 0 0 16px 0;
        }

        .hero p {
          font-size: 20px;
          margin: 0 0 40px 0;
          opacity: 0.9;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .btn-primary,
        .btn-secondary {
          padding: 16px 32px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: white;
          color: #667eea;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .btn-secondary {
          background: transparent;
          color: white;
          border: 2px solid white;
        }

        .btn-secondary:hover {
          background: white;
          color: #667eea;
        }

        @media (max-width: 640px) {
          .hero h1 {
            font-size: 40px;
          }

          .cta-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;