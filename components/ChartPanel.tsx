import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Brush
} from 'recharts';
import { ChartPoint, Stock, Timeframe } from '../types';
import { TIMEFRAME_LABELS } from '../constants';

interface ChartPanelProps {
  stock?: Stock;
  data: ChartPoint[];
  timeframe: Timeframe;
  loading: boolean;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({ stock, data, timeframe, loading }) => {
  const [zoomState, setZoomState] = useState<{ start: number; end: number } | null>(null);

  // Reset zoom when data changes (e.g. stock switch or timeframe change)
  useEffect(() => {
    setZoomState(null);
  }, [data]);

  const handleBrushChange = (domain: any) => {
    if (domain && typeof domain.startIndex === 'number' && typeof domain.endIndex === 'number') {
      setZoomState({ start: domain.startIndex, end: domain.endIndex });
    }
  };

  // Derive visible data for Volume chart based on Zoom State
  // If zoomState is null, show all. If set, slice.
  const visibleData = zoomState 
    ? data.slice(zoomState.start, zoomState.end + 1)
    : data;

  if (!stock) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 bg-[#0c0c0c]">
        Select a stock to view details
      </div>
    );
  }

  const isPositive = stock.change >= 0;
  const color = isPositive ? '#4ade80' : '#ef4444';

  return (
    <div className="h-full flex flex-col bg-[#0c0c0c]">
      {/* Header Info */}
      <div className="p-4 border-b border-gray-800 flex justify-between items-end bg-[#111]">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{stock.symbol}</h1>
          <div className="flex items-baseline space-x-4">
            <span className="text-3xl font-light">₹{stock.price.toFixed(2)}</span>
            <span className={`text-lg font-mono ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)} ({Math.abs(stock.percentChange).toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="text-right text-sm space-y-1 text-gray-400 font-mono">
          <div className="flex space-x-4">
            <span>OPEN: <span className="text-white">{stock.open.toFixed(2)}</span></span>
            <span>HIGH: <span className="text-white">{stock.high.toFixed(2)}</span></span>
          </div>
          <div className="flex space-x-4 justify-end">
            <span>PREV: <span className="text-white">{stock.previousClose.toFixed(2)}</span></span>
            <span>LOW:  <span className="text-white">{stock.low.toFixed(2)}</span></span>
          </div>
          <div>VOL: <span className="text-blue-400">{stock.volume.toLocaleString()}</span></div>
        </div>
      </div>

      {/* Charts Container */}
      <div className="flex-1 flex flex-col p-4 space-y-4 relative">
        
        {loading && (
            <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center">
                <span className="text-blue-400 animate-pulse">LOADING DATA...</span>
            </div>
        )}

        {/* Price Chart */}
        <div className="flex-1 border border-gray-800 p-2 relative">
          <div className="absolute top-2 left-2 text-xs text-gray-500 font-bold bg-[#0c0c0c] px-2 z-10">
            PRICE • {TIMEFRAME_LABELS[timeframe].toUpperCase()}
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} syncId="dashboardChart">
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#444" 
                tick={{fill: '#666', fontSize: 10}} 
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                orientation="right" 
                stroke="#444" 
                tick={{fill: '#666', fontSize: 10}} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => val.toFixed(0)}
                width={50}
              />
              <Tooltip 
                contentStyle={{backgroundColor: '#111', border: '1px solid #333', color: '#fff'}}
                itemStyle={{color: '#fff'}}
                labelStyle={{color: '#888'}}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={color} 
                strokeWidth={2} 
                dot={false} 
                activeDot={{r: 4, fill: '#fff'}}
                animationDuration={500}
                isAnimationActive={false} 
              />
              <Brush 
                dataKey="time" 
                height={20} 
                stroke="#333" 
                fill="#111" 
                tickFormatter={() => ''}
                travellerWidth={10}
                onChange={handleBrushChange}
                alwaysShowText={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Chart */}
        <div className="h-1/4 border border-gray-800 p-2 relative">
          <div className="absolute top-2 left-2 text-xs text-gray-500 font-bold bg-[#0c0c0c] px-2 z-10">
            VOLUME
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visibleData} syncId="dashboardChart">
               <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
               <XAxis dataKey="time" hide />
               <YAxis 
                orientation="right" 
                stroke="#444" 
                tick={{fill: '#666', fontSize: 9}} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => (val/1000).toFixed(0) + 'K'}
                width={50}
               />
               <Tooltip 
                cursor={{fill: '#222'}}
                contentStyle={{backgroundColor: '#111', border: '1px solid #333', color: '#fff'}}
               />
               <Bar dataKey="volume" fill="#3b82f6" opacity={0.5} barSize={10} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};