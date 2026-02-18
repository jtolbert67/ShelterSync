
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function improveBio(currentBio: string, name: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a social worker at a shelter. Improve the following resident profile bio to be professional, empathetic, and concise. 
      Resident Name: ${name}
      Current Bio: ${currentBio}
      Return only the improved bio text.`,
    });
    return response.text?.trim() || currentBio;
  } catch (error) {
    console.error("Gemini Error:", error);
    return currentBio;
  }
}
