import { GoogleGenAI } from "@google/genai";
import { Product, DashboardStats } from "../types";

// Helper to get the AI instance
const getAiInstance = (customKey?: string) => {
  const key = customKey || process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

export const generateLocalSalesInsight = (stats: DashboardStats): string => {
  if (!stats || stats.todaySales === 0) {
    return "ยินดีต้อนรับสู่ระบบ DBS POS ยอดขายวันนี้พร้อมเริ่มบันทึกแล้ว ขอให้เป็นการเริ่มต้นวันที่ยอดเยี่ยมและค้าขายคล่องตัว!";
  }
  const topItem = stats.topProducts?.[0]?.name ? ` โดยมีสินค้าขายดีคือ "${stats.topProducts[0].name}"` : '';
  const profitText = stats.todayProfit > 0 ? ` สร้างกำไรสุทธิ ${stats.todayProfit.toLocaleString()} บาท` : '';
  return `วันนี้มียอดขายรวม ${stats.todaySales.toLocaleString()} บาท จาก ${stats.orderCount} รายการ${profitText}${topItem} ภาพรวมการขายคล่องตัว ขอให้ยอดปังต่อเนื่องตลอดวัน!`;
};

const handleGeminiError = (error: any, fallbackStats?: DashboardStats): string => {
  const errorMsg = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  const errorStr = (JSON.stringify(error) || "") + " " + errorMsg;
  
  if (
    errorStr.includes("403") || 
    errorStr.includes("PERMISSION_DENIED") ||
    (error && error.error && error.error.code === 403)
  ) {
    console.warn("Gemini API notice: Key is missing or does not have permission, falling back to smart local insight.");
    return fallbackStats ? generateLocalSalesInsight(fallbackStats) : "พร้อมใช้งาน (สามารถเพิ่ม Gemini API Key ในเมนูตั้งค่าเพื่อเปิดใช้งานการวิเคราะห์ขั้นสูง)";
  }

  if (
    errorStr.includes("429") || 
    errorStr.includes("RESOURCE_EXHAUSTED") || 
    (error && error.error && error.error.code === 429)
  ) {
    return fallbackStats ? generateLocalSalesInsight(fallbackStats) : "ขออภัย โควตาการใช้งาน AI เต็มชั่วคราว กรุณารอสักครู่หรือเปลี่ยนไปใช้ API Key อื่น";
  }

  console.warn("Gemini Notice:", errorMsg);
  return fallbackStats ? generateLocalSalesInsight(fallbackStats) : "สามารถเปิดใช้งานฟีเจอร์ AI ได้โดยเพิ่ม Gemini API Key ในการตั้งค่า";
};

export const generateProductDescription = async (name: string, category: string, apiKey?: string): Promise<string> => {
  const ai = getAiInstance(apiKey);
  if (!ai) return "สินค้าคุณภาพดี คัดสรรมาเพื่อความคุ้มค่าและความพึงพอใจของลูกค้า";
  
  try {
    const prompt = `เขียนคำโฆษณาสั้นๆ ดึงดูดใจ เป็นภาษาไทย 1 ประโยค สำหรับสินค้าชื่อ "${name}" ในหมวดหมู่ "${category}" ความยาวไม่เกิน 20 คำ`;
    
    // Use gemini-3.8-flash for basic text tasks per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    
    return response.text?.trim() || "สินค้าคุณภาพดี คัดสรรมาเพื่อความคุ้มค่าและความพึงพอใจของลูกค้า";
  } catch (error) {
    return handleGeminiError(error);
  }
};

export const analyzeSalesData = async (stats: DashboardStats, recentOrdersCount: number, apiKey?: string): Promise<string> => {
  const ai = getAiInstance(apiKey);
  if (!ai) {
    return generateLocalSalesInsight(stats);
  }

  try {
    const prompt = `
      วิเคราะห์ข้อมูลการขายของร้านค้าสำหรับวันนี้:
      - ยอดขายรวม: ${stats.todaySales} บาท
      - จำนวนออเดอร์: ${stats.orderCount} รายการ
      - กำไรวันนี้: ${stats.todayProfit} บาท
      - สินค้าใกล้หมด: ${stats.lowStockCount} รายการ
      - สินค้าขายดี: ${stats.topProducts?.[0]?.name || 'ยังไม่มีข้อมูล'}
      
      ช่วยเขียนสรุปสั้นๆ และข้อแนะนำหรือคำให้กำลังใจเจ้าของร้านเป็นภาษาไทย ความยาวไม่เกิน 2 ประโยค
    `;

    // Use gemini-3.8-flash for summarization and reasoning tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return response.text?.trim() || generateLocalSalesInsight(stats);
  } catch (error) {
    return handleGeminiError(error, stats);
  }
};
