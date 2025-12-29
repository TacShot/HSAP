
import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from '../types';

export const fetchRedditNews = async (symbol: string, apiKey?: string): Promise<NewsItem[]> => {
  try {
    const key = apiKey || process.env.API_KEY;
    if (!key) {
        console.warn("No API Key available for News");
        return [];
    }

    const ai = new GoogleGenAI({ apiKey: key });
    
    const prompt = `
      Find the 4 most recent and relevant Reddit discussions, posts, or news headlines regarding "${symbol}" or the Indian Stock Market.
      Prioritize recent discussions from subreddits like r/IndianStreetBets, r/IndiaInvestments, or r/StockMarketIndia.
      
      Return a JSON array of objects with:
      - source: The subreddit name (e.g. r/IndianStreetBets) or domain.
      - headline: The post title or short summary of the discussion.
      - sentiment: POSITIVE, NEGATIVE, or NEUTRAL based on the context.
      - timestamp: Relative time string (e.g. "2h ago", "Today", "Yesterday").
    `;

    // Create a promise that rejects after 8 seconds
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 8000);
    });

    const fetchPromise = ai.models.generateContent({
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
    });

    // Race the fetch against the timeout
    const response: any = await Promise.race([fetchPromise, timeoutPromise]);

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);

  } catch (error) {
    console.warn("News Fetch Error:", error);
    return [];
  }
};
