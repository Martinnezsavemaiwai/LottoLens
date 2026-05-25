import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_SYSTEM = "คุณเป็น Senior Data Scientist เชี่ยวชาญสถิติหวยไทย ตอบภาษาไทย กระชับ ตรงประเด็น ตอบเป็น JSON เท่านั้น";

let genAI = null;
let apiKey = null;

// เก็บชื่อโมเดลที่ทำงานได้ล่าสุดไว้ เพื่อใช้เป็นตัวแรกในรอบถัดไป (Auto-Select)
let activeModelName = "gemini-2.5-flash"; 

function getClient() {
  if (!genAI) {
    apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      throw new Error("VITE_GEMINI_API_KEY ยังไม่ได้ตั้งค่า — กรุณาเพิ่มใน .env");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// ลำดับความสำคัญของโมเดลที่จะใช้ (ตัวบนสุดดีที่สุด)
const PREFERRED_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-pro"
];

/**
 * เรียก Gemini โดยมีระบบ Auto Fallback วนหาโมเดลที่ใช้งานได้อัตโนมัติ
 */
export async function callGemini(prompt, systemInstruction) {
  const client = getClient();
  
  // นำ activeModelName มาไว้เป็นอันดับแรกสุดเสมอ 
  // ส่วนที่เหลือเรียงตาม PREFERRED_MODELS (ไม่ให้ซ้ำกับ activeModelName)
  const modelsToTry = [activeModelName, ...PREFERRED_MODELS.filter(m => m !== activeModelName)];

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelName = modelsToTry[i];
    try {
      const model = client.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction || DEFAULT_SYSTEM,
      });

      const result = await model.generateContent(prompt);
      
      // ถ้าดึงสำเร็จ ให้จำไว้เป็น Active Model จะได้ไม่ตัองวนหาใหม่
      if (activeModelName !== modelName) {
        console.log(`[Gemini] Successfully switched to working model: ${modelName}`);
        activeModelName = modelName;
      }
      return result.response.text();
      
    } catch (error) {
      console.error(`[Gemini] Model ${modelName} failed:`, error.message);
      
      const errorMsg = error?.message || "";
      
      // ตรวจสอบว่าเป็น Error ที่สมควรเปลี่ยนไปใช้ Model ถัดไปหรือไม่ (429, 503, 404, etc.)
      const isQuotaOrServerFail = 
        errorMsg.includes("429") || 
        errorMsg.includes("503") || 
        errorMsg.includes("404") || 
        errorMsg.includes("not found") || 
        errorMsg.includes("quota") ||
        errorMsg.includes("overloaded");
        
      if (isQuotaOrServerFail) {
        if (i < modelsToTry.length - 1) {
          console.warn(`[Gemini] Switching from ${modelName} to ${modelsToTry[i+1]}...`);
          continue; // ลูปไปลองรุ่นถัดไป
        } else {
          // หมดตัวเลือกแล้วใน Array
          return { error: "QUOTA_EXCEEDED", message: "ขออภัย โมเดล AI ทั้งหมดคิวเต็มหรือโควต้าหมด กรุณารอสักครู่แล้วลองใหม่" };
        }
      }
      
      // หากเป็น Error อย่างอื่น (เช่น prompt ผิดกฎ, context ไม่ผ่าน) ส่งกลับไปตรงๆ
      return { error: "GENERIC_ERROR", message: errorMsg };
    }
  }
}
