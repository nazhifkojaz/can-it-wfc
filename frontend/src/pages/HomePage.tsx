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
          background: var(--neo-primary);
          padding: 20px;
        }

        .hero {
          text-align: center;
          color: var(--neo-white);
          max-width: 600px;
        }

        .hero h1 {
          font-size: 56px;
          font-weight: var(--neo-font-black);
          margin: 0 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-shadow: 4px 4px 0 var(--neo-black);
        }

        .hero p {
          font-size: 20px;
          margin: 0 0 40px 0;
          font-weight: var(--neo-font-bold);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .btn-primary,
        .btn-secondary {
          padding: 16px 32px;
          border: var(--neo-border-width) solid var(--neo-black);
          border-radius: var(--neo-border-radius);
          font-size: 16px;
          font-weight: var(--neo-font-bold);
          cursor: pointer;
          transition: transform var(--neo-transition-fast), box-shadow var(--neo-transition-fast);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-primary {
          background: var(--neo-white);
          color: var(--neo-black);
          box-shadow: var(--neo-shadow-offset-sm) var(--neo-shadow-offset-sm) 0 var(--neo-black);
        }

        .btn-primary:hover {
          transform: translate(-2px, -2px);
          box-shadow: calc(var(--neo-shadow-offset-sm) + 2px) calc(var(--neo-shadow-offset-sm) + 2px) 0 var(--neo-black);
        }

        .btn-primary:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 var(--neo-black);
        }

        .btn-secondary {
          background: transparent;
          color: var(--neo-white);
          box-shadow: var(--neo-shadow-offset-sm) var(--neo-shadow-offset-sm) 0 var(--neo-black);
        }

        .btn-secondary:hover {
          background: var(--neo-white);
          color: var(--neo-black);
          transform: translate(-2px, -2px);
          box-shadow: calc(var(--neo-shadow-offset-sm) + 2px) calc(var(--neo-shadow-offset-sm) + 2px) 0 var(--neo-black);
        }

        .btn-secondary:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 var(--neo-black);
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