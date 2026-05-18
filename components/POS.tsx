
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, CartItem, Order, Member, PaymentMethodType } from '../types';
import { Search, Trash2, Plus, Minus, CreditCard, Banknote, X, Printer, CheckCircle, ShoppingCart, ScanLine, TicketPercent, User, UserPlus, Gift, Link, Divide, Bell, Camera, Tag, Coins, Stamp, QrCode, Landmark, Wallet, Mic, MicOff, Volume2, Info, Sparkles, Loader2, VolumeX, Delete, Copy, Radio, Filter, Layers, AlertTriangle } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Html5Qrcode } from 'html5-qrcode';

// --- Audio Helpers ---
function decode(base64: string) {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    return new Uint8Array(0);
  }
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const POS: React.FC = () => {
  const { products, addOrder, storeConfig, orders } = useStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const cartRef = useRef<CartItem[]>([]);
  const productsRef = useRef<Product[]>(products);
  
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ทั้งหมด');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [cashReceivedStr, setCashReceivedStr] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  
  // Barcode Scanner (Camera) State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCode = useRef<string | null>(null);
  const lastScannedTime = useRef<number>(0);

  // Hardware Barcode Scanner (HID Keyboard) Support
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  // Voice AI States
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [voiceLastAction, setVoiceLastAction] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState(0);
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(true);

  // Refs
  const isTransitioningRef = useRef(false);
  const isVoiceActiveRef = useRef(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const talkingTimeoutRef = useRef<any>(null);
  const connectionTimeoutRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['ทั้งหมด', ...Array.from(cats)];
  }, [products]);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity + quantity > product.stock) {
          setVoiceLastAction(`สินค้า ${product.name} ในสต็อกไม่พอ`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      if (quantity > product.stock) {
        setVoiceLastAction(`สินค้า ${product.name} หมดสต็อก`);
        return prev;
      }
      return [...prev, { ...product, quantity }];
    });
    setVoiceLastAction(`เพิ่ม ${product.name} x${quantity}`);
    setTimeout(() => setVoiceLastAction(null), 4000);
  }, []);

  // --- Hardware Barcode Scanner (Global Listener) ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if currently typing in an input that's not the search box
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (target.id !== 'pos-search-input') return;
      }

      const now = Date.now();
      // Most scanners act as a keyboard. If keys are pressed very fast, it's a scanner.
      // If time since last key is > 50ms, we assume it's a new scan or manual typing.
      if (now - lastKeyTime.current > 50) {
        barcodeBuffer.current = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 2) {
          const code = barcodeBuffer.current.trim();
          const product = productsRef.current.find(p => p.barcode?.trim() === code);
          if (product) {
            addToCart(product);
            barcodeBuffer.current = '';
            setSearchQuery('');
            e.preventDefault();
          }
        }
        barcodeBuffer.current = '';
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
      lastKeyTime.current = now;
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [addToCart]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = searchQuery.trim();
      const product = products.find(p => p.barcode?.trim() === code);
      if (product) {
        addToCart(product);
        setSearchQuery('');
        e.preventDefault();
      }
    }
  };

  // --- Barcode Scanner Logic (Camera) ---
  const startScanner = async () => {
    setIsScannerOpen(true);
    lastScannedCode.current = null;
    lastScannedTime.current = 0;

    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode("scanner-container");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            const now = Date.now();
            const code = decodedText.trim();
            
            if (code === lastScannedCode.current && (now - lastScannedTime.current) < 2000) {
              return;
            }

            const product = productsRef.current.find(p => p.barcode?.trim() === code);
            
            if (product) {
              lastScannedCode.current = code;
              lastScannedTime.current = now;
              addToCart(product);
              if ('vibrate' in navigator) navigator.vibrate(100);
              setVoiceLastAction(`สแกนพบ: ${product.name}`);
              setTimeout(() => setVoiceLastAction(null), 2000);
            } else {
              if (code !== lastScannedCode.current) {
                lastScannedCode.current = code;
                lastScannedTime.current = now;
                setVoiceLastAction(`ไม่พบสินค้าบาร์โค้ด: ${code}`);
                setTimeout(() => setVoiceLastAction(null), 2000);
              }
            }
          },
          () => {}
        );
      } catch (err) {
        setIsScannerOpen(false);
      }
    }, 400);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (e) {}
    }
    setIsScannerOpen(false);
  };

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter(i => i.id !== id);
      if (newQty > item.stock) return prev;
      return prev.map(i => i.id === id ? { ...i, quantity: newQty } : i);
    });
  }, []);

  const finalizeOrder = useCallback((pMethod: PaymentMethodType = 'cash', pReceived?: number) => {
    const currentCart = cartRef.current;
    if (currentCart.length === 0) return { total: 0, received: 0, change: 0, items: [] };
    const finalSubtotal = currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const received = pReceived !== undefined ? pReceived : finalSubtotal;
    const finalChange = Math.max(0, received - finalSubtotal);

    const newOrder: Order = {
      id: Date.now().toString(),
      items: [...currentCart],
      subtotal: finalSubtotal,
      discount: 0,
      discountType: 'percent' as const,
      total: finalSubtotal,
      paymentMethod: pMethod,
      timestamp: new Date().toISOString(),
      cashReceived: received,
      change: finalChange,
      status: storeConfig.queueEnabled ? 'preparing' : 'completed',
      queueNumber: storeConfig.queueEnabled ? orders.length + 1 : undefined
    };

    addOrder(newOrder);
    setCompletedOrder(newOrder);
    setCart([]);
    setIsCheckoutOpen(true);
    
    return { 
      total: finalSubtotal, 
      received, 
      change: finalChange, 
      items: newOrder.items.map(i => `${i.name} ${i.quantity} ชิ้น`)
    };
  }, [addOrder, orders.length, storeConfig.queueEnabled]);

  const stopVoiceSession = useCallback(async () => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    isVoiceActiveRef.current = false;
    setIsVoiceActive(false);
    setIsConnecting(false);
    setIsTalking(false);
    isTransitioningRef.current = false;
    setMicVolume(0);
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      micStreamRef.current = null;
    }

    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
      sessionRef.current = null;
    }
    
    if (inputContextRef.current) {
      try { await inputContextRef.current.close(); } catch(e) {}
      inputContextRef.current = null;
    }
    
    setVoiceLastAction(null);
    setIsWaitingForWakeWord(true);

    setTimeout(() => {
      if (recognitionRef.current && !isVoiceActiveRef.current && !isTransitioningRef.current) {
        setupRecognitionHandlers(recognitionRef.current);
        try { recognitionRef.current.start(); } catch (e) {}
      }
    }, 1500);
  }, []);

  const setupRecognitionHandlers = (recognition: any) => {
    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const text = e.results[i][0].transcript.trim().toLowerCase();
        if ((text.includes("ใช้คำสั่งเสียง") || text.includes("ใช้คําสั่งเสียง")) && !isVoiceActiveRef.current && !isTransitioningRef.current) {
           startVoiceSession();
           break;
        }
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error !== 'not-allowed') {
        setTimeout(() => {
          if (!isVoiceActiveRef.current && !isTransitioningRef.current) {
            try { recognition.start(); } catch (err) {}
          }
        }, 2000);
      }
    };
    recognition.onend = () => {
      if (!isVoiceActiveRef.current && !isTransitioningRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch (err) {}
        }, 1200);
      }
    };
  };

  const startVoiceSession = async () => {
    if (isVoiceActiveRef.current || isTransitioningRef.current) return;
    
    isTransitioningRef.current = true;
    isVoiceActiveRef.current = true; 
    setIsConnecting(true);
    setIsVoiceActive(true);
    setIsWaitingForWakeWord(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.stop();
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        console.warn("Recognition release fail:", e);
      }
    }

    connectionTimeoutRef.current = setTimeout(() => {
      if (isConnecting && isVoiceActiveRef.current) {
        setVoiceLastAction("การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่");
        stopVoiceSession();
      }
    }, 20000);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const outCtx = audioContextRef.current;
      if (outCtx.state === 'suspended') await outCtx.resume();

      const inCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputContextRef.current = inCtx;

      const productListString = productsRef.current.map(p => `- ${p.name} (ราคา ${p.price} บาท)`).join('\n');
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
            setIsConnecting(false);
            isTransitioningRef.current = false;
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'addToCartByName') {
                  const { productName, quantity } = fc.args as any;
                  const found = productsRef.current.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
                  if (found) {
                    addToCart(found, quantity || 1);
                    sessionPromise.then(s => s.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: `เพิ่มสำเร็จ` } }
                    }));
                  } else {
                    sessionPromise.then(s => s.sendToolResponse({
                      functionResponses: { id: fc.id, name: fc.name, response: { result: "ไม่พบสินค้า" } }
                    }));
                  }
                } else if (fc.name === 'processCheckout') {
                  const { cashReceived, paymentMethod: pMethod } = fc.args as any;
                  setPaymentMethod(pMethod);
                  const result = finalizeOrder(pMethod, cashReceived);
                  const summaryText = `ชำระเงินเรียบร้อยครับ รายการสินค้าคือ: ${result.items.join(', ')} ยอดรวมทั้งสิ้น ${result.total} บาท รับเงินมา ${result.received} บาท และเงินทอนของคุณคือ ${result.change} บาทครับ ขอบคุณที่ใช้บริการโนว่านะครับ`;
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: summaryText } }
                  }));
                } else if (fc.name === 'closeMic') {
                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "ปิดไมค์สำเร็จ" } }
                  }));
                  setTimeout(stopVoiceSession, 1200);
                }
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outCtx.state !== 'closed') {
              setIsTalking(true);
              if (talkingTimeoutRef.current) clearTimeout(talkingTimeoutRef.current);

              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outCtx.destination);
              source.onended = () => {
                talkingTimeoutRef.current = setTimeout(() => setIsTalking(false), 400);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
            }
          },
          onclose: (e) => {
            console.log("Session closed", e);
            if (isVoiceActiveRef.current) stopVoiceSession();
          },
          onerror: (err: any) => {
            console.error("Nova Session Error:", err);
            const errStr = JSON.stringify(err);
            if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
              setVoiceLastAction("ขออภัย โควตาการใช้งาน AI เต็มแล้ว (Quota Exhausted) กรุณารอสักครู่แล้วลองใหม่");
            } else {
              setVoiceLastAction("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่");
            }
            setTimeout(stopVoiceSession, 3000);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: `คุณคือ "โนว่า" พนักงาน POS อัจฉริยะ สุภาพ ใจดี
          รายการสินค้า:
          ${productListString}
          กฎสำคัญ:
          1. ห้ามปิดไมค์เอง ห้ามลาลูกค้าก่อน เว้นแต่ลูกค้าสั่งให้ "ปิดไมค์"
          2. เมื่อคิดเงินเสร็จ (processCheckout) ต้องพูดสรุปรายการและ "เงินทอน" ให้ชัดเจน
          3. คำสั่ง "ปิดไมค์" ให้เรียก closeMic และหยุดการสนทนา`,
          tools: [{ functionDeclarations: [
            { name: 'addToCartByName', parameters: { type: Type.OBJECT, properties: { productName: { type: Type.STRING }, quantity: { type: Type.NUMBER } }, required: ['productName'] } },
            { name: 'processCheckout', parameters: { type: Type.OBJECT, properties: { cashReceived: { type: Type.NUMBER }, paymentMethod: { type: Type.STRING } }, required: ['paymentMethod'] } },
            { name: 'closeMic', parameters: { type: Type.OBJECT, properties: {} } }
          ] }]
        }
      });

      const getMic = async (retry = 0): Promise<MediaStream> => {
        try {
          return await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          if (retry < 5) {
            await new Promise(r => setTimeout(r, 1000));
            return getMic(retry + 1);
          }
          throw e;
        }
      };

      getMic().then(stream => {
        if (!isVoiceActiveRef.current) { 
          stream.getTracks().forEach(t => t.stop()); 
          return; 
        }
        
        micStreamRef.current = stream; 
        setIsConnecting(false); 
        
        const source = inCtx.createMediaStreamSource(stream);
        const analyser = inCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        
        const updateVolume = () => {
          if (!isVoiceActiveRef.current) return;
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          setMicVolume(sum / dataArray.length);
          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        updateVolume();

        const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessor.onaudioprocess = (e) => {
          if (!isVoiceActiveRef.current) return;
          const inputData = e.inputBuffer.getChannelData(0);
          const int16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
          
          sessionPromise.then(s => { 
            if (s && s.sendRealtimeInput && isVoiceActiveRef.current) {
              try {
                s.sendRealtimeInput({ 
                  media: { 
                      data: encode(new Uint8Array(int16.buffer)), 
                      mimeType: 'audio/pcm;rate=16000' 
                  } 
                });
              } catch(e) {}
            }
          });
        };
        source.connect(scriptProcessor); scriptProcessor.connect(inCtx.destination);
      }).catch(err => {
        console.error("Mic access failed:", err);
        setVoiceLastAction("ไม่สามารถเปิดไมโครโฟนได้ กรุณาตรวจสอบสิทธิ์หรือรีเฟรชหน้าจอ");
        setTimeout(stopVoiceSession, 3000);
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err: any) { 
      console.error("Session crash:", err);
      const errStr = JSON.stringify(err);
      if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED")) {
        setVoiceLastAction("โควตา AI เต็มแล้ว กรุณาลองใหม่ภายหลัง");
      }
      setTimeout(stopVoiceSession, 3000); 
    }
  };

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
        return;
    }
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true; 
    recognition.interimResults = true; 
    recognition.lang = 'th-TH';
    
    setupRecognitionHandlers(recognition);

    try {
        recognition.start();
    } catch (e) {}
    
    recognitionRef.current = recognition;
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.barcode && p.barcode.includes(searchQuery));
      const matchesCategory = selectedCategory === 'ทั้งหมด' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Determine active payment methods from store config
  const activePaymentMethods = useMemo(() => {
    return Object.entries(storeConfig.paymentMethods)
      .filter(([_, active]) => active)
      .map(([id]) => id as PaymentMethodType);
  }, [storeConfig.paymentMethods]);

  // Set default payment method if current one is disabled
  useEffect(() => {
    if (activePaymentMethods.length > 0 && !activePaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(activePaymentMethods[0]);
    }
  }, [activePaymentMethods, paymentMethod]);

  const getPaymentIcon = (method: PaymentMethodType) => {
    switch (method) {
      case 'cash': return <Banknote size={24}/>;
      case 'promptpay': return <QrCode size={24}/>;
      case 'truemoney': return <Wallet size={24}/>;
      case 'transfer': return <Landmark size={24}/>;
      case 'ewallet': return <Wallet size={24}/>;
      case 'card': return <CreditCard size={24}/>;
      default: return <Coins size={24}/>;
    }
  };

  const getPaymentLabel = (method: PaymentMethodType) => {
    switch (method) {
      case 'cash': return 'เงินสด';
      case 'promptpay': return 'พร้อมเพย์';
      case 'truemoney': return 'ทรูมันนี่';
      case 'transfer': return 'โอนเงิน';
      case 'ewallet': return 'e-Wallet';
      case 'card': return 'บัตร';
      default: return method;
    }
  };

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden relative">
      
      {/* Barcode Scanner Overlay */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[170] flex flex-col items-center justify-center p-4">
           <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h2 className="font-black text-slate-800 flex items-center gap-2"><ScanLine className="text-primary-600"/> สแกนบาร์โค้ด</h2>
                 <button onClick={stopScanner} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X/></button>
              </div>
              <div id="scanner-container" className="w-full aspect-square bg-black overflow-hidden relative">
                 {/* Scanner will render here */}
                 <div className="absolute inset-0 border-2 border-primary-500/30 pointer-events-none flex items-center justify-center">
                    <div className="w-64 h-40 border-4 border-primary-500 rounded-2xl animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.3)]"></div>
                 </div>
              </div>
              <div className="p-8 text-center bg-slate-50">
                 <p className="text-slate-500 font-bold">หันบาร์โค้ดสินค้าเข้าหากล้องเพื่อสแกน</p>
              </div>
           </div>
        </div>
      )}

      {/* Voice UI Overlay */}
      {isVoiceActive && (
        <div className="fixed inset-0 bg-slate-900/98 backdrop-blur-3xl z-[150] flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="bg-white p-12 rounded-[4rem] shadow-2xl flex flex-col items-center gap-10 border-4 border-primary-500 animate-in zoom-in-95 w-full max-w-xl mx-4 relative overflow-hidden text-center">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-500 via-indigo-500 to-primary-500 animate-pulse"></div>
              
              {isConnecting ? (
                  <div className="flex flex-col items-center gap-8 py-10 w-full">
                     <div className="relative">
                        <Loader2 size={100} className="text-primary-500 animate-spin" />
                        <Sparkles size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-300 animate-pulse" />
                     </div>
                     <h2 className="text-3xl font-black text-slate-800 tracking-tight">กำลังเชื่อมต่อ AI...</h2>
                     {voiceLastAction && (
                        <div className="bg-amber-50 text-amber-700 p-4 rounded-2xl border border-amber-200 flex items-center gap-3">
                           <AlertTriangle size={20} />
                           <p className="font-bold text-sm">{voiceLastAction}</p>
                        </div>
                     )}
                  </div>
              ) : (
                <>
                  <div className="relative flex items-center justify-center">
                    <div className="absolute rounded-full bg-primary-100 transition-all duration-75" style={{ width: `${140 + micVolume * 2.5}px`, height: `${140 + micVolume * 2.5}px`, opacity: 0.2 + (micVolume / 100) }} />
                    <div className={`w-36 h-36 rounded-full flex items-center justify-center transition-all duration-500 z-10 shadow-2xl ${isTalking ? 'bg-emerald-500 scale-105' : 'bg-primary-600 animate-pulse'}`}>
                        {isTalking ? <Volume2 size={72} className="text-white" /> : <Mic size={72} className="text-white" />}
                    </div>
                  </div>
                  <div className="z-10 px-4">
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">{isTalking ? "โนว่ากำลังพูด..." : "โนว่ากำลังฟังครับ"}</h2>
                      <p className="text-slate-500 font-bold text-xl mt-3">สั่งสินค้า หรือพูดคุยได้เลย ไมค์จะเปิดค้างไว้จนกว่าคุณจะปิด</p>
                  </div>
                  {voiceLastAction && (
                      <div className="w-full bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2.5rem] flex items-center gap-4 animate-in slide-in-from-top-4 z-10 shadow-sm mx-4">
                          <CheckCircle size={36} className="text-emerald-500" />
                          <p className="text-2xl font-black text-emerald-900">{voiceLastAction}</p>
                      </div>
                  )}
                  <div className="bg-slate-900 p-10 rounded-[3rem] text-center w-full shadow-2xl border border-slate-700 z-10">
                      <p className="text-7xl font-black text-white tracking-tighter"><span className="text-3xl mr-1 text-primary-400">{storeConfig.currency}</span>{subtotal.toFixed(2)}</p>
                  </div>
                  <button onClick={stopVoiceSession} className="w-full py-7 bg-red-50 text-red-600 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-4 hover:bg-red-100 transition-all shadow-md active:scale-95 z-10 uppercase tracking-widest"><MicOff size={32}/> ปิดการใช้งาน AI</button>
                </>
              )}
           </div>
        </div>
      )}

      {/* POS Interface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 bg-white shadow-sm border-b border-slate-100 flex flex-col gap-3 z-10">
            {/* Wake Word Status Bar */}
            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
               <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isWaitingForWakeWord ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {isWaitingForWakeWord ? 'พร้อมรับคำสั่งเสียงเบื้องหลัง' : 'ระบบสั่งงานทำงานอยู่'}
                  </span>
               </div>
               <div className="text-[10px] font-bold text-slate-400">
                 พูดว่า: <span className="text-primary-600 font-black">"ใช้คำสั่งเสียง"</span>
               </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    id="pos-search-input"
                    type="text" 
                    placeholder="ค้นหาหรือยิงบาร์โค้ด..." 
                    className="w-full pl-10 pr-4 py-3 border rounded-xl border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-lg transition-all" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                </div>
                
                <button 
                  onClick={startScanner}
                  className="px-5 py-3 bg-white text-slate-700 border-2 border-slate-200 rounded-xl flex items-center gap-2 font-black transition-all hover:border-primary-500 active:scale-95 shadow-md"
                >
                  <ScanLine size={24} className="text-primary-600" />
                  <span className="hidden sm:inline">สแกนบาร์โค้ด</span>
                </button>

                <button 
                  onClick={() => isVoiceActive ? stopVoiceSession() : startVoiceSession()} 
                  className={`px-6 py-3 rounded-xl flex items-center gap-3 font-black transition-all shadow-lg active:scale-95 border-2 ${isVoiceActive ? 'bg-primary-50 text-primary-600 border-primary-500' : 'bg-white text-slate-700 border-slate-200 hover:border-primary-200'}`}
                >
                   {isConnecting ? <Loader2 size={20} className="animate-spin" /> : (isVoiceActive ? <MicOff size={22} /> : <Mic size={20} className="text-primary-500" />)}
                   <span>{isVoiceActive ? 'ปิดไมค์ AI' : 'สั่งด้วยเสียง'}</span>
                </button>
            </div>

            {/* Categories Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
               <div className="flex items-center gap-2 pr-4 border-r border-slate-200 mr-2 shrink-0">
                  <Layers size={18} className="text-slate-400" />
                  <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">หมวดหมู่:</span>
               </div>
               {categories.map(cat => (
                 <button
                   key={cat}
                   onClick={() => setSelectedCategory(cat)}
                   className={`px-4 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-200 hover:bg-slate-50'}`}
                 >
                   {cat}
                 </button>
               ))}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredProducts.map(product => {
              const inCart = cart.find(i => i.id === product.id)?.quantity || 0;
              const remainingStock = product.stock - inCart;
              
              return (
                <button key={product.id} onClick={() => product.stock > 0 && remainingStock > 0 && addToCart(product)} className={`bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-start transition-all group relative ${remainingStock <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-xl hover:border-primary-100 active:scale-95'}`}>
                  <div className="w-full aspect-square bg-slate-50 rounded-3xl mb-4 overflow-hidden border border-slate-50 relative">
                     <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={product.name} />
                     
                     <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-slate-600 text-[9px] font-black px-2 py-1 rounded-lg border border-slate-100 uppercase tracking-tighter shadow-sm">
                       {product.category}
                     </span>

                     <div className={`absolute bottom-2 right-2 px-2.5 py-1 rounded-xl text-[10px] font-black shadow-md flex items-center gap-1.5 border border-white ${remainingStock <= storeConfig.lowStockThreshold ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                        <PackageSearch size={12} />
                        <span>คงเหลือ: {remainingStock}</span>
                     </div>
                  </div>
                  <h3 className="font-bold text-slate-800 line-clamp-2 text-sm h-10 mb-1 text-left">{product.name}</h3>
                  <div className="flex justify-between items-center w-full">
                    <span className="font-black text-primary-600 text-base">{storeConfig.currency}{product.price.toFixed(2)}</span>
                    {inCart > 0 && (
                      <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-lg text-[10px] font-black">
                        ในตะกร้า: {inCart}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl z-20">
        <div className="p-6 border-b border-slate-100 flex justify-between bg-slate-50/40 items-center">
            <h2 className="font-black text-xl text-slate-800 flex items-center gap-2"><ShoppingCart size={24} className="text-primary-600"/> ตะกร้า</h2>
            <button onClick={() => setCart([])} className="text-[10px] font-black text-red-400 hover:text-red-600 px-3 py-1.5 bg-red-50 rounded-full transition-all uppercase tracking-widest">ล้างตะกร้า</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
              <ShoppingCart size={64} strokeWidth={1} className="mb-4" />
              <p className="font-bold">ตะกร้าว่างเปล่า</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-4 bg-white p-4 rounded-[2rem] border border-slate-50 shadow-sm animate-in slide-in-from-right-4">
                <img src={item.image} className="w-14 h-14 rounded-2xl object-cover border border-slate-100" alt={item.name} />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-slate-800 truncate">{item.name}</h4>
                  <div className="text-primary-600 font-black text-lg">{storeConfig.currency}{(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-2 hover:bg-white"><Minus size={14}/></button>
                    <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-2 hover:bg-white"><Plus size={14}/></button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-8 bg-slate-900 text-white rounded-t-[3.5rem] shadow-2xl">
          <div className="flex justify-between text-3xl font-black mb-8 tracking-tighter">
            <span>สุทธิ</span>
            <span>{storeConfig.currency}{subtotal.toFixed(2)}</span>
          </div>
          <button onClick={() => { setIsCheckoutOpen(true); setCashReceivedStr(''); }} disabled={cart.length === 0} className="w-full bg-primary-500 hover:bg-primary-400 disabled:bg-slate-800 disabled:text-slate-600 text-white py-6 rounded-[2.2rem] font-black text-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-4 uppercase">
            <Banknote size={30} /> ชำระเงิน
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/70 z-[160] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden p-10 relative animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <button onClick={() => { setIsCheckoutOpen(false); setCompletedOrder(null); }} className="absolute top-8 right-8 p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500 z-10">
               <X size={24} />
            </button>
            {completedOrder ? (
              <div className="space-y-8 text-center py-6 overflow-y-auto scrollbar-hide">
                <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce mx-auto shadow-lg"><CheckCircle size={80} /></div>
                <h2 className="text-5xl font-black text-slate-900 tracking-tight">ชำระสำเร็จ!</h2>
                <div className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 shadow-inner">
                   <p className="text-slate-500 font-black text-sm uppercase mb-3 tracking-widest">เงินทอนที่ต้องคืน</p>
                   <span className="font-black text-emerald-600 text-7xl tracking-tighter">{storeConfig.currency}{completedOrder.change?.toFixed(2)}</span>
                </div>
                <button onClick={() => {setIsCheckoutOpen(false); setCompletedOrder(null);}} className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest">ทำรายการถัดไป</button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="text-center mb-6 shrink-0">
                    <p className="text-slate-400 font-black uppercase text-xs tracking-widest mb-1">ยอดชำระสุทธิ</p>
                    <h1 className="text-7xl font-black text-slate-900 tracking-tighter">{storeConfig.currency}{subtotal.toFixed(2)}</h1>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-6 shrink-0">
                    {activePaymentMethods.map(method => (
                        <button key={method} onClick={() => setPaymentMethod(method as any)} className={`flex flex-col items-center justify-center p-4 rounded-[2rem] border-4 transition-all gap-2 ${paymentMethod === method ? 'border-primary-500 bg-primary-50 text-primary-600 shadow-md' : 'border-slate-50 bg-white text-slate-400'}`}>
                            {getPaymentIcon(method)}
                            <span className="text-[10px] font-black uppercase tracking-widest">{getPaymentLabel(method)}</span>
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 scrollbar-hide">
                  {paymentMethod === 'cash' && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-2">
                       <input type="number" placeholder="0.00" className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-center text-5xl font-black outline-none focus:border-primary-500 transition-all text-slate-800" value={cashReceivedStr} onChange={(e) => setCashReceivedStr(e.target.value)} />
                       <div className="flex justify-between items-center p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 shadow-sm">
                          <span className="font-bold text-emerald-800">เงินทอนที่จะคืน:</span>
                          <span className="text-3xl font-black text-emerald-700 tracking-tighter">{storeConfig.currency}{(parseFloat(cashReceivedStr) - subtotal > 0 ? parseFloat(cashReceivedStr) - subtotal : 0).toFixed(2)}</span>
                       </div>
                    </div>
                  )}
                  {paymentMethod === 'promptpay' && (
                    <div className="animate-in zoom-in-95 duration-300 flex flex-col items-center space-y-4 p-4">
                        <div className="bg-white p-6 rounded-[3rem] shadow-xl border-4 border-primary-500 w-full max-w-xs aspect-square flex items-center justify-center relative overflow-hidden">
                           {storeConfig.promptPayQr ? <img src={storeConfig.promptPayQr} className="w-full h-full object-contain" /> : <QrCode size={80} className="opacity-20" />}
                        </div>
                        <p className="text-lg font-black text-slate-800">ยอด {storeConfig.currency}{subtotal.toFixed(2)}</p>
                    </div>
                  )}
                  {paymentMethod === 'transfer' && (
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 shadow-inner">
                        <p className="text-sm font-bold text-slate-500 mb-1">เลขที่บัญชี: {storeConfig.bankAccount || 'ยังไม่ตั้งค่า'}</p>
                        <p className="text-sm font-bold text-slate-500">ชื่อ: {storeConfig.bankAccountName || 'ยังไม่ตั้งค่า'}</p>
                    </div>
                  )}
                  {paymentMethod === 'truemoney' && (
                    <div className="animate-in zoom-in-95 duration-300 flex flex-col items-center space-y-4 p-4">
                        <div className="bg-white p-6 rounded-[3rem] shadow-xl border-4 border-orange-500 w-full max-w-xs aspect-square flex items-center justify-center relative overflow-hidden">
                           {storeConfig.trueMoneyQr ? <img src={storeConfig.trueMoneyQr} className="w-full h-full object-contain" /> : <Wallet size={80} className="opacity-20 text-orange-400" />}
                        </div>
                        <p className="text-lg font-black text-slate-800">ยอด {storeConfig.currency}{subtotal.toFixed(2)}</p>
                    </div>
                  )}
                </div>
                <button disabled={paymentMethod === 'cash' && (!cashReceivedStr || parseFloat(cashReceivedStr) < subtotal)} onClick={() => finalizeOrder(paymentMethod, parseFloat(cashReceivedStr) || subtotal)} className="w-full bg-primary-600 disabled:bg-slate-300 text-white py-8 rounded-[2.5rem] font-black text-3xl shadow-xl transition-all active:scale-[0.98] uppercase mt-4 shrink-0 tracking-widest">ยืนยันรายการชำระ</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Internal component for Card Icon
const PackageSearch: React.FC<{size?: number, className?: string}> = ({size = 24, className = ""}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

export default POS;
