import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from '../types';

export const fetchRedditNews = async (symbol: string, apiKey?: string): Promise<NewsItem[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
    
    const prompt = `
      Find the 4 most recent and relevant Reddit discussions, posts, or news headlines regarding "${symbol}" or the Indian Stock Market.
      Prioritize recent discussions from subreddits like r/IndianStreetBets, r/IndiaInvestments, or r/StockMarketIndia.
      
      Return a JSON array of objects with:
      - source: The subreddit name (e.g. r/IndianStreetBets) or domain.
      - headline: The post title or short summary of the discussion.
      - sentiment: POSITIVE, NEGATIVE, or NEUTRAL based on the context.
      - timestamp: Relative time string (e.g. "2h ago", "Today", "Yesterday").
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite-preview-02-05',
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

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text);

  } catch (error) {
    console.error("News Fetch Error:", error);
    // Return empty array on error to allow UI to handle it gracefully
    return [];
  }
};