import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password });
      navigate('/map');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <h1>Can-It-WFC</h1>
          <p>Work from cafe reviews</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="footer-link">
          Don't have an account? <Link to="/register">Sign up</Link>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .login-card {
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
          font-size: 36px;
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
          .login-card {
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

export default LoginPage;