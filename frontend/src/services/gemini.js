import { fetchAIPrediction } from "./api";
import { getFriendlyErrorMessage } from "../utils/helpers";

const DEFAULT_SYSTEM = "Senior Data Scientist. Answer concisely and follow the requested output format.";

/**
 * Calls Gemini via the backend AI proxy.
 * @param {string} prompt
 * @param {string} systemInstruction
 * @param {Object} options
 * @returns {Object}
 */
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
    const rawError = error?.response?.data?.error || error?.message || "AI request failed";
    return {
      error: "AI_PROXY_ERROR",
      message: getFriendlyErrorMessage(rawError),
    };
  }
}
