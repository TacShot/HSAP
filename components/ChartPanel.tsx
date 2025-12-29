
import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Brush,
  ReferenceLine
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

  // Reset zoom when data changes
  useEffect(() => {
    setZoomState(null);
  }, [data]);

  const handleBrushChange = (domain: any) => {
    if (domain && typeof domain.startIndex === 'number' && typeof domain.endIndex === 'number') {
      setZoomState({ start: domain.startIndex, end: domain.endIndex });
    }
  };

  const visibleData = zoomState 
    ? data.slice(zoomState.start, zoomState.end + 1)
    : data;

  if (!stock) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-700 bg-[#050505] font-mono tracking-widest text-sm">
        &lt; SELECT ASSET TO INITIALIZE VISUALIZATION &gt;
      </div>
    );
  }

  const isPositive = stock.change >= 0;
  const accentColor = isPositive ? '#00ff41' : '#ff3333'; 
  const volumeFill = isPositive ? '#003300' : '#330000';
  const volumeStroke = isPositive ? '#005500' : '#550000';
  
  const hasData = data && data.length > 0;

  return (
    <div className="h-full w-full flex flex-col bg-[#050505]">
      {/* Header Info */}
      <div className="px-6 py-4 border-b border-gray-900 bg-[#080808] shrink-0">
        <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 tracking-tight font-mono">{stock.symbol}</h1>
              <div className="flex items-center gap-4">
                <span className="text-5xl font-light text-white tracking-tighter">₹{stock.price.toFixed(2)}</span>
                <div className={`flex flex-col items-start ${isPositive ? 'text-[#00ff41]' : 'text-[#ff3333]'}`}>
                    <span className="text-xl font-bold font-mono">
                        {isPositive ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}
                    </span>
                    <span className="text-sm font-mono opacity-80">
                        ({Math.abs(stock.percentChange).toFixed(2)}%)
                    </span>
                </div>
              </div>
            </div>
            
            <div className="text-right space-y-2 font-mono text-sm hidden md:block">
                <div className="flex gap-8 justify-end text-gray-500">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider">Open</span>
                        <span className="text-gray-300">{stock.open.toFixed(2)}</span>
                    </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider">High</span>
                        <span className="text-gray-300">{stock.high.toFixed(2)}</span>
                    </div>
                </div>
                <div className="flex gap-8 justify-end text-gray-500">
                     <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider">Prev</span>
                        <span className="text-gray-300">{stock.previousClose.toFixed(2)}</span>
                    </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider">Low</span>
                        <span className="text-gray-300">{stock.low.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Charts Container - Flex Grow to fill remaining space */}
      <div className="flex-1 flex flex-col p-4 space-y-4 relative min-h-0 w-full overflow-hidden">
        
        {loading && (
            <div className="absolute inset-0 z-20 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="text-[#00ff41] animate-pulse font-mono tracking-widest text-lg">>> SYNCING MARKET DATA...</div>
                <div className="w-64 h-1 bg-gray-900 mt-4 overflow-hidden">
                    <div className="h-full bg-[#00ff41] animate-[width_1s_ease-in-out_infinite] w-1/2"></div>
                </div>
            </div>
        )}

        {/* Price Chart Area */}
        <div 
          className="flex-1 w-full border border-gray-900 bg-[#060606] relative p-1 group min-h-[150px]"
          style={{ minWidth: 0, minHeight: 0 }}
        >
          <div className="absolute top-2 left-2 text-[10px] text-gray-500 font-bold bg-[#060606] px-2 z-10 border border-gray-900 font-mono group-hover:text-white transition-colors">
            PRICE_ACTION • {TIMEFRAME_LABELS[timeframe].toUpperCase()}
          </div>
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} syncId="dashboardChart" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#111" vertical={false} />
                <XAxis 
                    dataKey="time" 
                    stroke="#222" 
                    tick={{fill: '#444', fontSize: 10, fontFamily: 'monospace'}} 
                    tickLine={false}
                    axisLine={false}
                    minTickGap={40}
                />
                <YAxis 
                    domain={['auto', 'auto']} 
                    orientation="right" 
                    stroke="#222" 
                    tick={{fill: '#444', fontSize: 10, fontFamily: 'monospace'}} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val.toFixed(0)}
                    width={50}
                />
                <Tooltip 
                    contentStyle={{backgroundColor: '#000', border: '1px solid #222', color: '#fff'}}
                    itemStyle={{color: accentColor, fontFamily: 'monospace'}}
                    labelStyle={{color: '#666', marginBottom: '4px', fontSize: '10px'}}
                    cursor={{stroke: '#333', strokeWidth: 1}}
                />
                <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={accentColor} 
                    strokeWidth={1.5}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                    isAnimationActive={false}
                />
                <ReferenceLine y={stock.previousClose} stroke="#222" strokeDasharray="3 3" />
                <Brush 
                    dataKey="time" 
                    height={12} 
                    stroke="#222" 
                    fill="#080808" 
                    tickFormatter={() => ''}
                    travellerWidth={4}
                    onChange={handleBrushChange}
                    alwaysShowText={false}
                />
                </AreaChart>
            </ResponsiveContainer>
          ) : (
             <div className="w-full h-full flex items-center justify-center text-gray-800 text-xs">NO CHART DATA AVAILABLE</div>
          )}
        </div>

        {/* Volume Chart Area */}
        <div 
          className="h-[120px] w-full shrink-0 border border-gray-900 bg-[#060606] relative p-1 mt-2"
          style={{ minWidth: 0, minHeight: 0 }}
        >
          <div className="absolute top-1 left-2 text-[10px] text-gray-500 font-bold bg-[#060606] px-2 z-10 border border-gray-900 font-mono">
            VOLUME_OSCILLATOR
          </div>
          {hasData && (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleData} syncId="dashboardChart" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#111" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis 
                    orientation="right" 
                    stroke="#222" 
                    tick={{fill: '#333', fontSize: 9, fontFamily: 'monospace'}} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => (val/1000).toFixed(0) + 'K'}
                    width={50}
                />
                <Tooltip 
                    cursor={{fill: '#111'}}
                    contentStyle={{backgroundColor: '#000', border: '1px solid #222', color: '#fff'}}
                    labelStyle={{display: 'none'}}
                    formatter={(val: number) => [val.toLocaleString(), 'VOL']}
                />
                <Bar dataKey="volume" fill={volumeFill} stroke={volumeStroke} opacity={1} barSize={4} isAnimationActive={false} />
                </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
