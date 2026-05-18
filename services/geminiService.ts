
import { GoogleGenAI } from "@google/genai";
import { Product, DashboardStats } from "../types";

// Helper to get the AI instance
const getAiInstance = (customKey?: string) => {
  const key = customKey || process.env.API_KEY || '';
  if (!key) return null;
  // Initialize GoogleGenAI with a named parameter as required.
  return new GoogleGenAI({ apiKey: key });
};

const handleGeminiError = (error: any): string => {
  console.error("Gemini Error:", error);
  const errorStr = JSON.stringify(error);
  if (
    errorStr.includes("429") || 
    errorStr.includes("RESOURCE_EXHAUSTED") || 
    (error && error.error && error.error.code === 429)
  ) {
    return "ขออภัย โควตาการใช้งาน AI เต็มแล้ว (Quota Exhausted) กรุณารอสักครู่หรือเปลี่ยนไปใช้ API Key อื่น";
  }
  return "เกิดข้อผิดพลาดในการประมวลผล (ตรวจสอบ API Key และการเชื่อมต่อ)";
};

export const generateProductDescription = async (name: string, category: string, apiKey?: string): Promise<string> => {
  const ai = getAiInstance(apiKey);
  if (!ai) return "ปิดการใช้งานฟีเจอร์ AI (ไม่พบ API Key)";
  
  try {
    const prompt = `เขียนคำโฆษณาสั้นๆ ดึงดูดใจ เป็นภาษาไทย 1 ประโยค สำหรับสินค้าชื่อ "${name}" ในหมวดหมู่ "${category}" ความยาวไม่เกิน 20 คำ`;
    
    // Always use gemini-3-flash-preview for basic text tasks and simple Q&A.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // Use the .text property to get the generated content (not a function).
    return response.text?.trim() || "ไม่สามารถสร้างคำบรรยายได้";
  } catch (error) {
    return handleGeminiError(error);
  }
};

export const analyzeSalesData = async (stats: DashboardStats, recentOrdersCount: number, apiKey?: string): Promise<string> => {
  const ai = getAiInstance(apiKey);
  if (!ai) return "กรุณาใส่ API Key ในการตั้งค่าเพื่อใช้งานฟีเจอร์วิเคราะห์ยอดขาย";

  try {
    const prompt = `
      วิเคราะห์ข้อมูลการขายของร้านค้าปลีกสำหรับวันนี้:
      - ยอดขายรวม: ${stats.todaySales} หน่วย
      - จำนวนออเดอร์: ${stats.orderCount}
      - สินค้าใกล้หมด: ${stats.lowStockCount}
      - สินค้าขายดีอันดับ 1: ${stats.topProducts[0]?.name || 'ไม่มีข้อมูล'}
      
      ช่วยเขียนสรุปสั้นๆ และข้อแนะนำหรือคำให้กำลังใจเจ้าของร้านเป็นภาษาไทย ความยาวไม่เกิน 2 ประโยค
    `;

    // Use gemini-3-flash-preview for summarization and reasoning tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Accessing text as a property directly from the response.
    return response.text?.trim() || "ยอดเยี่ยม! ข้อมูลการขายวันนี้ดูดีมาก";
  } catch (error) {
    return handleGeminiError(error);
  }
};
