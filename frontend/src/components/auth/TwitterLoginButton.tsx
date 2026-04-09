import React from 'react';
import { Twitter } from 'lucide-react';
import styles from './TwitterLoginButton.module.css';

const TWITTER_CLIENT_ID = import.meta.env.VITE_TWITTER_OAUTH_CLIENT_ID || '';

// Generate a random string for code_verifier
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Generate code_challenge from code_verifier using SHA-256
async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)));
  // Convert base64 to base64url encoding
  return base64Digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

interface TwitterLoginButtonProps {
  mode?: 'signin' | 'signup';
  onClick?: () => void;
}

const TwitterLoginButton: React.FC<TwitterLoginButtonProps> = ({ mode = 'signin', onClick }) => {
  const handleClick = async () => {
    if (onClick) {
      onClick();
    }

    if (!TWITTER_CLIENT_ID) {
      console.error('Twitter OAuth is not configured');
      return;
    }

    // Generate PKCE code_verifier and code_challenge
    const codeVerifier = generateRandomString(128);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store code_verifier in sessionStorage for later retrieval
    sessionStorage.setItem('twitter_code_verifier', codeVerifier);
    sessionStorage.setItem('twitter_auth_mode', mode);

    // Build Twitter OAuth 2.0 authorization URL
    const redirectUri = `${window.location.origin}/auth/twitter/callback`;
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', TWITTER_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'users.read tweet.read');
    authUrl.searchParams.set('state', codeVerifier); // Use codeVerifier as state for simplicity
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Redirect to Twitter authorization page
    window.location.href = authUrl.toString();
  };

  if (!TWITTER_CLIENT_ID) {
    return (
      <div className={styles.error}>
        <p>Twitter Sign-In is not configured. Please contact support.</p>
      </div>
    );
  }

  return (
    <button className={styles.twitterButton} onClick={handleClick} type="button">
      <Twitter size={20} className={styles.icon} />
      <span className={styles.text}>
        {mode === 'signup' ? 'Sign up with Twitter' : 'Sign in with Twitter'}
      </span>
    </button>
  );
};

export default TwitterLoginButton;
