import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      <section className="hero">
        <h1>Find the Perfect WFC Spot ☕</h1>
        <p>Discover and review cafes perfect for working from cafe</p>
        
        <div className="hero-actions">
          <Link to="/cafes" className="btn-primary btn-large">
            Explore Cafes
          </Link>
          
          {!isAuthenticated && (
            <Link to="/register" className="btn-secondary btn-large">
              Get Started
            </Link>
          )}
        </div>
      </section>

      {!isAuthenticated && (
        <section className="cta">
          <h2>Join Our Community</h2>
          <p>Share your favorite WFC spots and help others work better</p>
          <Link to="/register" className="btn-primary btn-large">
            Sign Up Now
          </Link>
        </section>
      )}
    </div>
  );
};

export default HomePage;