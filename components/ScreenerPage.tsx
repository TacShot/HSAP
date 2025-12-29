import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ScreenerResult, PendingAction } from '../types';

interface ScreenerPageProps {
  pendingAction?: PendingAction | null;
  onActionComplete?: () => void;
  apiKey?: string;
}

export const ScreenerPage: React.FC<ScreenerPageProps> = ({ pendingAction, onActionComplete, apiKey }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  // Handle Drag & Drop Action
  useEffect(() => {
    if (pendingAction?.type === 'FIND_SIMILAR' && pendingAction.symbol) {
      const newQuery = `Stocks with similar technical and fundamental profile to ${pendingAction.symbol}`;
      setQuery(newQuery);
      handleScreen(null, newQuery);
      if (onActionComplete) onActionComplete();
    }
  }, [pendingAction, onActionComplete]);

  const handleScreen = async (e: React.FormEvent | null, manualQuery?: string) => {
    if (e) e.preventDefault();
    const q = manualQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setResults([]);
    setLastQuery(q);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
      const prompt = `
        Act as a sophisticated stock screener for the Indian Stock Market (NSE).
        User Query: "${q}"

        Identify 5-8 stocks that fit this description based on fundamental or technical analysis.
        Since you cannot access a live database, generate realistic, representative data for companies that typically fit these criteria.
        
        Return a JSON list.
        - symbol: e.g., INF.NS
        - metric: A short string highlighting why it matches the query (e.g., "RSI: 28" or "PE: 15.2")
        - matchScore: A simulated relevance score (0-100)
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite-preview-02-05',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        symbol: { type: Type.STRING },
                        name: { type: Type.STRING },
                        sector: { type: Type.STRING },
                        price: { type: Type.NUMBER },
                        metric: { type: Type.STRING },
                        matchScore: { type: Type.INTEGER }
                    }
                }
            }
        }
      });
      
      const data = JSON.parse(response.text || "[]");
      setResults(data);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Oversold stocks with RSI < 30",
    "High dividend yield banking stocks",
    "Undervalued IT stocks with PE < 20",
    "Small cap stocks with breakout momentum"
  ];

  const handleDragStart = (e: React.DragEvent, symbol: string) => {
    e.dataTransfer.setData('symbol', symbol);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex-1 p-8 bg-[#0c0c0c] overflow-y-auto flex flex-col items-center font-vt323">
      <div className="max-w-5xl w-full space-y-8">
        
        {/* Header */}
        <div className="border-b border-gray-800 pb-4">
          <h2 className="text-3xl font-bold text-purple-400 mb-2">INTELLIGENT STOCK SCREENER</h2>
          <p className="text-gray-500 text-sm">NATURAL LANGUAGE QUERY ENGINE • POWERED BY GEMINI AI</p>
        </div>

        {/* Input Section */}
        <div className="bg-[#111] p-6 border border-gray-800 shadow-[0_0_30px_rgba(100,0,255,0.05)]">
          <form onSubmit={(e) => handleScreen(e)} className="flex gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-3 text-purple-500 font-bold">{'>'}</span>
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe the stocks you are looking for..."
                className="w-full bg-black border border-gray-700 p-3 pl-8 text-xl text-white focus:outline-none focus:border-purple-500 transition-colors placeholder-gray-700"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-purple-900/40 text-purple-300 border border-purple-600 px-8 font-bold hover:bg-purple-900/60 disabled:opacity-50 transition-all"
            >
              {loading ? 'RUNNING SCAN...' : 'SCAN MARKET'}
            </button>
          </form>

          {/* Suggestions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-gray-600 py-1">TRY:</span>
            {suggestions.map((s, i) => (
              <button 
                key={i} 
                onClick={() => { setQuery(s); handleScreen(null, s); }}
                className="text-xs bg-gray-900 text-gray-400 px-2 py-1 border border-gray-800 hover:text-white hover:border-gray-600"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        {results.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-end mb-2">
                <span className="text-gray-500 text-sm">QUERY RESULTS: "{lastQuery.toUpperCase()}"</span>
                <span className="text-green-500 text-xs">{results.length} MATCHES FOUND</span>
             </div>
             
             <div className="bg-[#111] border border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#1a1a1a] text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Symbol</th>
                      <th className="p-4">Company Name</th>
                      <th className="p-4">Sector</th>
                      <th className="p-4 text-right">Price (Est.)</th>
                      <th className="p-4 text-right">Key Metric</th>
                      <th className="p-4 text-right">Match Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900">
                    {results.map((r, i) => (
                      <tr 
                        key={i} 
                        draggable="true"
                        onDragStart={(e) => handleDragStart(e, r.symbol)}
                        className="hover:bg-gray-900/50 transition-colors group cursor-grab active:cursor-grabbing"
                      >
                        <td className="p-4 font-bold text-white font-mono">{r.symbol}</td>
                        <td className="p-4 text-gray-300">{r.name}</td>
                        <td className="p-4 text-gray-500 text-xs">{r.sector}</td>
                        <td className="p-4 text-right font-mono text-yellow-500">₹{r.price.toFixed(2)}</td>
                        <td className="p-4 text-right text-blue-400 font-bold">{r.metric}</td>
                        <td className="p-4 text-right">
                          <div className="inline-block w-24 bg-gray-800 h-2 ml-2 overflow-hidden">
                            <div 
                              className="h-full bg-purple-500" 
                              style={{ width: `${r.matchScore}%` }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="text-[10px] text-gray-600 mt-2 text-center">
                * DATA GENERATED BY AI MODEL. FOR EDUCATIONAL PURPOSES ONLY.
             </div>
          </div>
        )}
        
        {loading && (
          <div className="h-64 flex flex-col items-center justify-center text-purple-500 space-y-4">
             <div className="w-16 h-16 border-4 border-purple-900 border-t-purple-500 rounded-full animate-spin"></div>
             <div className="animate-pulse tracking-widest">ANALYZING MARKET DATA...</div>
          </div>
        )}

      </div>
    </div>
  );
};