
import { Order, Product, Member, Coupon, StoreConfig, User, Role } from "../types";

export type SyncAction = 'ADD_ORDER' | 'UPDATE_STOCK' | 'SYNC_ALL' | 'DELETE_ORDER';

export const syncToGoogleSheet = async (
  action: SyncAction, 
  data: any, 
  scriptUrl: string,
  allProducts?: Product[]
): Promise<boolean> => {
  if (!scriptUrl) return false;

  try {
    const payload = JSON.stringify({
      action,
      timestamp: new Date().toISOString(),
      data,
      allProducts: allProducts
    });

    await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    });

    return true;
  } catch (error) {
    console.error(`Cloud Sync Error (${action}):`, error);
    return false;
  }
};

export const fetchFromCloud = async (scriptUrl: string): Promise<any> => {
  if (!scriptUrl) return null;
  try {
    const response = await fetch(scriptUrl);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error("Fetch from Cloud Error:", error);
    return null;
  }
};
