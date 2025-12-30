
import { GoogleGenAI, Type } from "@google/genai";
import { Mission } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateMission = async (level: number): Promise<Mission> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a cyberpunk zombie survival mission for level ${level}. The tone should be gritty and high-stakes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            objectives: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            difficulty: { type: Type.STRING, enum: ['Low', 'Medium', 'High', 'EXTREME'] },
            reward: { type: Type.NUMBER }
          },
          required: ["title", "description", "objectives", "difficulty", "reward"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');
    return {
      id: Math.random().toString(36).substr(2, 9),
      title: data.title || "Operation Deadlight",
      description: data.description || "The sector has gone dark. Clear the hostiles.",
      objectives: data.objectives || ["Survive the wave"],
      difficulty: data.difficulty || "Medium",
      reward: data.reward || 100
    };
  } catch (error) {
    console.error("Failed to generate mission:", error);
    return {
      id: "fallback",
      title: "Sector Purge",
      description: "Emergency protocol active. Neutralize all biological threats in the vicinity.",
      objectives: ["Survive the wave"],
      difficulty: "Medium",
      reward: 50 * level
    };
  }
};
