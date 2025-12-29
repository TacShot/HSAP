import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_WATCHLIST, REFRESH_RATE_MS } from './constants';
import { Stock, ChartPoint, Timeframe, ModalType, AlertConfig, Prediction, Page, PortfolioItem, AuthState, UserData, PendingAction } from './types';
import { fetchStockData, fetchHistoricalData, isValidSymbol } from './services/stockService';
import { generatePrediction } from './services/predictionService';
import { saveUserData } from './services/githubService';
import { encryptData } from './services/cryptoService';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { InputModal } from './components/InputModal';
import { HelpModal } from './components/HelpModal';
import { PredictionModal } from './components/PredictionModal';
import { LoginPage } from './components/LoginPage';

// Pages
import { DashboardPage } from './components/DashboardPage';
import { PortfolioPage } from './components/PortfolioPage';
import { AiAnalysisPage } from './components/AiAnalysisPage';
import { OpportunitiesPage } from './components/OpportunitiesPage';
import { ScreenerPage } from './components/ScreenerPage';
import { SettingsPage } from './components/SettingsPage';

const PAGES: Page[] = ['DASHBOARD', 'PORTFOLIO', 'AI_ANALYSIS', 'OPPORTUNITIES', 'SCREENER', 'SETTINGS'];

const App: React.FC = () => {
  // Auth State
  const [auth, setAuth] = useState<AuthState>({
    token: '',
    username: '',
    repo: '',
    isAuthenticated: false
  });
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'SYNCING' | 'SAVED' | 'ERROR'>('IDLE');

  // Navigation State
  const [activePage, setActivePage] = useState<Page>('DASHBOARD');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Shared Data State
  const [watchlist, setWatchlist] = useState<string[]>(INITIAL_WATCHLIST);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [alerts, setAlerts] = useState<AlertConfig[]>([]);
  const [userSettings, setUserSettings] = useState<UserData['userSettings']>({});
  
  const [stockData, setStockData] = useState<Stock[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.Intraday);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Prediction State
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [isPredictionLoading, setIsPredictionLoading] = useState(false);
  
  // Modals
  const [modalType, setModalType] = useState<ModalType>('NONE');
  const [helpOpen, setHelpOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [triggeredAlert, setTriggeredAlert] = useState<string | null>(null);

  // Handle Login Logic
  const handleLogin = (newAuth: AuthState, data: UserData | null) => {
    setAuth(newAuth);
    if (data) {
      if (data.watchlist) setWatchlist(data.watchlist);
      if (data.portfolio) setPortfolio(data.portfolio);
      if (data.alerts) setAlerts(data.alerts);
      if (data.userSettings) setUserSettings(data.userSettings);
    }
  };

  const handleUpdateUserData = (newData: UserData) => {
      setWatchlist(newData.watchlist);
      setPortfolio(newData.portfolio);
      setAlerts(newData.alerts);
      setUserSettings(newData.userSettings);
  };

  // Sync Data (GitHub or LocalStorage Encrypted)
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const syncData = async () => {
      setSyncStatus('SYNCING');
      const data: UserData = { watchlist, portfolio, alerts, userSettings };
      
      if (auth.isLocal && auth.cryptoKey && auth.salt) {
        // Local Encrypted Mode
        try {
            const encryptedContent = await encryptData(data, auth.cryptoKey, auth.salt);
            localStorage.setItem('instock_encrypted_data', encryptedContent);
            setSyncStatus('SAVED');
            setTimeout(() => setSyncStatus('IDLE'), 2000);
        } catch (e) {
            console.error("Encryption Save Failed", e);
            setSyncStatus('ERROR');
        }
      } else if (!auth.isLocal) {
        // Cloud Sync Mode
        const result = await saveUserData(
          auth.token, 
          auth.repo, 
          auth.username, 
          data, 
          auth.sha
        );

        if (result.success) {
          setSyncStatus('SAVED');
          if (result.newSha) {
            setAuth(prev => ({ ...prev, sha: result.newSha }));
          }
          setTimeout(() => setSyncStatus('IDLE'), 2000);
        } else {
          setSyncStatus('ERROR');
        }
      }
    };

    const timeoutId = setTimeout(syncData, 2000); // 2 second debounce
    return () => clearTimeout(timeoutId);
  }, [watchlist, portfolio, alerts, userSettings, auth.isAuthenticated, auth.isLocal, auth.cryptoKey, auth.salt, auth.token, auth.repo, auth.username, auth.sha]);

  // Data Fetching Loop (Global)
  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const fetchData = async () => {
      // Fetch watchlist stocks AND portfolio stocks that might not be in watchlist
      const allSymbols = new Set([...watchlist, ...portfolio.map(p => p.symbol)]);
      const uniqueSymbols = Array.from(allSymbols);
      
      if (uniqueSymbols.length === 0) {
        setStockData([]);
        return;
      }

      const promises = uniqueSymbols.map(symbol => fetchStockData(symbol));
      const results = await Promise.all(promises);
      setStockData(results);
      
      // Check alerts
      results.forEach(stock => {
        const alert = alerts.find(a => a.symbol === stock.symbol && a.enabled);
        if (alert) {
          const changePercent = Math.abs((stock.price - alert.basePrice) / alert.basePrice * 100);
          if (changePercent >= alert.thresholdPercent) {
             setTriggeredAlert(`ALERT: ${stock.symbol} moved ${changePercent.toFixed(2)}%`);
             setTimeout(() => setTriggeredAlert(null), 5000);
          }
        }
      });
    };

    fetchData(); 
    const interval = setInterval(fetchData, REFRESH_RATE_MS);
    return () => clearInterval(interval);
  }, [watchlist, alerts, portfolio, auth.isAuthenticated]);

  // Chart Data Fetching (Only when on Dashboard)
  useEffect(() => {
    if (!auth.isAuthenticated || activePage !== 'DASHBOARD') return;

    const currentStock = watchlist[selectedIndex];
    if (!currentStock) return;

    const loadChart = async () => {
      setIsChartLoading(true);
      try {
        const data = await fetchHistoricalData(currentStock, timeframe);
        setChartData(data);
      } finally {
        setIsChartLoading(false);
      }
    };

    loadChart();
  }, [selectedIndex, timeframe, watchlist, activePage, auth.isAuthenticated]);

  // Actions
  const handleAddStock = (symbol: string) => {
    if (!isValidSymbol(symbol)) {
      setValidationError('Invalid Format. Must end with .NS or .BO');
      return;
    }
    if (watchlist.includes(symbol)) {
      setValidationError('Stock already in watchlist.');
      return;
    }
    setWatchlist(prev => [...prev, symbol]);
    setModalType('NONE');
    setValidationError(undefined);
  };

  const handleRemoveStock = () => {
    if (watchlist.length === 0) return;
    const newWatchlist = watchlist.filter((_, i) => i !== selectedIndex);
    setWatchlist(newWatchlist);
    if (selectedIndex >= newWatchlist.length) {
      setSelectedIndex(Math.max(0, newWatchlist.length - 1));
    }
  };

  const handleSetAlert = (val: string) => {
    const threshold = parseFloat(val);
    if (isNaN(threshold) || threshold <= 0) {
      setValidationError('Enter a valid positive number');
      return;
    }
    const currentStock = stockData.find(s => s.symbol === watchlist[selectedIndex]);
    if (!currentStock) return;

    const newAlert: AlertConfig = {
      symbol: currentStock.symbol,
      thresholdPercent: threshold,
      enabled: true,
      basePrice: currentStock.price
    };

    setAlerts(prev => [...prev.filter(a => a.symbol !== currentStock.symbol), newAlert]);
    setModalType('NONE');
    setValidationError(undefined);
  };

  const handlePrediction = async () => {
    if (activePage !== 'DASHBOARD') return;
    const currentStock = stockData.find(s => s.symbol === watchlist[selectedIndex]);
    if (!currentStock) return;

    setModalType('PREDICTION');
    setIsPredictionLoading(true);
    setPrediction(null);

    try {
      // Pass custom API key if available
      const result = await generatePrediction(currentStock, chartData, userSettings?.customApiKey);
      setPrediction(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPredictionLoading(false);
    }
  };

  const handlePortfolioAdd = (symbol: string, quantity: number, averagePrice: number) => {
    setPortfolio(prev => [...prev, { symbol, quantity, averagePrice }]);
  };

  const handlePortfolioRemove = (symbol: string) => {
    setPortfolio(prev => prev.filter(p => p.symbol !== symbol));
  };

  const handleTimeframeChange = (key: string) => {
    const map: Record<string, Timeframe> = {
      '1': Timeframe.Intraday,
      '2': Timeframe.Week,
      '3': Timeframe.Month,
      '4': Timeframe.ThreeMonths,
      '5': Timeframe.FiveYears,
      '6': Timeframe.Year,
      '0': Timeframe.FiveYears
    };
    if (map[key]) setTimeframe(map[key]);
  };

  const handleDropOnTab = (e: React.DragEvent, targetPage: Page) => {
    e.preventDefault();
    const symbol = e.dataTransfer.getData('symbol');
    if (!symbol) return;

    setActivePage(targetPage);
    
    switch (targetPage) {
      case 'PORTFOLIO':
        setPendingAction({ type: 'ADD_PORTFOLIO', symbol });
        break;
      case 'AI_ANALYSIS':
        setPendingAction({ type: 'ANALYZE', symbol });
        break;
      case 'OPPORTUNITIES':
        setPendingAction({ type: 'CHECK_OPPORTUNITY', symbol });
        break;
      case 'SCREENER':
        setPendingAction({ type: 'FIND_SIMILAR', symbol });
        break;
    }
  };

  // Keyboard Hooks
  useKeyboardShortcuts({
    disabled: !auth.isAuthenticated || modalType !== 'NONE' || helpOpen,
    onUp: () => setSelectedIndex(prev => (prev > 0 ? prev - 1 : watchlist.length - 1)),
    onDown: () => setSelectedIndex(prev => (prev < watchlist.length - 1 ? prev + 1 : 0)),
    onAdd: () => activePage === 'DASHBOARD' && setModalType('ADD_STOCK'),
    onDelete: () => activePage === 'DASHBOARD' && handleRemoveStock(),
    onAlert: () => activePage === 'DASHBOARD' && setModalType('SET_ALERT'),
    onPrediction: handlePrediction,
    onHelp: () => setHelpOpen(prev => !prev),
    onTimeframe: handleTimeframeChange,
    onNavigate: (index) => {
      if (PAGES[index]) setActivePage(PAGES[index]);
    },
    onCyclePage: (direction) => {
      const currIdx = PAGES.indexOf(activePage);
      let newIdx = direction === 'NEXT' ? currIdx + 1 : currIdx - 1;
      if (newIdx >= PAGES.length) newIdx = 0;
      if (newIdx < 0) newIdx = PAGES.length - 1;
      setActivePage(PAGES[newIdx]);
    }
  });

  const NavButton = ({ page, label, shortcut }: { page: Page; label: string; shortcut: string }) => (
    <button 
      onClick={() => setActivePage(page)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDropOnTab(e, page)}
      className={`px-4 py-1 font-bold text-sm tracking-widest transition-all clip-path-slant group relative
        ${activePage === page 
          ? 'bg-green-600 text-black shadow-[0_0_10px_#00ff00]' 
          : 'bg-[#1a1a1a] text-gray-500 hover:text-green-400 hover:bg-[#222]'}`}
      style={{ clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)' }}
      title={shortcut !== '0' ? `Alt+${shortcut}` : ''}
    >
      {label}
      {shortcut !== '0' && <span className="absolute -top-1 right-1 text-[8px] opacity-0 group-hover:opacity-100 bg-black text-white px-1">Alt+{shortcut}</span>}
    </button>
  );

  // Render Login if not authenticated
  if (!auth.isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0c0c0c] text-gray-300 overflow-hidden font-vt323">
      {/* Top Status Bar */}
      <div className="h-8 bg-[#050505] border-b border-gray-800 flex items-center justify-between px-4 text-xs font-bold uppercase tracking-widest select-none z-10">
        <div className="flex gap-4 items-center">
            <span className="text-green-600">InStock Terminal v3.0</span>
            <span className="text-gray-600">|</span>
            <span className="text-blue-500">USER: {auth.username}</span>
            <span className="text-gray-600">|</span>
            {triggeredAlert && <span className="text-yellow-300 animate-pulse bg-red-900 px-2">{triggeredAlert}</span>}
        </div>
        <div className="flex gap-4">
            <span className={
               syncStatus === 'SYNCING' ? 'text-yellow-500 animate-pulse' : 
               syncStatus === 'SAVED' ? 'text-green-500' :
               syncStatus === 'ERROR' ? 'text-red-500' : 'text-gray-700'
            }>
               {auth.isLocal && auth.cryptoKey ? 'STORAGE: LOCAL (ENCRYPTED)' : auth.isLocal ? 'STORAGE: LOCAL (UNSECURED)' : (syncStatus === 'IDLE' ? 'CLOUD: SYNCED' : `CLOUD: ${syncStatus}`)}
            </span>
            <span className="text-gray-600">|</span>
            <span>{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-[#000] border-b border-gray-800 px-4 py-2 flex gap-2">
        <NavButton page="DASHBOARD" label="DASHBOARD" shortcut="1" />
        <NavButton page="PORTFOLIO" label="PORTFOLIO" shortcut="2" />
        <NavButton page="AI_ANALYSIS" label="AI ANALYST" shortcut="3" />
        <NavButton page="OPPORTUNITIES" label="OPPORTUNITIES" shortcut="4" />
        <NavButton page="SCREENER" label="SCREENER" shortcut="5" />
        <div className="flex-1"></div>
        <NavButton page="SETTINGS" label="SYSTEM CONFIG" shortcut="0" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {activePage === 'DASHBOARD' && (
          <DashboardPage 
            stockData={stockData.filter(s => watchlist.includes(s.symbol))}
            selectedIndex={selectedIndex}
            setSelectedIndex={setSelectedIndex}
            chartData={chartData}
            timeframe={timeframe}
            isChartLoading={isChartLoading}
            userSettings={userSettings} // Pass settings for NewsFeed API key
          />
        )}
        
        {activePage === 'PORTFOLIO' && (
          <PortfolioPage 
            portfolio={portfolio}
            stockData={stockData}
            onAddPosition={handlePortfolioAdd}
            onRemovePosition={handlePortfolioRemove}
            pendingAction={pendingAction}
            onActionComplete={() => setPendingAction(null)}
          />
        )}

        {activePage === 'AI_ANALYSIS' && (
          <AiAnalysisPage 
            pendingAction={pendingAction}
            onActionComplete={() => setPendingAction(null)}
            apiKey={userSettings?.customApiKey}
          />
        )}
        
        {activePage === 'OPPORTUNITIES' && (
           <OpportunitiesPage 
             pendingAction={pendingAction}
             onActionComplete={() => setPendingAction(null)}
             apiKey={userSettings?.customApiKey}
           />
        )}

        {activePage === 'SCREENER' && (
          <ScreenerPage 
            pendingAction={pendingAction}
            onActionComplete={() => setPendingAction(null)}
            apiKey={userSettings?.customApiKey}
          />
        )}

        {activePage === 'SETTINGS' && (
            <SettingsPage 
                auth={auth} 
                userData={{ watchlist, portfolio, alerts, userSettings }}
                onUpdateAuth={setAuth}
                onUpdateData={handleUpdateUserData}
            />
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="h-8 bg-[#1a1a1a] border-t border-gray-800 flex items-center px-4 text-xs text-gray-500 justify-between select-none z-10">
        <div className="flex gap-6">
          <span><strong className="text-white">Alt+1-5</strong> NAVIGATE</span>
          <span><strong className="text-white">[/]</strong> CYCLE PAGE</span>
          {activePage === 'DASHBOARD' ? (
            <>
              <span><strong className="text-white">a</strong> ADD</span>
              <span><strong className="text-white">d</strong> DELETE</span>
              <span><strong className="text-white">r</strong> ALERT</span>
              <span><strong className="text-white">p</strong> PREDICT</span>
            </>
          ) : activePage === 'SETTINGS' ? (
              <span>SYSTEM CONFIGURATION MODE</span>
          ) : (
             <span>DRAG STOCKS TO TABS FOR ACTIONS</span>
          )}
          <span><strong className="text-white">h</strong> HELP</span>
        </div>
        <div>
           {activePage === 'DASHBOARD' && watchlist[selectedIndex] && alerts.find(a => a.symbol === watchlist[selectedIndex]) 
             ? <span className="text-blue-400">ALERT ACTIVE</span> 
             : <span>SYSTEM READY</span>}
        </div>
      </div>

      {/* Modals */}
      <InputModal
        isOpen={modalType === 'ADD_STOCK'}
        title="Add Stock"
        prompt="Enter Stock Symbol (e.g., RELIANCE.NS):"
        onClose={() => { setModalType('NONE'); setValidationError(undefined); }}
        onSubmit={handleAddStock}
        validationError={validationError}
      />
      
      <InputModal
        isOpen={modalType === 'SET_ALERT'}
        title="Set Price Alert"
        prompt={`Alert threshold % for ${watchlist[selectedIndex]}:`}
        defaultValue="2.0"
        onClose={() => { setModalType('NONE'); setValidationError(undefined); }}
        onSubmit={handleSetAlert}
        validationError={validationError}
      />

      <PredictionModal
        isOpen={modalType === 'PREDICTION'}
        onClose={() => setModalType('NONE')}
        prediction={prediction}
        loading={isPredictionLoading}
        symbol={watchlist[selectedIndex]}
      />

      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default App;