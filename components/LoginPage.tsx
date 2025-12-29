import React, { useState, useEffect } from 'react';
import { verifyToken, fetchUserData } from '../services/githubService';
import { deriveKey, decryptData, encryptData } from '../services/cryptoService';
import { AuthState, UserData } from '../types';
import { INITIAL_WATCHLIST } from '../constants';

interface LoginPageProps {
  onLogin: (auth: AuthState, data: UserData | null) => void;
}

const LOCAL_STORAGE_KEY = 'instock_encrypted_data';

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'CLOUD' | 'LOCAL_UNLOCK' | 'LOCAL_CREATE'>('CLOUD');
  
  // Cloud State
  const [username, setUsername] = useState('');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  
  // Local State
  const [passphrase, setPassphrase] = useState('');
  const [status, setStatus] = useState<string>('AWAITING_CREDENTIALS');
  const [loading, setLoading] = useState(false);

  // Check if local data exists on mount
  useEffect(() => {
    const hasLocalData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (hasLocalData) {
       // logic handled by initial state or user interaction
    }
  }, []);

  const handleCloudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !repo || !token) {
      setStatus('ERROR: MISSING_FIELDS');
      return;
    }

    setLoading(true);
    setStatus('AUTHENTICATING...');

    const isValidUser = await verifyToken(token, username);
    if (!isValidUser) {
      setStatus('ERROR: INVALID_TOKEN_OR_USER');
      setLoading(false);
      return;
    }

    setStatus('CONNECTING_TO_REPO...');

    try {
      const { data, sha } = await fetchUserData(token, repo, username);
      setStatus('ACCESS_GRANTED');
      
      setTimeout(() => {
        onLogin(
          { token, username, repo, sha, isAuthenticated: true, isLocal: false },
          data
        );
      }, 800);
    } catch (error) {
      setStatus('ERROR: REPO_ACCESS_DENIED_OR_NOT_FOUND');
      setLoading(false);
    }
  };

  const handleLocalUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) return;

    setLoading(true);
    setStatus('DECRYPTING_VAULT...');

    try {
      const encryptedString = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!encryptedString) throw new Error("No data found");

      const salt = encryptedString.split(':')[0];
      const { key } = await deriveKey(passphrase, salt);
      const data = await decryptData(encryptedString, key);
      
      setStatus('ACCESS_GRANTED');
      setTimeout(() => {
        onLogin(
          { 
            token: '', 
            username: 'LOCAL_ADMIN', 
            repo: 'LOCAL', 
            isAuthenticated: true, 
            isLocal: true,
            cryptoKey: key,
            salt: salt
          },
          data
        );
      }, 500);

    } catch (error) {
      console.error(error);
      setStatus('ERROR: DECRYPTION_FAILED (WRONG_KEY)');
      setLoading(false);
    }
  };

  const handleLocalCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase) return;

    setLoading(true);
    setStatus('GENERATING_KEYS...');

    try {
      const { key, salt } = await deriveKey(passphrase);
      const initialData: UserData = {
        watchlist: INITIAL_WATCHLIST,
        portfolio: [],
        alerts: []
      };

      const encrypted = await encryptData(initialData, key, salt);
      localStorage.setItem(LOCAL_STORAGE_KEY, encrypted);

      setStatus('VAULT_CREATED');
      setTimeout(() => {
        onLogin(
          { 
            token: '', 
            username: 'LOCAL_ADMIN', 
            repo: 'LOCAL', 
            isAuthenticated: true, 
            isLocal: true,
            cryptoKey: key,
            salt: salt
          },
          initialData
        );
      }, 500);
    } catch (error) {
      setStatus('ERROR: KEY_GENERATION_FAILED');
      setLoading(false);
    }
  };

  const switchToLocal = () => {
    const hasData = localStorage.getItem(LOCAL_STORAGE_KEY);
    setMode(hasData ? 'LOCAL_UNLOCK' : 'LOCAL_CREATE');
    setStatus('INITIALIZING_LOCAL_DRIVE...');
  };
  
  const openGitHubTokenPage = (e: React.MouseEvent) => {
      e.preventDefault();
      const description = "InStock Terminal Access";
      const scopes = "repo,user";
      window.open(`https://github.com/settings/tokens/new?description=${encodeURIComponent(description)}&scopes=${scopes}`, '_blank');
  };

  return (
    <div className="h-screen w-screen bg-[#050505] text-green-500 font-vt323 flex items-center justify-center p-4">
      <div className="w-full max-w-md border-2 border-green-900 bg-[#0c0c0c] p-8 shadow-[0_0_50px_rgba(0,50,0,0.2)] relative overflow-hidden">
        <div className="absolute inset-0 bg-repeat-y opacity-10 pointer-events-none" 
             style={{backgroundImage: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5) 50%)', backgroundSize: '100% 4px'}}></div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-widest text-green-400 mb-2">INSTOCK_TERMINAL</h1>
          <div className="text-xs text-green-800">SECURE_ACCESS_GATEWAY v3.0</div>
        </div>

        {mode === 'CLOUD' && (
          <form onSubmit={handleCloudSubmit} className="space-y-6 relative z-10">
             <div>
                <div className="bg-blue-900/20 border border-blue-800 p-2 text-xs text-blue-300 mb-4 text-center">
                   MODE: GITHUB CLOUD SYNC
                </div>
            </div>
            <div>
              <label className="block text-xs mb-1 text-green-700">GITHUB_USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black border border-green-800 p-2 text-green-400 focus:outline-none focus:border-green-500"
                placeholder="e.g. dev_trader"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-green-700">TARGET_REPOSITORY</label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="w-full bg-black border border-green-800 p-2 text-green-400 focus:outline-none focus:border-green-500"
                placeholder="e.g. dev_trader/stock-data"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                  <label className="block text-xs text-green-700">ACCESS_TOKEN (PAT)</label>
                  <button onClick={openGitHubTokenPage} className="text-[10px] text-blue-400 hover:underline">
                      GENERATE NEW TOKEN ↗
                  </button>
              </div>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-black border border-green-800 p-2 text-green-400 focus:outline-none focus:border-green-500"
                placeholder="ghp_...................."
              />
            </div>

            <div className="pt-4 border-t border-green-900">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-green-700 animate-pulse">STATUS: {status}</span>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-green-900/20 hover:bg-green-900/40 text-green-400 border border-green-700 py-3 font-bold tracking-wider transition-all disabled:opacity-50 mb-4">
                {loading ? ':: AUTHENTICATING ::' : 'INITIALIZE_CLOUD_SESSION'}
              </button>
              <button type="button" onClick={switchToLocal} disabled={loading} className="w-full bg-transparent hover:bg-green-900/10 text-gray-500 hover:text-green-500 border border-gray-800 hover:border-green-800 py-2 text-sm font-bold tracking-wider transition-all disabled:opacity-50">
                SWITCH TO LOCAL ENCRYPTED VAULT
              </button>
            </div>
          </form>
        )}

        {(mode === 'LOCAL_UNLOCK' || mode === 'LOCAL_CREATE') && (
           <form onSubmit={mode === 'LOCAL_UNLOCK' ? handleLocalUnlock : handleLocalCreate} className="space-y-6 relative z-10">
             <div>
                <div className="bg-orange-900/20 border border-orange-800 p-2 text-xs text-orange-300 mb-4 text-center">
                   MODE: {mode === 'LOCAL_UNLOCK' ? 'UNLOCK SECURE VAULT' : 'CREATE NEW VAULT'}
                </div>
            </div>

            {mode === 'LOCAL_UNLOCK' ? (
                <div className="text-center text-sm text-gray-400 mb-4">
                    Encrypted data detected. Enter passphrase to decrypt.
                </div>
            ) : (
                <div className="text-center text-sm text-gray-400 mb-4">
                    No local data found. Set a passphrase to initialize a secure vault.
                    <br/><span className="text-red-500 text-xs">WARNING: IF YOU LOSE THIS, DATA IS LOST FOREVER.</span>
                </div>
            )}

            <div>
              <label className="block text-xs mb-1 text-green-700">
                  {mode === 'LOCAL_UNLOCK' ? 'ENTER_PASSPHRASE' : 'SET_NEW_PASSPHRASE'}
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full bg-black border border-green-800 p-2 text-green-400 focus:outline-none focus:border-green-500"
                placeholder="********"
                autoFocus
              />
            </div>

            <div className="pt-4 border-t border-green-900">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-green-700 animate-pulse">STATUS: {status}</span>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-orange-900/20 hover:bg-orange-900/40 text-orange-400 border border-orange-700 py-3 font-bold tracking-wider transition-all disabled:opacity-50 mb-4">
                {loading ? ':: PROCESSING ::' : (mode === 'LOCAL_UNLOCK' ? 'DECRYPT & ENTER' : 'ENCRYPT & INITIALIZE')}
              </button>
              <button type="button" onClick={() => setMode('CLOUD')} disabled={loading} className="w-full bg-transparent hover:bg-green-900/10 text-gray-500 hover:text-green-500 border border-gray-800 hover:border-green-800 py-2 text-sm font-bold tracking-wider transition-all disabled:opacity-50">
                BACK TO CLOUD LOGIN
              </button>
            </div>
           </form>
        )}
      </div>
    </div>
  );
};