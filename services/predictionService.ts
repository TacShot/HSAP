
import { GoogleGenAI, Type } from "@google/genai";
import { Stock, Prediction, ChartPoint } from '../types';

export const generatePrediction = async (stock: Stock, history: ChartPoint[], customApiKey?: string): Promise<Prediction> => {
  try {
    const ai = new GoogleGenAI({ apiKey: customApiKey || process.env.API_KEY });
    
    // Process historical data for the prompt (last 30 points)
    const recentHistory = history.slice(-30);
    const historyContext = recentHistory.length > 0 
      ? recentHistory.map(p => `[${p.time}: ₹${p.price.toFixed(2)}]`).join(', ')
      : 'No historical data available.';
      
    const trendSummary = recentHistory.length > 1
      ? `Start: ₹${recentHistory[0].price.toFixed(2)} -> End: ₹${recentHistory[recentHistory.length-1].price.toFixed(2)}`
      : 'N/A';

    const prompt = `
      Act as a senior financial analyst for the Indian Stock Market.
      Target Asset: ${stock.symbol}
      
      ## Technical Data
      Current Price: ₹${stock.price.toFixed(2)}
      Day Change: ${stock.percentChange.toFixed(2)}%
      Volume: ${stock.volume}
      
      ## Historical Price Action (Recent Trend)
      Movement: ${trendSummary}
      Data Points: ${historyContext}

      ## Task
      Use Google Search to find real-time information from Twitter, Reddit (r/IndianStreetBets), and financial news sources regarding:
      1. Recent market sentiment (bullish/bearish).
      2. Breaking news or rumors specific to ${stock.symbol}.
      3. Technical indicators based on the provided price history.
      
      Combine the provided TECHNICAL data (price history) with the live FUNDAMENTAL/SENTIMENT data (from search) to generate a trading recommendation.
      
      ## Output Format (JSON)
      Return a JSON object with:
      - targetPrice: Forecasted price for the next 30 days.
      - recommendation: STRONG BUY, BUY, HOLD, SELL, or STRONG SELL.
      - confidence: 0-100 score.
      - technicalSummary: Brief analysis of the provided price history (e.g. "Uptrend with recent consolidation").
      - newsSummary: Summary of the sentiment and news found via search.
      - news: List of 3 distinct news headlines/posts found (include source, headline, sentiment, and timestamp).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetPrice: { type: Type.NUMBER },
            recommendation: { 
              type: Type.STRING, 
              enum: ["STRONG BUY", "BUY", "HOLD", "SELL", "STRONG SELL"] 
            },
            confidence: { type: Type.INTEGER },
            technicalSummary: { type: Type.STRING },
            newsSummary: { type: Type.STRING },
            news: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  headline: { type: Type.STRING },
                  sentiment: { 
                    type: Type.STRING, 
                    enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] 
                  },
                  timestamp: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const data = JSON.parse(text);
    
    // Extract grounding URLs if available
    const groundingUrls: string[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          groundingUrls.push(chunk.web.uri);
        }
      });
    }

    return {
      symbol: stock.symbol,
      currentPrice: stock.price,
      targetPrice: data.targetPrice || stock.price,
      recommendation: data.recommendation || 'HOLD',
      confidence: data.confidence || 50,
      technicalSummary: data.technicalSummary || "Analysis unavailable.",
      newsSummary: data.newsSummary || "No recent news found.",
      news: data.news || [],
      groundingUrls: [...new Set(groundingUrls)], // Unique URLs
      generatedAt: new Date()
    };

  } catch (error) {
    console.error("Gemini Prediction Failed:", error);
    
    // Fallback for offline/error state
    return {
      symbol: stock.symbol,
      currentPrice: stock.price,
      targetPrice: stock.price,
      recommendation: 'HOLD',
      confidence: 0,
      technicalSummary: "AI Service Unavailable. Check API Connection.",
      newsSummary: "Could not retrieve live data.",
      news: [],
      generatedAt: new Date()
    };
  }
};
