import React, { useState, useEffect } from 'react';
import { getGithubUser, fetchUserData, createRepository } from '../services/githubService';
import { deriveKey, decryptData, encryptData } from '../services/cryptoService';
import { AuthState, UserData } from '../types';
import { INITIAL_WATCHLIST } from '../constants';

interface LoginPageProps {
  onLogin: (auth: AuthState, data: UserData | null) => void;
}

const LOCAL_STORAGE_KEY = 'instock_encrypted_data';
const DEFAULT_REPO_NAME = 'instock-data';

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'CLOUD' | 'LOCAL_UNLOCK' | 'LOCAL_CREATE'>('CLOUD');
  
  // Cloud State
  const [token, setToken] = useState('');
  
  // Local State
  const [passphrase, setPassphrase] = useState('');
  
  // Shared State
  const [customApiKey, setCustomApiKey] = useState('');

  const [status, setStatus] = useState<string>('READY_TO_CONNECT');
  const [loading, setLoading] = useState(false);

  // Check if local data exists on mount
  useEffect(() => {
    const hasLocalData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (hasLocalData) {
       // logic handled by initial state or user interaction
    }
  }, []);

  // Helper to inject API key into data if provided
  const injectApiKey = (data: UserData): UserData => {
      if (!customApiKey.trim()) return data;
      return {
          ...data,
          userSettings: {
              ...data.userSettings,
              customApiKey: customApiKey.trim(),
              useCustomKey: true
          }
      };
  };

  const handleCloudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus('ERROR: TOKEN_REQUIRED');
      return;
    }

    setLoading(true);
    setStatus('IDENTIFYING_USER...');

    try {
      // 1. Get Username from Token
      const username = await getGithubUser(token);
      if (!username) {
        setStatus('ERROR: INVALID_TOKEN');
        setLoading(false);
        return;
      }

      setStatus(`USER_DETECTED: ${username.toUpperCase()}`);
      
      // 2. Check/Create Default Repo
      const fullRepoName = `${username}/${DEFAULT_REPO_NAME}`;
      setStatus('CHECKING_DATA_STORE...');
      
      const { data, sha, repoExists } = await fetchUserData(token, fullRepoName, username);
      
      if (!repoExists) {
        setStatus('CREATING_PRIVATE_STORE...');
        const created = await createRepository(token, DEFAULT_REPO_NAME);
        if (!created) {
           setStatus('ERROR: REPO_CREATION_FAILED');
           setLoading(false);
           return;
        }
      }

      // 3. Prepare Initial Data
      // If data is null (new repo or empty file), initialize defaults
      let finalData = data;
      if (!finalData) {
          finalData = {
              watchlist: INITIAL_WATCHLIST,
              portfolio: [],
              alerts: [],
              userSettings: {}
          };
      }

      // Inject API Key if provided
      finalData = injectApiKey(finalData);
      
      setStatus('ACCESS_GRANTED');
      
      setTimeout(() => {
        onLogin(
          { token, username, repo: fullRepoName, sha, isAuthenticated: true, isLocal: false },
          finalData
        );
      }, 800);

    } catch (error) {
      console.error(error);
      setStatus('ERROR: CONNECTION_FAILED');
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
      
      const finalData = injectApiKey(data);

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
          finalData
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
      let initialData: UserData = {
        watchlist: INITIAL_WATCHLIST,
        portfolio: [],
        alerts: []
      };

      initialData = injectApiKey(initialData);

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
  
  const openGitHubAuth = (e: React.MouseEvent) => {
      e.preventDefault();
      const description = "InStock Terminal";
      const scopes = "repo,user";
      // Using fine-grained tokens or legacy based on URL, legacy is easier for auto-creation
      const url = `https://github.com/settings/tokens/new?description=${encodeURIComponent(description)}&scopes=${scopes}`;
      window.open(url, 'github_auth', 'width=600,height=700');
  };

  const OptionalApiInput = () => (
    <div className="pt-2 mt-2 border-t border-gray-900/50">
        <label className="block text-[10px] mb-1 text-gray-500">OPTIONAL: GOOGLE AI STUDIO KEY</label>
        <input
            type="password"
            value={customApiKey}
            onChange={(e) => setCustomApiKey(e.target.value)}
            className="w-full bg-[#080808] border border-gray-800 p-2 text-yellow-500 text-xs focus:outline-none focus:border-yellow-600 placeholder-gray-800"
            placeholder="AIzaSy..."
        />
        <p className="text-[9px] text-gray-600 mt-1">Leave blank to use default. Used for Analyst & Screener.</p>
    </div>
  );

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
             <div className="bg-blue-900/10 border border-blue-800 p-4 text-center">
                 <p className="text-blue-300 font-bold mb-2 text-lg">GITHUB CONNECT</p>
                 <button 
                    onClick={openGitHubAuth}
                    className="bg-white text-black font-bold py-2 px-6 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mx-auto w-full"
                 >
                     <svg height="20" viewBox="0 0 16 16" width="20" className="fill-current"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path></svg>
                     AUTHENTICATE
                 </button>
                 <p className="text-[10px] text-blue-400 mt-2">
                     1. Click Authenticate to open GitHub.<br/>
                     2. Scroll to bottom & click "Generate token".<br/>
                     3. Copy the token and paste it below.
                 </p>
             </div>

            <div>
              <label className="block text-xs mb-1 text-green-700">CONNECTION KEY (ACCESS TOKEN)</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-black border border-green-800 p-3 text-green-400 focus:outline-none focus:border-green-500 font-mono text-center tracking-widest"
                placeholder="ghp_...................."
                autoFocus
              />
            </div>

            <OptionalApiInput />

            <div className="pt-4 border-t border-green-900">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-green-700 animate-pulse">STATUS: {status}</span>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-green-900/20 hover:bg-green-900/40 text-green-400 border border-green-700 py-3 font-bold tracking-wider transition-all disabled:opacity-50 mb-4">
                {loading ? ':: ESTABLISHING UPLINK ::' : 'LOGIN & SYNC'}
              </button>
              <button type="button" onClick={switchToLocal} disabled={loading} className="w-full bg-transparent hover:bg-green-900/10 text-gray-500 hover:text-green-500 border border-gray-800 hover:border-green-800 py-2 text-sm font-bold tracking-wider transition-all disabled:opacity-50">
                SWITCH TO LOCAL ENCRYPTED VAULT
              </button>
            </div>
          </form>
        )}

        {(mode === 'LOCAL_UNLOCK' || mode === 'LOCAL_CREATE') && (
           <form onSubmit={mode === 'LOCAL_UNLOCK' ? handleLocalUnlock : handleLocalCreate} className="space-y-4 relative z-10">
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

            <OptionalApiInput />

            <div className="pt-4 border-t border-green-900 mt-2">
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