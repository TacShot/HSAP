import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ChatMessage, PendingAction } from '../types';

const STORAGE_KEY = 'instock_chat_history';

interface AiAnalysisPageProps {
  pendingAction?: PendingAction | null;
  onActionComplete?: () => void;
  apiKey?: string;
}

export const AiAnalysisPage: React.FC<AiAnalysisPageProps> = ({ pendingAction, onActionComplete, apiKey }) => {
  // Initialize state from localStorage or use default
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Revive date strings to Date objects
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (e) {
      console.error("Failed to parse chat history", e);
    }
    return [{ 
      role: 'model', 
      text: 'Identity Verified. Connected to Gemini-2.5-Flash-Lite.\nHow can I assist with your market analysis today?', 
      timestamp: new Date() 
    }];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle Drag & Drop Action
  useEffect(() => {
    if (pendingAction?.type === 'ANALYZE' && pendingAction.symbol) {
      const symbol = pendingAction.symbol;
      const autoPrompt = `Provide a comprehensive technical and fundamental analysis for ${symbol}.`;
      handleSend(autoPrompt);
      if (onActionComplete) onActionComplete();
    }
  }, [pendingAction, onActionComplete]);

  const handleClearHistory = () => {
    const defaultMsg: ChatMessage = { 
      role: 'model', 
      text: 'Identity Verified. Connected to Gemini-2.5-Flash-Lite.\nHow can I assist with your market analysis today?', 
      timestamp: new Date() 
    };
    setMessages([defaultMsg]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleSend = async (manualInput?: string) => {
    const textToSend = manualInput || input;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    if (!manualInput) setInput('');
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
      // Create a prompt that includes context about the role
      const prompt = `
        You are an elite financial analyst in a terminal interface. 
        User Query: "${userMsg.text}"
        
        Provide a concise, data-driven response suitable for a trader. 
        Focus on Indian Markets (NSE/BSE).
        If asking about specific stocks, assume standard Indian tickers.
        Keep it professional, slightly technical, and under 150 words if possible.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite-preview-02-05',
        contents: prompt,
      });

      const text = response.text || "Connection interrupted. No data received.";
      
      setMessages(prev => [...prev, {
        role: 'model',
        text: text,
        timestamp: new Date()
      }]);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: "ERROR: UPLINK_FAILED. Unable to reach AI subsystem.",
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050505] p-4 max-w-4xl mx-auto w-full">
      <div className="border border-green-900/50 bg-[#0c0c0c] flex-1 flex flex-col shadow-[0_0_30px_rgba(0,50,0,0.1)]">
        {/* Chat Header */}
        <div className="bg-green-900/10 border-b border-green-900/30 p-3 flex justify-between items-center">
            <span className="text-green-500 font-bold tracking-wider">:: AI_MARKET_ANALYST_LINK</span>
            <div className="flex items-center gap-4">
                <button 
                  onClick={handleClearHistory}
                  className="text-[10px] text-red-400 hover:text-red-300 border border-red-900/50 px-2 py-0.5 hover:bg-red-900/20 transition-colors uppercase tracking-wider"
                  title="Reset conversation and clear local history"
                >
                  Clear Logs
                </button>
                <div className="flex gap-2 text-[10px] text-green-700">
                    <span>ENCRYPTED</span>
                    <span className="animate-pulse">● LIVE</span>
                </div>
            </div>
        </div>

        {/* Messages Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 border ${
                msg.role === 'user' 
                  ? 'border-blue-900 bg-blue-900/10 text-blue-100 rounded-bl-lg' 
                  : 'border-green-900 bg-green-900/10 text-green-100 rounded-br-lg'
              }`}>
                <div className="text-[10px] opacity-50 mb-1 font-mono uppercase">
                  {msg.role === 'user' ? 'TRADER' : 'SYSTEM'} • {msg.timestamp.toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
             <div className="flex justify-start">
               <div className="bg-green-900/10 border border-green-900 p-2 text-green-500 text-xs animate-pulse">
                 ANALYZING...
               </div>
             </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-800 bg-[#111]">
          <div className="flex gap-2">
            <span className="text-green-500 pt-2">{'>'}</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask about market trends, specific tickers, or sector analysis..."
              className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none resize-none h-10 py-2 custom-scrollbar"
            />
            <button 
              onClick={() => handleSend()}
              disabled={isTyping || !input.trim()}
              className="px-4 py-1 bg-green-900 text-green-100 text-xs hover:bg-green-800 disabled:opacity-50 border border-green-700"
            >
              TRANSMIT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};