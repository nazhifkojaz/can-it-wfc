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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .register-card {
          background: white;
          border-radius: 20px;
          padding: 40px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .logo {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo h1 {
          font-size: 32px;
          font-weight: 800;
          color: var(--primary);
          margin: 0 0 8px 0;
        }

        .logo p {
          font-size: 14px;
          color: var(--gray-600);
          margin: 0;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--gray-700);
          margin-bottom: 8px;
        }

        .form-group input {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid var(--gray-200);
          border-radius: 10px;
          font-size: 16px;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .form-group input::placeholder {
          color: var(--gray-400);
        }

        .hint {
          display: block;
          font-size: 12px;
          color: var(--gray-500);
          margin-top: 6px;
        }

        .error-message {
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 10px;
          color: var(--danger);
          font-size: 14px;
          margin-bottom: 20px;
        }

        .submit-button {
          width: 100%;
          padding: 16px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .submit-button:hover:not(:disabled) {
          background: var(--primary-dark);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .footer-link {
          text-align: center;
          margin-top: 24px;
          font-size: 14px;
          color: var(--gray-600);
        }

        .footer-link a {
          color: var(--primary);
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }

        .footer-link a:hover {
          color: var(--primary-dark);
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