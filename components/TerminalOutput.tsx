import React from 'react';
import { TerminalLine, Stock, Prediction, ChartPoint } from '../types';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface TerminalOutputProps {
  line: TerminalLine;
}

export const TerminalOutput: React.FC<TerminalOutputProps> = ({ line }) => {
  const { type, content } = line;

  if (type === 'COMMAND') {
    return (
      <div className="text-gray-400 mt-2">
        <span className="text-green-500 font-bold mr-2">guest@instock:~$</span>
        {content}
      </div>
    );
  }

  if (type === 'ERROR') {
    return <div className="text-red-500 mb-1">{content}</div>;
  }

  if (type === 'SUCCESS') {
    return <div className="text-green-400 mb-1">{content}</div>;
  }

  if (type === 'TEXT') {
    return <div className="text-gray-300 whitespace-pre-wrap mb-1">{content}</div>;
  }

  if (type === 'TABLE_STOCKS') {
    return (
      <div className="my-2 bg-gray-900/50 p-2 border-l-2 border-gray-700 w-fit">
        {content.map((row: string, i: number) => (
          <div key={i} className={`whitespace-pre font-mono ${i > 1 && row.includes('+') ? 'text-green-400' : i > 1 ? 'text-red-400' : 'text-blue-300'}`}>
            {row}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'CHART') {
    const { symbol, data } = content as { symbol: string, data: ChartPoint[] };
    const latest = data[data.length - 1];
    const isPos = latest.price >= data[0].price;

    return (
      <div className="my-4 border border-gray-800 p-4 w-[600px] bg-black">
        <div className="flex justify-between mb-2 text-xs">
           <span className="font-bold text-white">PLOT :: {symbol}</span>
           <span className={isPos ? 'text-green-500' : 'text-red-500'}>
              {latest.price.toFixed(2)}
           </span>
        </div>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="time" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={isPos ? '#33ff33' : '#ff3333'} 
                strokeWidth={1} 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center text-[10px] text-gray-600 mt-1">
            --- END OF PLOT ---
        </div>
      </div>
    );
  }

  if (type === 'PREDICTION_REPORT') {
    const p = content as Prediction;
    const color = p.recommendation.includes('BUY') ? 'text-green-500' : p.recommendation.includes('SELL') ? 'text-red-500' : 'text-yellow-500';
    
    return (
      <div className="my-2 border-l-4 border-blue-500 pl-4 py-2 bg-gray-900/30 w-[600px]">
        <div className="font-bold text-white mb-2">>> ANALYSIS REPORT: {p.symbol}</div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500">RECOMMENDATION</div>
            <div className={`text-xl font-bold ${color}`}>{p.recommendation}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">TARGET (30d)</div>
            <div className="text-xl font-bold">₹{p.targetPrice.toFixed(2)}</div>
          </div>
        </div>

        <div className="mb-2">
            <span className="text-blue-400 font-bold">TECH: </span>
            <span className="text-gray-300">{p.technicalSummary}</span>
        </div>
        <div className="mb-4">
            <span className="text-blue-400 font-bold">NEWS: </span>
            <span className="text-gray-300">{p.newsSummary}</span>
        </div>

        <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
           CONFIDENCE SCORE: {p.confidence}%
        </div>
      </div>
    );
  }

  return null;
};
