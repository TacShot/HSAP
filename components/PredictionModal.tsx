import React from 'react';
import { Prediction } from '../types';

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prediction: Prediction | null;
  loading: boolean;
  symbol: string;
}

export const PredictionModal: React.FC<PredictionModalProps> = ({ 
  isOpen, onClose, prediction, loading, symbol 
}) => {
  if (!isOpen) return null;

  const getRecColor = (rec: string) => {
    if (rec.includes('BUY')) return 'text-green-500';
    if (rec.includes('SELL')) return 'text-red-500';
    return 'text-yellow-500';
  };

  return (
    <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-black border border-green-500 p-1 w-[700px] shadow-[0_0_20px_rgba(0,255,0,0.2)]" 
        onClick={e => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="bg-green-900/20 text-green-500 px-2 py-1 border-b border-green-500 flex justify-between font-bold">
          <span>AI_PREDICTOR_V2.0 :: {symbol}</span>
          <span>[ESC] CLOSE</span>
        </div>

        <div className="p-6 font-mono min-h-[400px] max-h-[80vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-green-500 animate-pulse text-xl">INITIALIZING GEMINI-2.5-FLASH-LITE...</div>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Connecting to Global Markets...</p>
                <p>Scraping Reddit & Twitter Streams...</p>
                <p>Analyzing Financial News...</p>
                <p>Synthesizing Prediction...</p>
              </div>
              <div className="w-full bg-gray-900 h-2 mt-8 border border-gray-700">
                <div className="h-full bg-green-500 animate-[width_2s_ease-in-out_infinite]" style={{width: '60%'}}></div>
              </div>
            </div>
          ) : prediction ? (
            <div className="space-y-6">
              
              {/* Top Section: Rec & Target */}
              <div className="grid grid-cols-2 gap-8 border-b border-gray-800 pb-6">
                <div>
                  <div className="text-gray-500 text-sm mb-1">RECOMMENDATION</div>
                  <div className={`text-4xl font-bold tracking-tighter ${getRecColor(prediction.recommendation)}`}>
                    {prediction.recommendation}
                  </div>
                  <div className="text-xs text-green-700 mt-1">CONFIDENCE: {prediction.confidence}%</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-500 text-sm mb-1">TARGET PRICE (30d)</div>
                  <div className="text-3xl text-white font-bold">₹{prediction.targetPrice.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    CURRENT: ₹{prediction.currentPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Middle Section: Analysis */}
              <div className="space-y-4">
                <div>
                  <div className="text-blue-400 font-bold mb-1">> TECHNICAL_ANALYSIS</div>
                  <p className="text-gray-300 text-sm pl-4 border-l-2 border-gray-800">
                    {prediction.technicalSummary}
                  </p>
                </div>
                <div>
                  <div className="text-blue-400 font-bold mb-1">> MARKET_SENTIMENT</div>
                  <p className="text-gray-300 text-sm pl-4 border-l-2 border-gray-800">
                    {prediction.newsSummary}
                  </p>
                </div>
              </div>

              {/* News Feed */}
              {prediction.news && prediction.news.length > 0 && (
                <div>
                  <div className="text-gray-500 text-xs mb-2 border-b border-gray-900 pb-1">HIGHLIGHTS</div>
                  <ul className="space-y-2">
                    {prediction.news.map((n, i) => (
                      <li key={i} className="flex justify-between text-sm group">
                        <span className="text-gray-400 group-hover:text-white transition-colors">
                          <span className="text-blue-500 mr-2">[{n.source}]</span> 
                          {n.headline}
                        </span>
                        <span className={n.sentiment === 'POSITIVE' ? 'text-green-600' : n.sentiment === 'NEGATIVE' ? 'text-red-600' : 'text-gray-500'}>
                          {n.sentiment.substring(0, 3)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grounding Sources */}
              {prediction.groundingUrls && prediction.groundingUrls.length > 0 && (
                 <div className="mt-4 pt-2 border-t border-gray-800">
                    <div className="text-[10px] text-gray-500 mb-1">DATA SOURCES (VERIFIED):</div>
                    <div className="flex flex-wrap gap-2">
                       {prediction.groundingUrls.map((url, i) => (
                          <a 
                            key={i} 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-blue-900 bg-blue-900/20 px-1 hover:text-blue-400 hover:underline truncate max-w-[200px]"
                          >
                             {new URL(url).hostname}
                          </a>
                       ))}
                    </div>
                 </div>
              )}
              
              <div className="text-right text-[10px] text-gray-700 mt-4">
                POWERED BY GEMINI-2.5-FLASH-LITE • {prediction.generatedAt.toLocaleTimeString()}
              </div>

            </div>
          ) : (
             <div className="text-red-500 p-4 border border-red-900 bg-red-900/10">
                ERROR: UNABLE TO GENERATE PREDICTION.<br/>
                PLEASE CHECK YOUR NETWORK CONNECTION OR API QUOTA.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};