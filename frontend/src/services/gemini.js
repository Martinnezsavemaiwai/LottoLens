/**
 * Gemini AI Service — แทนที่ callClaude ด้วย Google Generative AI
 * อ่าน API Key จาก import.meta.env.VITE_GEMINI_API_KEY
 * @module services/gemini
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_SYSTEM = "คุณเป็น Senior Data Scientist เชี่ยวชาญสถิติหวยไทย ตอบภาษาไทย กระชับ ตรงประเด็น ตอบเป็น JSON เท่านั้น";

let genAI = null;

function getClient() {
  if (!genAI) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      throw new Error("VITE_GEMINI_API_KEY ยังไม่ได้ตั้งค่า — กรุณาเพิ่มใน .env");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * เรียก Gemini 1.5 Pro สำหรับวิเคราะห์สถิติ
 * @param {string} prompt - Prompt ที่ต้องการส่ง
 * @param {string} [systemInstruction] - System instruction (optional)
 * @returns {Promise<string>} - ข้อความที่ Gemini ตอบกลับ
 */
export async function callGemini(prompt, systemInstruction) {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: "gemini-2.5-flash", // ใช้รุ่น Flash ที่เสถียร โควต้าสูง และทำงานเร็ว
      systemInstruction: systemInstruction || DEFAULT_SYSTEM,
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // Check for quota/rate limit errors (429)
    const errorMsg = error?.message || "";
    if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit exceeded")) {
      return { error: "QUOTA_EXCEEDED", message: "ขออภัย โควต้า AI ฟรีสำหรับรุ่นนี้เต็มแล้ว (Rate Limit Hit) กรุณารอสักครู่แล้วลองใหม่" };
    }
    
    return { error: "GENERIC_ERROR", message: errorMsg };
  }
}
