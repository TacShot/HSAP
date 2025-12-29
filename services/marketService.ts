
import { GoogleGenAI, Type } from "@google/genai";
import { MarketAsset } from '../types';

// Hardcoded lists for instant load on tabs
const STOCK_SYMBOLS = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ITC.NS', 'TATAMOTORS.NS', 'ADANIENT.NS'];
const ETF_SYMBOLS = ['NIFTYBEES.NS', 'GOLDBEES.NS', 'SILVERBEES.NS', 'MON100.NS'];
const MF_SYMBOLS_MAP: Record<string, string> = {
    'HDFC Top 100': '0P0000XW8F.BO',
    'SBI Small Cap': '0P0000XVTR.BO', 
};

/**
 * Search for assets using Gemini with Google Search Grounding.
 * This ensures we get real traded symbols from Google Finance.
 */
export async function searchAssets(query: string): Promise<MarketAsset[]> {
    if (!query || query.length < 2) return [];

    try {
        console.log(`[MarketService] AI Searching for: ${query}`);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
            Find the top 5 most relevant tradable stocks/ETFs for "${query}" on Indian Markets (NSE/BSE).
            Use Google Search to find the exact Ticker Symbol used on Google Finance (usually ends in .NS or .BO).
            
            Return a pure JSON array.
            Schema:
            [{
                "symbol": "TATASTEEL.NS",
                "name": "Tata Steel Ltd",
                "category": "STOCK" (or ETF),
                "price": 150.0 (approximate price)
            }]
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            symbol: { type: Type.STRING },
                            name: { type: Type.STRING },
                            category: { type: Type.STRING, enum: ['STOCK', 'ETF', 'MF'] },
                            price: { type: Type.NUMBER }
                        }
                    }
                }
            }
        });

        const data = JSON.parse(response.text || "[]");
        
        return data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name,
            price: item.price,
            change: 0, 
            category: item.category,
            tags: ['GOOGLE_FINANCE', 'NSE']
        }));

    } catch (e) {
        console.error("AI Search Failed", e);
        return [];
    }
}

// Helpers for the "Browse" tabs
// In a full implementation, these would also fetch simulated/real data
// For now, we return static lists to keep the "Browsing" fast.

export const getStocks = async (): Promise<MarketAsset[]> => {
    return STOCK_SYMBOLS.map(s => ({
        symbol: s, name: s.replace('.NS',''), price: 0, change: 0, category: 'STOCK', tags: ['Nifty 50']
    }));
};

export const getETFs = async (): Promise<MarketAsset[]> => {
    return ETF_SYMBOLS.map(s => ({
        symbol: s, name: s.replace('.NS',''), price: 0, change: 0, category: 'ETF', tags: ['ETF']
    }));
};

export const getMutualFunds = async (): Promise<MarketAsset[]> => {
    return Object.entries(MF_SYMBOLS_MAP).map(([name, sym]) => ({
        symbol: sym, name: name, price: 0, change: 0, category: 'MF', tags: ['Mutual Fund']
    }));
};

export const getDerivatives = async (): Promise<MarketAsset[]> => {
    return [
        { symbol: 'NIFTY-FUT', name: 'NIFTY 50 FUT', price: 0, change: 0, category: 'F&O', tags: ['Index Future'] }
    ];
};
