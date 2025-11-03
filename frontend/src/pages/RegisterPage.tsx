import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== password2) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      await register({ username, email, password, password2 });
      navigate('/map');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="logo">
          <h1>Join Can-It-WFC</h1>
          <p>Start reviewing cafes for remote work</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              minLength={3}
              autoComplete="username"
            />
            <span className="hint">At least 3 characters</span>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span className="hint">At least 8 characters</span>
          </div>

          <div className="form-group">
            <label htmlFor="password2">Confirm Password</label>
            <input
              id="password2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="Confirm your password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="footer-link">
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </div>

      <style>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--neo-primary);
          padding: 20px;
        }

        .register-card {
          background: var(--neo-white);
          border: var(--neo-border-width-thick) solid var(--neo-black);
          border-radius: var(--neo-border-radius);
          padding: 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: var(--neo-shadow-offset-lg) var(--neo-shadow-offset-lg) 0 var(--neo-black);
        }

        .logo {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo h1 {
          font-size: 32px;
          font-weight: var(--neo-font-black);
          color: var(--neo-black);
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .logo p {
          font-size: 14px;
          color: var(--neo-gray-600);
          margin: 0;
          font-weight: var(--neo-font-bold);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: var(--neo-font-bold);
          color: var(--neo-black);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-group input {
          width: 100%;
          padding: 14px 16px;
          border: var(--neo-border-width) solid var(--neo-black);
          border-radius: var(--neo-border-radius);
          font-size: 16px;
          transition: all 0.2s;
          font-family: inherit;
          background: var(--neo-white);
          box-shadow: 3px 3px 0 var(--neo-black);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--neo-primary);
          box-shadow: 4px 4px 0 var(--neo-black);
          transform: translate(-1px, -1px);
        }

        .form-group input::placeholder {
          color: var(--neo-gray-400);
        }

        .hint {
          display: block;
          font-size: 12px;
          color: var(--neo-gray-600);
          margin-top: 6px;
          font-weight: 500;
        }

        .error-message {
          padding: 12px 16px;
          background: var(--neo-danger-light);
          border: var(--neo-border-width-thin) solid var(--neo-black);
          border-radius: var(--neo-border-radius);
          color: var(--neo-white);
          font-size: 14px;
          font-weight: var(--neo-font-bold);
          margin-bottom: 20px;
          box-shadow: 3px 3px 0 var(--neo-black);
        }

        .submit-button {
          width: 100%;
          padding: 16px;
          background: var(--neo-primary);
          color: var(--neo-white);
          border: var(--neo-border-width) solid var(--neo-black);
          border-radius: var(--neo-border-radius);
          font-size: 16px;
          font-weight: var(--neo-font-bold);
          cursor: pointer;
          transition: transform var(--neo-transition-fast), box-shadow var(--neo-transition-fast);
          font-family: inherit;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: var(--neo-shadow-offset-sm) var(--neo-shadow-offset-sm) 0 var(--neo-black);
        }

        .submit-button:hover:not(:disabled) {
          background: var(--neo-primary-dark);
          transform: translate(-2px, -2px);
          box-shadow: calc(var(--neo-shadow-offset-sm) + 2px) calc(var(--neo-shadow-offset-sm) + 2px) 0 var(--neo-black);
        }

        .submit-button:active:not(:disabled) {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 var(--neo-black);
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .footer-link {
          text-align: center;
          margin-top: 24px;
          font-size: 14px;
          color: var(--neo-black);
          font-weight: 500;
        }

        .footer-link a {
          color: var(--neo-primary);
          font-weight: var(--neo-font-bold);
          text-decoration: none;
          transition: color 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .footer-link a:hover {
          color: var(--neo-primary-dark);
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .register-card {
            padding: 32px 24px;
          }

          .logo h1 {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;