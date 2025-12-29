import React, { useState, useMemo } from 'react';
import { Stock } from '../types';

interface WatchlistPanelProps {
  stocks: Stock[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

type SortKey = 'SYMBOL' | 'PRICE' | 'CHANGE' | 'PERCENT';
type SortDirection = 'ASC' | 'DESC';

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({ stocks, selectedIndex, onSelect }) => {
  const [sortKey, setSortKey] = useState<SortKey>('SYMBOL');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');

  // Find the currently selected symbol based on the index from parent
  // We use this to maintain selection visually even if sort order changes
  const selectedSymbol = stocks[selectedIndex]?.symbol;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortKey(key);
      // Default to ASC for text (Symbol), DESC for numbers (Price, Change)
      setSortDirection(key === 'SYMBOL' ? 'ASC' : 'DESC');
    }
  };

  const sortedStocks = useMemo(() => {
    if (!stocks) return [];
    return [...stocks].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortKey) {
        case 'SYMBOL':
          valA = a.symbol;
          valB = b.symbol;
          break;
        case 'PRICE':
          valA = a.price;
          valB = b.price;
          break;
        case 'CHANGE':
          valA = a.change;
          valB = b.change;
          break;
        case 'PERCENT':
          valA = a.percentChange;
          valB = b.percentChange;
          break;
      }

      if (valA < valB) return sortDirection === 'ASC' ? -1 : 1;
      if (valA > valB) return sortDirection === 'ASC' ? 1 : -1;
      return 0;
    });
  }, [stocks, sortKey, sortDirection]);

  const SortIcon = ({ active, direction }: { active: boolean, direction: SortDirection }) => {
    if (!active) return <span className="text-gray-700 ml-1 text-[10px]">↕</span>;
    return <span className="text-blue-400 ml-1 text-[10px]">{direction === 'ASC' ? '▲' : '▼'}</span>;
  };

  const handleDragStart = (e: React.DragEvent, symbol: string) => {
    e.dataTransfer.setData('symbol', symbol);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="h-full flex flex-col border-r border-gray-800 bg-[#0c0c0c]">
      <div className="bg-[#1a1a1a] px-3 py-1 border-b border-gray-800 flex justify-between items-center">
        <span className="font-bold text-blue-400">WATCHLIST</span>
        <span className="text-xs text-gray-500">{stocks.length} ITEMS</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="text-gray-500 border-b border-gray-800 text-xs text-left sticky top-0 bg-[#0c0c0c] z-10 shadow-sm shadow-gray-900">
            <tr>
              <th 
                className="px-3 py-2 font-normal cursor-pointer hover:text-gray-300 transition-colors select-none"
                onClick={() => handleSort('SYMBOL')}
                title="Sort by Symbol"
              >
                SYMBOL <SortIcon active={sortKey === 'SYMBOL'} direction={sortDirection} />
              </th>
              <th 
                className="px-3 py-2 font-normal text-right cursor-pointer hover:text-gray-300 transition-colors select-none"
                onClick={() => handleSort('PRICE')}
                title="Sort by Price"
              >
                PRICE <SortIcon active={sortKey === 'PRICE'} direction={sortDirection} />
              </th>
              <th 
                className="px-3 py-2 font-normal text-right cursor-pointer hover:text-gray-300 transition-colors select-none"
                onClick={() => handleSort('PERCENT')}
                title="Sort by % Change"
              >
                % <SortIcon active={sortKey === 'PERCENT'} direction={sortDirection} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStocks.map((stock) => {
              const isSelected = stock.symbol === selectedSymbol;
              const isPositive = stock.change >= 0;
              const colorClass = isPositive ? 'text-green-500' : 'text-red-500';

              return (
                <tr
                  key={stock.symbol}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, stock.symbol)}
                  onClick={() => {
                    // Map back to the original index in the 'stocks' array provided by parent
                    // This ensures App.tsx 'selectedIndex' state points to the correct stock
                    const originalIndex = stocks.findIndex(s => s.symbol === stock.symbol);
                    if (originalIndex !== -1) onSelect(originalIndex);
                  }}
                  className={`
                    cursor-pointer transition-colors duration-75 group
                    ${isSelected ? 'bg-blue-900/30' : 'hover:bg-[#1a1a1a]'}
                  `}
                >
                  <td className={`px-3 py-2 font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {isSelected && <span className="text-blue-500 mr-1 text-[10px]">▶</span>}
                    {stock.symbol}
                  </td>
                  <td className={`px-3 py-2 text-right ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {stock.price.toFixed(2)}
                  </td>
                  <td className={`px-3 py-2 text-right ${colorClass}`}>
                    {isPositive ? '+' : ''}{stock.percentChange.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
            {stocks.length === 0 && (
                <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-gray-600 italic">
                        No stocks in watchlist.<br/>Press 'a' to add.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-2 border-t border-gray-800 text-xs text-gray-600 flex justify-between">
         <span>NSE/BSE</span>
         <span>DRAG TO TABS</span>
      </div>
    </div>
  );
};