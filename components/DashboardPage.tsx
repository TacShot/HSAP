
import React from 'react';
import { WatchlistPanel } from './WatchlistPanel';
import { ChartPanel } from './ChartPanel';
import { NewsFeed } from './NewsFeed';
import { Stock, ChartPoint, Timeframe, UserData } from '../types';

interface DashboardPageProps {
  stockData: Stock[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  chartData: ChartPoint[];
  timeframe: Timeframe;
  isChartLoading: boolean;
  userSettings?: UserData['userSettings'];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stockData,
  selectedIndex,
  setSelectedIndex,
  chartData,
  timeframe,
  isChartLoading,
  userSettings
}) => {
  const currentStock = stockData[selectedIndex];

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full">
      {/* Left Panel: Watchlist */}
      <div className="w-1/3 min-w-[300px] max-w-[400px] h-full flex flex-col">
        <WatchlistPanel 
          stocks={stockData} 
          selectedIndex={selectedIndex} 
          onSelect={setSelectedIndex} 
        />
      </div>

      {/* Right Panel: Charts & News */}
      <div className="flex-1 h-full border-l border-gray-800 flex flex-col min-w-0">
        {/* Top: Chart (65% height) */}
        <div className="h-[65%] min-h-0 min-w-0">
            <ChartPanel 
            stock={currentStock} 
            data={chartData} 
            timeframe={timeframe} 
            loading={isChartLoading}
            />
        </div>
        
        {/* Bottom: News Feed (35% height) */}
        <div className="flex-1 border-t border-gray-800 min-h-0 min-w-0">
            {currentStock && (
                <NewsFeed symbol={currentStock.symbol} apiKey={userSettings?.customApiKey} />
            )}
        </div>
      </div>
    </div>
  );
};
