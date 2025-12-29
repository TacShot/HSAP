
import React, { useState, useEffect, useRef } from 'react';
import { MarketAsset, PendingAction, MarketBrowserState } from '../types';
import { getStocks, getETFs, getMutualFunds, getDerivatives, searchAssets } from '../services/marketService';

interface MarketBrowserPageProps {
  pendingAction?: PendingAction | null;
  onActionComplete?: () => void;
  onAddToWatchlist: (symbol: string) => void;
  browserState: MarketBrowserState;
  setBrowserState: React.Dispatch<React.SetStateAction<MarketBrowserState>>;
}

export const MarketBrowserPage: React.FC<MarketBrowserPageProps> = ({ 
  pendingAction, onActionComplete, onAddToWatchlist, browserState, setBrowserState
}) => {
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load default category data ONLY if asset list is empty for that category
  // This prevents reloading data when switching between Dashboard and Browse
  useEffect(() => {
    if (browserState.activeTab === 'SEARCH') return; 

    // If we already have data for the current view, don't re-fetch
    if (browserState.assets.length > 0) return;

    const loadData = async () => {
      setLoading(true);
      let data: MarketAsset[] = [];
      try {
          switch (browserState.activeTab) {
            case 'STOCK':
              data = await getStocks();
              break;
            case 'ETF':
              data = await getETFs();
              break;
            case 'MF':
              data = await getMutualFunds();
              break;
            case 'FNO':
              data = await getDerivatives();
              break;
          }
          setBrowserState(prev => ({ ...prev, assets: data }));
      } finally {
          setLoading(false);
      }
    };
    loadData();
  }, [browserState.activeTab]);

  // Handle Search Input
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    const term = browserState.searchTerm.trim();

    // Only search if term changed and is valid
    if (term.length >= 2) {
        if (browserState.activeTab !== 'SEARCH') {
            setBrowserState(prev => ({ ...prev, activeTab: 'SEARCH' }));
        }
        
        setLoading(true);
        searchTimeoutRef.current = setTimeout(async () => {
            const results = await searchAssets(term);
            setBrowserState(prev => ({ ...prev, assets: results }));
            setLoading(false);
        }, 800); // Debounce 800ms
    } else if (term.length === 0 && browserState.activeTab === 'SEARCH') {
        // If search cleared, go back to STOCK
        setBrowserState(prev => ({ ...prev, activeTab: 'STOCK', assets: [] }));
    }
  }, [browserState.searchTerm]);

  const handleDragStart = (e: React.DragEvent, symbol: string) => {
    e.dataTransfer.setData('symbol', symbol);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleTabChange = (id: MarketBrowserState['activeTab']) => {
      if (id === browserState.activeTab) return;
      // Clear assets to trigger re-fetch in useEffect, unless it's Search which uses input
      setBrowserState(prev => ({ 
          ...prev, 
          activeTab: id, 
          assets: [],
          searchTerm: id !== 'SEARCH' ? '' : prev.searchTerm 
      }));
  };

  const TabButton = ({ id, label }: { id: MarketBrowserState['activeTab'], label: string }) => (
    <button
      onClick={() => handleTabChange(id)}
      className={`px-6 py-2 font-bold text-sm tracking-widest border-t-2 border-r-2 border-l-2 transition-all whitespace-nowrap
        ${browserState.activeTab === id 
          ? 'bg-[#111] border-green-600 text-green-400' 
          : 'bg-[#050505] border-gray-800 text-gray-600 hover:text-green-600 hover:border-green-900'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col bg-[#0c0c0c] font-vt323 overflow-hidden">
      
      {/* Search Header */}
      <div className="p-6 pb-0 max-w-6xl mx-auto w-full">
        <div className="flex justify-between items-end mb-4">
            <div>
                 <h2 className="text-3xl font-bold text-white mb-1">MARKET BROWSER</h2>
                 <p className="text-gray-500 text-xs uppercase">
                    {browserState.activeTab === 'SEARCH' ? 'REMOTE SEARCH RESULTS' : 'Equities • Exchange Traded Funds • Mutual Funds • Derivatives'}
                 </p>
                 <div className="text-[10px] text-gray-600 mt-1">
                    {loading ? 'STATUS: FETCHING DATA...' : 'STATUS: READY'}
                 </div>
            </div>
            <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">🔍</span>
                <input 
                    type="text" 
                    value={browserState.searchTerm}
                    onChange={(e) => setBrowserState(prev => ({ ...prev, searchTerm: e.target.value }))}
                    placeholder="Search Symbol (e.g. TATA)..."
                    className="bg-black border border-gray-700 pl-8 pr-4 py-2 text-white focus:border-green-500 focus:outline-none w-64 text-sm"
                />
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-green-900/30 overflow-x-auto custom-scrollbar">
            <TabButton id="STOCK" label="STOCKS" />
            <TabButton id="ETF" label="ETFs" />
            <TabButton id="MF" label="MUTUAL FUNDS" />
            <TabButton id="FNO" label="DERIVATIVES" />
            {browserState.activeTab === 'SEARCH' && <TabButton id="SEARCH" label={`RESULTS`} />}
        </div>
      </div>

      {/* Main Content Table */}
      <div className="flex-1 overflow-y-auto p-6 pt-4">
        <div className="max-w-6xl mx-auto border border-gray-800 bg-[#080808]">
            {loading ? (
                <div className="p-12 flex flex-col items-center justify-center text-green-500 tracking-widest">
                    <div className="animate-spin text-3xl mb-4">⟳</div>
                    {browserState.activeTab === 'SEARCH' ? 'SEARCHING GLOBAL DATABASE...' : 'FETCHING MARKET DATA...'}
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#111] text-gray-500 text-xs uppercase sticky top-0 z-10 shadow-lg shadow-black/50">
                        <tr>
                            <th className="p-4 border-b border-gray-800">Symbol / Contract</th>
                            <th className="p-4 border-b border-gray-800">Name</th>
                            <th className="p-4 border-b border-gray-800 text-right">
                                {browserState.activeTab === 'MF' ? 'NAV' : 'Price'}
                            </th>
                            <th className="p-4 border-b border-gray-800 text-right">Change</th>
                            {browserState.activeTab === 'FNO' ? (
                                <>
                                    <th className="p-4 border-b border-gray-800 text-center">Type</th>
                                    <th className="p-4 border-b border-gray-800 text-center">Expiry</th>
                                    <th className="p-4 border-b border-gray-800 text-right">OI</th>
                                </>
                            ) : (
                                <th className="p-4 border-b border-gray-800 text-right text-gray-600">
                                    {browserState.activeTab === 'MF' || browserState.activeTab === 'ETF' ? 'Exp. Ratio' : 'Type'}
                                </th>
                            )}
                            <th className="p-4 border-b border-gray-800 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900">
                        {browserState.assets.map((asset) => {
                            const isPos = asset.change >= 0;
                            return (
                                <tr 
                                    key={asset.symbol} 
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, asset.symbol)}
                                    className="hover:bg-gray-900/40 group transition-colors cursor-grab active:cursor-grabbing"
                                >
                                    <td className="p-4 font-bold text-white font-mono">
                                        {asset.symbol}
                                        {browserState.activeTab !== 'STOCK' && asset.tags && (
                                            <div className="flex gap-1 mt-1">
                                                {asset.tags.map(t => (
                                                    <span key={t} className="text-[10px] bg-gray-800 text-gray-400 px-1 rounded truncate max-w-[100px]">{t}</span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-gray-300 text-sm max-w-[200px] truncate" title={asset.name}>{asset.name}</td>
                                    <td className="p-4 text-right font-mono text-yellow-500">
                                        {asset.price > 0 ? `₹${asset.price.toFixed(2)}` : 'N/A'}
                                    </td>
                                    <td className={`p-4 text-right font-mono font-bold ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                                        {isPos ? '+' : ''}{asset.change.toFixed(2)}%
                                    </td>

                                    {browserState.activeTab === 'FNO' ? (
                                        <>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                                    asset.optionType === 'CE' ? 'bg-green-900/30 text-green-400' :
                                                    asset.optionType === 'PE' ? 'bg-red-900/30 text-red-400' :
                                                    'bg-blue-900/30 text-blue-400'
                                                }`}>
                                                    {asset.optionType}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center text-gray-400 text-xs">{asset.expiry}</td>
                                            <td className="p-4 text-right text-gray-400 text-xs font-mono">
                                                {asset.oi?.toLocaleString()}
                                            </td>
                                        </>
                                    ) : (
                                        <td className="p-4 text-right text-gray-500 text-xs">
                                             <span className="bg-gray-800 text-gray-400 px-2 py-1 rounded">
                                                {asset.expenseRatio ? `${asset.expenseRatio}%` : (asset.tags?.[0] || 'EQ')}
                                             </span>
                                        </td>
                                    )}

                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => onAddToWatchlist(asset.symbol)}
                                            className="text-[10px] bg-blue-900/20 text-blue-400 border border-blue-900 px-2 py-1 hover:bg-blue-900/50 hover:text-white transition-colors"
                                        >
                                            + WATCH
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
            
            {browserState.assets.length === 0 && !loading && (
                <div className="p-12 text-center text-gray-600">
                    {browserState.activeTab === 'SEARCH' 
                      ? `NO RESULTS FOUND FOR "${browserState.searchTerm.toUpperCase()}"` 
                      : 'NO DATA AVAILABLE. CHECK NETWORK.'}
                </div>
            )}
        </div>
        
        <div className="mt-4 text-center text-[10px] text-gray-600 max-w-6xl mx-auto">
            DRAG ITEMS TO TABS TO PERFORM ACTIONS • F&O DATA IS SIMULATED
        </div>
      </div>
    </div>
  );
};
