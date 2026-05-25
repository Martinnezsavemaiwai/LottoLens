import { fetchAIPrediction } from "./api";

const DEFAULT_SYSTEM = "Senior Data Scientist. Answer concisely and follow the requested output format.";

export async function callGemini(prompt, systemInstruction, options = {}) {
  try {
    const response = await fetchAIPrediction({
      prizeType: options.prizeType || "back2",
      limit: options.limit || 4,
      prompt,
      systemInstruction: systemInstruction || DEFAULT_SYSTEM,
    });
    return response.prediction;
  } catch (error) {
    return {
      error: "AI_PROXY_ERROR",
      message: error?.response?.data?.error || error?.message || "AI request failed",
    };
  }
}
