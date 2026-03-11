import "server-only";
import { GoogleGenAI } from "@google/genai";

let genaiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genaiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genaiInstance = new GoogleGenAI({ apiKey });
  }
  return genaiInstance;
}

export interface GeminiScanOptions {
  imageBase64: string;
  mimeType: "image/jpeg" | "image/png";
}

/**
 * Send an image to Gemini 2.5 Flash and get structured JSON back.
 */
export async function scanTimesheetWithGemini(options: GeminiScanOptions): Promise<string> {
  // Mock mode for development without Gemini API key
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "mock") {
    if (process.env.NODE_ENV !== "production") {
      console.log("[DEV] Using mock Gemini response");
    }
    const { MOCK_SCAN_RESPONSE } = await import("./mock");
    return JSON.stringify(MOCK_SCAN_RESPONSE);
  }

  const { imageBase64, mimeType } = options;
  const genai = getGenAI();
  const { SCAN_TIMESHEET_PROMPT } = await import("./prompt");

  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: SCAN_TIMESHEET_PROMPT,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}
