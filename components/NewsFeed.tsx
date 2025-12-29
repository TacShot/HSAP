import React, { useEffect, useState } from 'react';
import { NewsItem } from '../types';
import { fetchRedditNews } from '../services/newsService';

interface NewsFeedProps {
  symbol: string;
  apiKey?: string;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ symbol, apiKey }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSymbol, setLastSymbol] = useState('');

  useEffect(() => {
    if (symbol === lastSymbol) return;
    
    let isMounted = true;
    const loadNews = async () => {
      setLoading(true);
      setNews([]); // Clear previous news immediately
      
      // Simulate a small delay for the "searching" effect or network lag
      await new Promise(r => setTimeout(r, 500));
      
      const data = await fetchRedditNews(symbol, apiKey);
      
      if (isMounted) {
        setNews(data);
        setLoading(false);
        setLastSymbol(symbol);
      }
    };

    loadNews();

    return () => {
      isMounted = false;
    };
  }, [symbol, lastSymbol, apiKey]);

  const getSentimentConfig = (sentiment: string) => {
    switch (sentiment) {
      case 'POSITIVE': 
        return { 
            color: 'text-green-500', 
            icon: '▲', 
            label: 'BULLISH',
            border: 'border-green-900',
            bg: 'bg-green-900/10'
        };
      case 'NEGATIVE': 
        return { 
            color: 'text-red-500', 
            icon: '▼', 
            label: 'BEARISH',
            border: 'border-red-900',
            bg: 'bg-red-900/10'
        };
      default: 
        return { 
            color: 'text-gray-500', 
            icon: '●', 
            label: 'NEUTRAL',
            border: 'border-gray-800',
            bg: 'bg-gray-900/20'
        };
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0c0c0c] font-vt323">
      {/* Header */}
      <div className="px-4 py-1 bg-[#1a1a1a] border-b border-gray-800 flex justify-between items-center text-xs select-none">
        <div className="flex gap-2 items-center">
             <span className="font-bold text-orange-400">NEWS_FEED :: REDDIT_UPLINK</span>
             {loading && <span className="text-orange-400 animate-pulse">Scanning...</span>}
        </div>
        <div className="text-gray-600">SOURCE: r/IndianStreetBets + WEB</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {loading && news.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2">
            <span className="animate-spin text-orange-500 text-xl">↻</span>
            <span className="text-xs">ESTABLISHING DATA LINK...</span>
          </div>
        ) : news.length > 0 ? (
          <div className="space-y-3">
            {news.map((item, index) => {
              const config = getSentimentConfig(item.sentiment);
              
              return (
              <div key={index} className={`group border-l-2 ${config.border} pl-2 py-2 hover:bg-[#111] transition-colors border-b border-gray-900/30`}>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-blue-400 font-bold">[{item.source}]</span>
                  <span className="text--[10px] text-gray-500">{item.timestamp}</span>
                </div>
                <div className="text-sm text-gray-300 leading-tight mb-2 group-hover:text-white">
                  {item.headline}
                </div>
                <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 ${config.bg} ${config.color}`}>
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                    </span>
                    <span className="text-[10px] text-gray-700 group-hover:text-gray-500 cursor-pointer">
                        OPEN THREAD {'>'}
                    </span>
                </div>
              </div>
            )})}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm">
            NO RECENT DISCUSSIONS FOUND
          </div>
        )}
      </div>
    </div>
  );
};