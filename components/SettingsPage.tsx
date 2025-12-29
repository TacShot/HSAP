
import React, { useState, useRef } from 'react';
import { AuthState, UserData, PortfolioItem } from '../types';
import { deriveKey, encryptData } from '../services/cryptoService';
import { createRepository, fetchUserData, saveUserData } from '../services/githubService';
import { exportPortfolioToCSV, exportDataToJSON, parseBrokerCSV } from '../services/importExportService';

interface SettingsPageProps {
  auth: AuthState;
  userData: UserData;
  onUpdateAuth: (newAuth: AuthState) => void;
  onUpdateData: (newData: UserData) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ auth, userData, onUpdateAuth, onUpdateData }) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY' | 'CLOUD' | 'DATA'>('PROFILE');
  const [statusMsg, setStatusMsg] = useState('');
  
  // Security State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  // Cloud State
  const [ghToken, setGhToken] = useState(auth.token || '');
  const [ghUser, setGhUser] = useState(auth.username === 'LOCAL_ADMIN' ? '' : auth.username);
  const [ghRepo, setGhRepo] = useState(auth.repo === 'LOCAL' ? '' : auth.repo);

  // API Key State
  const [apiKey, setApiKey] = useState(userData.userSettings?.customApiKey || '');
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importBroker, setImportBroker] = useState<'GENERIC' | 'ZERODHA' | 'GROWW' | 'PAYTM'>('GENERIC');

  const showStatus = (msg: string, isError = false) => {
    setStatusMsg(isError ? `[ERROR] ${msg}` : `[SUCCESS] ${msg}`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleApiKeySave = () => {
     const updatedData = {
         ...userData,
         userSettings: { ...userData.userSettings, customApiKey: apiKey }
     };
     onUpdateData(updatedData);
     showStatus("API Key Saved to Secure Vault");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
        showStatus("New passwords do not match", true);
        return;
    }
    if (!auth.cryptoKey) {
        showStatus("Cannot change password in non-encrypted mode", true);
        return;
    }

    try {
        const { key: newKey, salt: newSalt } = await deriveKey(newPass);
        const encrypted = await encryptData(userData, newKey, newSalt);
        localStorage.setItem('instock_encrypted_data', encrypted);

        onUpdateAuth({
            ...auth,
            cryptoKey: newKey,
            salt: newSalt
        });

        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        showStatus("Vault Passphrase Updated Successfully");

    } catch (err) {
        console.error(err);
        showStatus("Encryption Failed", true);
    }
  };

  const openGitHubTokenPage = () => {
      const description = "InStock Terminal Access";
      const scopes = "repo,user";
      window.open(`https://github.com/settings/tokens/new?description=${encodeURIComponent(description)}&scopes=${scopes}`, '_blank');
  };

  const handleGitHubConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghToken || !ghUser || !ghRepo) {
        showStatus("All fields required", true);
        return;
    }
    
    showStatus("Connecting to GitHub...");
    
    try {
        // 1. Check Repo / Data
        const res = await fetchUserData(ghToken, ghRepo, ghUser);
        
        if (!res.repoExists) {
            showStatus("Repo not found. Auto-creating...", false);
            const created = await createRepository(ghToken, ghRepo.split('/')[1] || ghRepo);
            if (!created) {
                showStatus("Failed to create repository. Check Token Scope.", true);
                return;
            }
        }

        // 2. Upload Local Data to Cloud
        showStatus("Syncing Local Data to Cloud...");
        const saveRes = await saveUserData(ghToken, ghRepo, ghUser, userData, res.sha);

        if (saveRes.success) {
             onUpdateAuth({
                 ...auth,
                 token: ghToken,
                 username: ghUser,
                 repo: ghRepo,
                 sha: saveRes.newSha,
                 isLocal: false 
             });
             showStatus("Cloud Uplink Established. Mode: HYBRID");
        } else {
             showStatus("Failed to sync data to repo.", true);
        }

    } catch (err) {
        console.error(err);
        showStatus("Connection Failed", true);
    }
  };

  const handleExportJSON = () => {
      const json = exportDataToJSON(userData);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `instock_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      showStatus("Backup JSON Downloaded");
  };

  const handleExportCSV = () => {
      const csv = exportPortfolioToCSV(userData.portfolio);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      showStatus("Portfolio CSV Downloaded");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const content = evt.target?.result as string;
          try {
              const items = parseBrokerCSV(content, importBroker);
              if (items.length === 0) {
                  showStatus("No valid positions found in CSV", true);
                  return;
              }

              const newPortfolio = [...userData.portfolio, ...items];
              onUpdateData({
                  ...userData,
                  portfolio: newPortfolio
              });
              showStatus(`Imported ${items.length} positions successfully`);
          } catch (err) {
              showStatus("CSV Parse Error. Check Format.", true);
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  return (
    <div className="flex-1 flex bg-[#0c0c0c] font-vt323 overflow-hidden text-gray-300">
      {/* Sidebar */}
      <div className="w-48 bg-[#111] border-r border-gray-800 flex flex-col p-4 space-y-2">
        <div className="text-xs text-gray-500 font-bold mb-4 px-2">SYSTEM CONFIG</div>
        <button 
            onClick={() => setActiveTab('PROFILE')}
            className={`text-left px-3 py-2 text-sm font-bold border-l-2 ${activeTab === 'PROFILE' ? 'bg-green-900/20 text-green-400 border-green-500' : 'border-transparent hover:bg-[#1a1a1a] text-gray-400'}`}
        >
            USER PROFILE
        </button>
        <button 
            onClick={() => setActiveTab('SECURITY')}
            className={`text-left px-3 py-2 text-sm font-bold border-l-2 ${activeTab === 'SECURITY' ? 'bg-green-900/20 text-green-400 border-green-500' : 'border-transparent hover:bg-[#1a1a1a] text-gray-400'}`}
        >
            SECURITY & KEYS
        </button>
        <button 
            onClick={() => setActiveTab('CLOUD')}
            className={`text-left px-3 py-2 text-sm font-bold border-l-2 ${activeTab === 'CLOUD' ? 'bg-green-900/20 text-green-400 border-green-500' : 'border-transparent hover:bg-[#1a1a1a] text-gray-400'}`}
        >
            CLOUD UPLINK
        </button>
        <button 
            onClick={() => setActiveTab('DATA')}
            className={`text-left px-3 py-2 text-sm font-bold border-l-2 ${activeTab === 'DATA' ? 'bg-green-900/20 text-green-400 border-green-500' : 'border-transparent hover:bg-[#1a1a1a] text-gray-400'}`}
        >
            DATA IMPORT/EXPORT
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <h1 className="text-2xl font-bold text-green-500 mb-2">{activeTab.replace('_', ' ')}</h1>
        <div className="h-px bg-gray-800 w-full mb-6"></div>

        {statusMsg && (
            <div className={`mb-6 p-3 border ${statusMsg.includes('ERROR') ? 'border-red-800 bg-red-900/20 text-red-400' : 'border-green-800 bg-green-900/20 text-green-400'}`}>
                {statusMsg}
            </div>
        )}

        {activeTab === 'PROFILE' && (
            <div className="grid grid-cols-2 gap-8 max-w-4xl">
                 <div className="bg-[#111] border border-gray-800 p-6 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-gray-900 rounded-full flex items-center justify-center mb-4 border-2 border-green-900">
                        <span className="text-4xl text-green-500">{auth.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{auth.username}</h2>
                    <span className={`text-xs px-2 py-1 rounded ${auth.isLocal ? 'bg-orange-900/30 text-orange-400' : 'bg-blue-900/30 text-blue-400'}`}>
                        {auth.isLocal ? 'LOCAL VAULT USER' : 'GITHUB SYNCED USER'}
                    </span>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="bg-[#111] border border-gray-800 p-4">
                        <div className="text-gray-500 text-xs mb-1">PORTFOLIO VALUE</div>
                        <div className="text-2xl text-white font-mono">
                           ₹{userData.portfolio.reduce((acc, i) => acc + (i.averagePrice * i.quantity), 0).toLocaleString('en-IN', {maximumFractionDigits: 0})}
                        </div>
                    </div>
                    <div className="bg-[#111] border border-gray-800 p-4">
                        <div className="text-gray-500 text-xs mb-1">WATCHLIST ITEMS</div>
                        <div className="text-2xl text-white font-mono">{userData.watchlist.length}</div>
                    </div>
                    <div className="bg-[#111] border border-gray-800 p-4">
                        <div className="text-gray-500 text-xs mb-1">ACTIVE ALERTS</div>
                        <div className="text-2xl text-white font-mono">{userData.alerts.filter(a => a.enabled).length}</div>
                    </div>
                 </div>
            </div>
        )}

        {activeTab === 'SECURITY' && (
            <div className="max-w-xl space-y-8">
                {/* API Key Section */}
                <div className="border border-gray-800 bg-[#0a0a0a] p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <span className="text-yellow-500">★</span> GEMINI AI CONFIGURATION
                    </h3>
                    <label className="block text-gray-500 text-sm mb-2">CUSTOM API KEY</label>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input 
                                type={isKeyVisible ? "text" : "password"}
                                value={apiKey} 
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="Enter Google GenAI API Key..."
                                className="w-full bg-black border border-gray-700 p-2 text-white focus:border-green-500 focus:outline-none"
                            />
                            <button 
                                onClick={() => setIsKeyVisible(!isKeyVisible)}
                                className="absolute right-2 top-2 text-gray-500 hover:text-white text-xs"
                            >
                                {isKeyVisible ? 'HIDE' : 'SHOW'}
                            </button>
                        </div>
                        <button onClick={handleApiKeySave} className="bg-green-900/30 border border-green-700 text-green-400 px-4 hover:bg-green-900/50">SAVE</button>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2">
                        Required for AI Analyst, Screener, and Predictions. Overrides default environment key.
                    </p>
                </div>

                {/* Password Change */}
                {auth.isLocal ? (
                     <form onSubmit={handleChangePassword} className="border border-gray-800 bg-[#0a0a0a] p-6">
                        <h3 className="text-orange-400 font-bold mb-4">CHANGE VAULT PASSPHRASE</h3>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">NEW PASSPHRASE</label>
                                <input 
                                    type="password" 
                                    value={newPass}
                                    onChange={e => setNewPass(e.target.value)}
                                    className="w-full bg-black border border-gray-700 p-2 text-white focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">CONFIRM PASSPHRASE</label>
                                <input 
                                    type="password" 
                                    value={confirmPass}
                                    onChange={e => setConfirmPass(e.target.value)}
                                    className="w-full bg-black border border-gray-700 p-2 text-white focus:border-orange-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-orange-900/30 border border-orange-700 text-orange-400 py-2 font-bold hover:bg-orange-900/50 mt-4">
                            RE-ENCRYPT DATA
                        </button>
                     </form>
                 ) : (
                     <div className="p-4 border border-gray-800 text-gray-500 italic text-center">
                         Security managed via GitHub Account Credentials.
                     </div>
                 )}
            </div>
        )}

        {activeTab === 'CLOUD' && (
            <div className="max-w-xl space-y-6">
                {!auth.isLocal ? (
                    <div className="border border-green-800 bg-green-900/10 p-6">
                        <div className="text-green-400 font-bold mb-2">STATUS: CONNECTED</div>
                        <div className="space-y-2 text-sm text-gray-400">
                            <div className="flex justify-between"><span>USER:</span> <span className="text-white">{auth.username}</span></div>
                            <div className="flex justify-between"><span>REPO:</span> <span className="text-white">{auth.repo}</span></div>
                            <div className="flex justify-between"><span>SHA:</span> <span className="text-white font-mono text-xs">{auth.sha?.substring(0,8)}...</span></div>
                        </div>
                        <button 
                            onClick={() => onUpdateAuth({ ...auth, isLocal: true, token: '', repo: 'LOCAL', username: 'LOCAL_ADMIN' })}
                            className="mt-6 w-full border border-red-800 text-red-500 py-2 hover:bg-red-900/20"
                        >
                            DISCONNECT
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleGitHubConnect} className="space-y-4">
                        <div className="bg-blue-900/10 border border-blue-800 p-4 text-sm text-blue-300 mb-4">
                            <p className="font-bold mb-2">CONNECT GITHUB REPOSITORY</p>
                            Sync your portfolio across devices using a private GitHub repository.
                        </div>

                        <button 
                            type="button"
                            onClick={openGitHubTokenPage}
                            className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2 text-xs border border-gray-600 mb-4 flex items-center justify-center gap-2"
                        >
                            <span>⚡</span> GENERATE ACCESS TOKEN (OPENS GITHUB)
                        </button>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">GITHUB USERNAME</label>
                                <input type="text" value={ghUser} onChange={e => setGhUser(e.target.value)} className="w-full bg-black border border-gray-700 p-2" placeholder="username" />
                            </div>
                            <div>
                                <label className="block text-gray-500 text-xs mb-1">REPOSITORY NAME</label>
                                <input type="text" value={ghRepo} onChange={e => setGhRepo(e.target.value)} className="w-full bg-black border border-gray-700 p-2" placeholder="my-stock-data" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-500 text-xs mb-1">PERSONAL ACCESS TOKEN (PASTE HERE)</label>
                            <input type="password" value={ghToken} onChange={e => setGhToken(e.target.value)} className="w-full bg-black border border-gray-700 p-2" placeholder="ghp_..." />
                        </div>

                        <button type="submit" className="w-full bg-blue-900/30 border border-blue-700 text-blue-400 py-2 font-bold hover:bg-blue-900/50">
                            CONNECT & SYNC
                        </button>
                    </form>
                )}
            </div>
        )}

        {activeTab === 'DATA' && (
            <div className="grid grid-cols-2 gap-8 max-w-4xl">
                <div className="border border-gray-800 p-6 bg-[#0a0a0a]">
                    <h3 className="text-white font-bold mb-4 border-b border-gray-800 pb-2">EXPORT DATA</h3>
                    <div className="space-y-4">
                        <button onClick={handleExportJSON} className="w-full text-left p-3 border border-gray-700 hover:bg-gray-800 flex justify-between group transition-colors">
                            <span className="text-gray-400 group-hover:text-white">FULL BACKUP (.JSON)</span>
                            <span className="text-gray-600">↓</span>
                        </button>
                        <button onClick={handleExportCSV} className="w-full text-left p-3 border border-gray-700 hover:bg-gray-800 flex justify-between group transition-colors">
                            <span className="text-gray-400 group-hover:text-white">PORTFOLIO ONLY (.CSV)</span>
                            <span className="text-gray-600">↓</span>
                        </button>
                    </div>
                </div>

                <div className="border border-gray-800 p-6 bg-[#0a0a0a]">
                    <h3 className="text-white font-bold mb-4 border-b border-gray-800 pb-2">IMPORT WIZARD</h3>
                    <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1">SELECT BROKER SOURCE</label>
                        <select 
                            value={importBroker} 
                            onChange={(e) => setImportBroker(e.target.value as any)}
                            className="w-full bg-black border border-gray-700 p-2 text-white outline-none cursor-pointer hover:border-gray-500"
                        >
                            <option value="GENERIC">GENERIC CSV (Symbol, Qty, Price)</option>
                            <option value="ZERODHA">ZERODHA (Kite Console)</option>
                            <option value="GROWW">GROWW</option>
                            <option value="PAYTM">PAYTM MONEY</option>
                        </select>
                    </div>
                    
                    <div 
                        className="border-2 border-dashed border-gray-700 p-8 text-center hover:border-green-600 hover:bg-green-900/10 cursor-pointer transition-all group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📂</div>
                        <span className="text-gray-400 text-sm font-bold group-hover:text-white">CLICK TO UPLOAD CSV</span>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            onChange={handleFileImport}
                        />
                    </div>
                    <div className="mt-4 text-[10px] text-gray-500 bg-gray-900/50 p-2 border border-gray-800">
                        INFO: Duplicate symbols will be added as separate lots. Ensure CSV encoding is UTF-8.
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};
