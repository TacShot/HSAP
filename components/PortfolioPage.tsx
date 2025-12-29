import React, { useState, useMemo, useEffect } from 'react';
import { PortfolioItem, Stock, PendingAction } from '../types';
import { 
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid 
} from 'recharts';

interface PortfolioPageProps {
  portfolio: PortfolioItem[];
  stockData: Stock[];
  onAddPosition: (symbol: string, qty: number, price: number) => void;
  onRemovePosition: (symbol: string) => void;
  pendingAction?: PendingAction | null;
  onActionComplete?: () => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ 
  portfolio, stockData, onAddPosition, onRemovePosition, pendingAction, onActionComplete 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newPrice, setNewPrice] = useState('');

  // Handle Drag & Drop Action
  useEffect(() => {
    if (pendingAction?.type === 'ADD_PORTFOLIO' && pendingAction.symbol) {
      setNewSymbol(pendingAction.symbol);
      setIsAdding(true);
      if (onActionComplete) onActionComplete();
    }
  }, [pendingAction, onActionComplete]);

  // Calculations for Summary and Charts
  const { totalValue, totalPL, allocationData, historyData } = useMemo(() => {
    let tVal = 0;
    let tCost = 0;
    const alloc = [];

    for (const item of portfolio) {
      const stock = stockData.find(s => s.symbol === item.symbol);
      const price = stock ? stock.price : item.averagePrice;
      const val = price * item.quantity;
      const cost = item.averagePrice * item.quantity;
      
      tVal += val;
      tCost += cost;
      
      if (val > 0) {
        alloc.push({ name: item.symbol, value: val });
      }
    }

    const tPL = tVal - tCost;
    
    // Generate simulated 30-day history for the line chart
    // Interpolates between Cost Basis (start) and Current Value (end) with noise
    const history = [];
    const days = 30;
    for (let i = 0; i < days; i++) {
        const progress = i / (days - 1); // 0 to 1
        const base = tCost + (tVal - tCost) * progress;
        // Add pseudo-random market noise (±1.5%)
        const noise = base * (Math.sin(i) * Math.cos(i * 0.5)) * 0.015; 
        
        history.push({
            day: `D-${days - i}`,
            value: Math.max(0, base + noise)
        });
    }

    return { totalValue: tVal, totalPL: tPL, allocationData: alloc, historyData: history };
  }, [portfolio, stockData]);

  const isTotalPos = totalPL >= 0;
  const COLORS = ['#4ade80', '#60a5fa', '#facc15', '#f87171', '#c084fc', '#fb923c', '#2dd4bf'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymbol && newQty && newPrice) {
      onAddPosition(newSymbol.toUpperCase(), Number(newQty), Number(newPrice));
      setIsAdding(false);
      setNewSymbol('');
      setNewQty('');
      setNewPrice('');
    }
  };

  return (
    <div className="flex-1 p-6 bg-[#0c0c0c] overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* Header Summary */}
        <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-blue-400 mb-2">PORTFOLIO SUMMARY</h2>
            <div className="flex gap-8">
              <div>
                <div className="text-xs text-gray-500">TOTAL VALUE</div>
                <div className="text-3xl text-white font-mono">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">TOTAL P/L</div>
                <div className={`text-3xl font-mono ${isTotalPos ? 'text-green-500' : 'text-red-500'}`}>
                  {isTotalPos ? '+' : ''}₹{totalPL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-900 hover:bg-blue-800 text-blue-100 px-4 py-2 text-sm font-bold border border-blue-700"
          >
            + ADD POSITION
          </button>
        </div>

        {/* Charts Section */}
        {portfolio.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Allocation Chart */}
            <div className="bg-[#111] p-4 border border-gray-800 relative">
               <div className="absolute top-2 left-2 text-xs font-bold text-gray-500 bg-[#111] px-2 z-10">
                 ASSET_ALLOCATION
               </div>
               <div className="h-[250px] w-full mt-2">
                 <ResponsiveContainer>
                   <PieChart>
                     <Pie
                       data={allocationData}
                       cx="50%"
                       cy="50%"
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value"
                     >
                       {allocationData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#111" />
                       ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{backgroundColor: '#000', borderColor: '#333', color: '#fff'}}
                        itemStyle={{color: '#fff'}}
                        formatter={(value: number) => `₹${value.toLocaleString('en-IN', {maximumFractionDigits: 0})}`}
                     />
                     <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        iconSize={8}
                        wrapperStyle={{fontSize: '12px', fontFamily: 'monospace', color: '#888'}}
                     />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-[#111] p-4 border border-gray-800 relative">
               <div className="absolute top-2 left-2 text-xs font-bold text-gray-500 bg-[#111] px-2 z-10">
                 PERFORMANCE_TREND (30D)
               </div>
               <div className="h-[250px] w-full mt-2">
                 <ResponsiveContainer>
                   <LineChart data={historyData}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                     <XAxis dataKey="day" hide />
                     <YAxis 
                        domain={['auto', 'auto']} 
                        orientation="right" 
                        tick={{fill: '#555', fontSize: 10}} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `₹${(val/1000).toFixed(1)}k`}
                     />
                     <Tooltip 
                        contentStyle={{backgroundColor: '#000', borderColor: '#333', color: '#fff'}}
                        formatter={(value: number) => [`₹${value.toLocaleString('en-IN', {maximumFractionDigits: 0})}`, 'Value']}
                        labelStyle={{display: 'none'}}
                     />
                     <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={isTotalPos ? '#4ade80' : '#f87171'} 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{r: 4, fill: '#fff'}} 
                     />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        )}

        {isAdding && (
          <div className="mb-6 p-4 bg-gray-900 border border-gray-700">
            <h3 className="text-sm font-bold text-gray-400 mb-3">NEW TRANSACTION</h3>
            <form onSubmit={handleSubmit} className="flex gap-4 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">SYMBOL</label>
                <input required type="text" value={newSymbol} onChange={e => setNewSymbol(e.target.value)} className="bg-black border border-gray-700 p-2 text-white w-32" placeholder="TCS.NS" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">QTY</label>
                <input required type="number" value={newQty} onChange={e => setNewQty(e.target.value)} className="bg-black border border-gray-700 p-2 text-white w-24" placeholder="10" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">AVG PRICE</label>
                <input required type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="bg-black border border-gray-700 p-2 text-white w-32" placeholder="3200.00" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-green-900 text-green-100 px-4 py-2 border border-green-700 hover:bg-green-800">CONFIRM</button>
                <button type="button" onClick={() => setIsAdding(false)} className="bg-red-900 text-red-100 px-4 py-2 border border-red-700 hover:bg-red-800">CANCEL</button>
              </div>
            </form>
          </div>
        )}

        <table className="w-full text-sm">
          <thead className="bg-[#1a1a1a] text-gray-500 text-xs">
            <tr>
              <th className="px-4 py-3 text-left">SYMBOL</th>
              <th className="px-4 py-3 text-right">QTY</th>
              <th className="px-4 py-3 text-right">AVG PRICE</th>
              <th className="px-4 py-3 text-right">LTP</th>
              <th className="px-4 py-3 text-right">CUR VAL</th>
              <th className="px-4 py-3 text-right">P/L</th>
              <th className="px-4 py-3 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {portfolio.map((item) => {
              const stock = stockData.find(s => s.symbol === item.symbol);
              const ltp = stock ? stock.price : item.averagePrice;
              const currentVal = ltp * item.quantity;
              const pl = (ltp - item.averagePrice) * item.quantity;
              const isPos = pl >= 0;

              return (
                <tr key={item.symbol} className="hover:bg-gray-900/50">
                  <td className="px-4 py-3 font-bold text-white">{item.symbol}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{item.averagePrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-yellow-300">{ltp.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-white">{currentVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className={`px-4 py-3 text-right font-bold ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                    {isPos ? '+' : ''}{pl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => onRemovePosition(item.symbol)}
                      className="text-red-500 hover:text-red-400 hover:underline text-xs"
                    >
                      LIQUIDATE
                    </button>
                  </td>
                </tr>
              );
            })}
             {portfolio.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-600 italic">
                  No open positions. Add a trade to track performance.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};