import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Product } from '../types.ts';
import { 
  Edit, Trash2, Plus, X, List, Upload, ScanLine, 
  Search, PackagePlus, CheckCircle2, PackageSearch, 
  Wand2, Link as LinkIcon, FileSpreadsheet, Download, RefreshCw, 
  AlertCircle, Save, Printer, FileText, Check, ArrowDownToLine,
  CheckSquare, Square, Layers, Store, Building2, Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Barcode from './Barcode.tsx';
import { getLocalDateString } from '../lib/dateUtils.ts';

interface ExcelImportRow {
  id?: string | number;
  name?: string;
  barcode?: string | number;
  category?: string;
  stock?: number | string;
  price?: number | string;
  costPrice?: number | string;
  image?: string;
  description?: string;
  [key: string]: any;
}

interface PreviewItem {
  action: 'add' | 'update';
  data: Product;
  original?: Product;
}

const ProductManagement: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, storeConfig, currentUser, markAllNotificationsAsRead } = useStore();
  const [view, setView] = useState<'list' | 'restock'>('list');

  useEffect(() => {
    markAllNotificationsAsRead();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [restockFilter, setRestockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [imageInputMode, setImageInputMode] = useState<'url' | 'upload'>('url');
  
  // Excel Import States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<PreviewItem[]>([]);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({ isOpen: false, id: null, name: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Barcode Printing States
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [barcodePrintMode, setBarcodePrintMode] = useState<'single' | 'batch'>('single');
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);
  const [barcodeCopies, setBarcodeCopies] = useState<number>(6);
  const [barcodeLayout, setBarcodeLayout] = useState<'a4-grid' | 'single-sticker'>('a4-grid');
  const [barcodeShowPrice, setBarcodeShowPrice] = useState(true);
  const [barcodeShowStoreName, setBarcodeShowStoreName] = useState(true);
  const [batchSelectedIds, setBatchSelectedIds] = useState<Record<string, number>>({});

  // Stock Report (PDF / Print) States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportFilter, setReportFilter] = useState<'all' | 'low' | 'out'>('all');
  const [reportCategory, setReportCategory] = useState<string>('all');
  
  // PDF Export Refs & Loading
  const stockReportPrintRef = useRef<HTMLDivElement>(null);
  const barcodePrintRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingBarcodePdf, setIsGeneratingBarcodePdf] = useState(false);

  const isAdmin = currentUser?.isAdmin || currentUser?.roleId === 'admin';

  const [formData, setFormData] = useState<Omit<Product, 'id'>>({
    name: '',
    price: 0,
    costPrice: 0,
    category: '',
    stock: 0,
    image: '',
    description: '',
    barcode: ''
  });

  const [restockAmounts, setRestockAmounts] = useState<Record<string, number>>({});

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (view === 'restock') {
        if (restockFilter === 'low') return matchesSearch && p.stock < (storeConfig.lowStockThreshold || 10) && p.stock > 0;
        if (restockFilter === 'out') return matchesSearch && p.stock === 0;
      }

      return matchesSearch;
    });
  }, [products, searchQuery, view, restockFilter, storeConfig.lowStockThreshold]);

  // Excel Import Logic (Supports both Thai and English headers)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingExcel(true);
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as ExcelImportRow[];

        if (!data || data.length === 0) {
          alert("ไม่พบข้อมูลในไฟล์ Excel กรุณาตรวจสอบข้อมูลอีกครั้ง");
          return;
        }

        const previewList: PreviewItem[] = data.map((row) => {
          const rowId = (row.id || row['รหัสสินค้า'] || row['ID'] || '')?.toString().trim();
          const rowBarcode = (row.barcode || row['บาร์โค้ด'] || row['บาร์โค้ด (Barcode)'] || row['Barcode'] || '')?.toString().trim();
          const rowName = (row.name || row['ชื่อสินค้า'] || row['ชื่อสินค้า (Product Name)'] || row['Name'] || 'ไม่มีชื่อสินค้า')?.toString().trim();
          const rowCategory = (row.category || row['หมวดหมู่'] || row['หมวดหมู่ (Category)'] || row['Category'] || 'ทั่วไป')?.toString().trim();
          const rowPrice = Number(row.price || row['ราคา'] || row['ราคาขาย'] || row['ราคาขาย (Price)'] || row['Price'] || 0);
          const rowCostPrice = Number(row.costPrice || row['ราคาทุน'] || row['ต้นทุน'] || row['ราคาทุน (Cost)'] || row['Cost'] || 0);
          const rowStock = Number(row.stock || row['สต็อก'] || row['จำนวน'] || row['จำนวนสต็อก'] || row['จำนวนสต็อก (Stock)'] || row['Stock'] || 0);
          const rowDescription = (row.description || row['คำอธิบาย'] || row['คำอธิบาย (Description)'] || row['Description'] || '')?.toString().trim();
          const rowImage = (row.image || row['รูปภาพ'] || row['Image'] || '')?.toString().trim();
          
          // Try to find existing product by ID or Barcode
          let existing = products.find(p => p.id === rowId);
          if (!existing && rowBarcode) {
            existing = products.find(p => p.barcode === rowBarcode);
          }

          const productData: Product = {
            id: existing ? existing.id : (rowId || Date.now().toString() + Math.random().toString(36).substr(2, 5)),
            name: rowName,
            barcode: rowBarcode,
            category: rowCategory,
            stock: rowStock,
            price: rowPrice,
            costPrice: rowCostPrice,
            image: rowImage || existing?.image || '',
            description: rowDescription || existing?.description || ''
          };

          return {
            action: existing ? 'update' : 'add',
            data: productData,
            original: existing
          };
        });

        setImportPreview(previewList);
        setIsImportModalOpen(true);
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบรูปแบบไฟล์คอลัมน์");
        console.error(err);
      } finally {
        setIsProcessingExcel(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const confirmImport = () => {
    importPreview.forEach(item => {
      if (item.action === 'update') {
        updateProduct(item.data);
      } else {
        addProduct(item.data);
      }
    });

    alert(`นำเข้าข้อมูลเรียบร้อยแล้ว: เพิ่มใหม่ ${importPreview.filter(i => i.action === 'add').length} รายการ, อัปเดต ${importPreview.filter(i => i.action === 'update').length} รายการ`);
    setIsImportModalOpen(false);
    setImportPreview([]);
  };

  // Download Sample Excel Template
  const downloadTemplate = () => {
    const sampleData = [
      {
        'บาร์โค้ด (Barcode)': '885157379918',
        'ชื่อสินค้า (Product Name)': 'กระดาษสี A4 80 แกรม',
        'หมวดหมู่ (Category)': 'อุปกรณ์เครื่องเขียน',
        'ราคาขาย (Price)': 4.00,
        'ราคาทุน (Cost)': 2.50,
        'จำนวนสต็อก (Stock)': 140,
        'คำอธิบาย (Description)': 'กระดาษสีสำหรับทำรายงานและงานประดิษฐ์'
      },
      {
        'บาร์โค้ด (Barcode)': '885843820106',
        'ชื่อสินค้า (Product Name)': 'กระดาษถ่ายเอกสาร A4 70 แกรม',
        'หมวดหมู่ (Category)': 'อุปกรณ์เครื่องเขียน',
        'ราคาขาย (Price)': 1.00,
        'ราคาทุน (Cost)': 0.60,
        'จำนวนสต็อก (Stock)': 100,
        'คำอธิบาย (Description)': 'กระดาษถ่ายเอกสารคุณภาพดี ขาวสะอาด'
      },
      {
        'บาร์โค้ด (Barcode)': '6972554301114',
        'ชื่อสินค้า (Product Name)': 'สมุดจดโอวาท ปกแข็ง',
        'หมวดหมู่ (Category)': 'อุปกรณ์เครื่องเขียน',
        'ราคาขาย (Price)': 15.00,
        'ราคาทุน (Cost)': 10.00,
        'จำนวนสต็อก (Stock)': 65,
        'คำอธิบาย (Description)': 'สมุดจดบันทึกโอวาทเล่มมาตรฐาน'
      },
      {
        'บาร์โค้ด (Barcode)': '885901827466',
        'ชื่อสินค้า (Product Name)': 'เทปลบคำผิดชนิดแห้ง',
        'หมวดหมู่ (Category)': 'อุปกรณ์เครื่องเขียน',
        'ราคาขาย (Price)': 12.00,
        'ราคาทุน (Cost)': 7.50,
        'จำนวนสต็อก (Stock)': 50,
        'คำอธิบาย (Description)': 'เทปลบคำผิดขนาด 5mm x 6m'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 18 }, // บาร์โค้ด
      { wch: 32 }, // ชื่อสินค้า
      { wch: 22 }, // หมวดหมู่
      { wch: 16 }, // ราคาขาย
      { wch: 16 }, // ราคาทุน
      { wch: 18 }, // จำนวนสต็อก
      { wch: 35 }  // คำอธิบาย
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "แบบฟอร์มนำเข้าสินค้า");
    XLSX.writeFile(wb, "Template_นำเข้าสินค้า_DBS_POS.xlsx");
  };

  // Export Stock to Excel
  const handleExportStockExcel = () => {
    const listToExport = filteredProducts.length > 0 ? filteredProducts : products;
    
    let totalCostVal = 0;
    let totalRetailVal = 0;
    let totalUnits = 0;

    const exportRows = listToExport.map((p, index) => {
      const cost = Number(p.costPrice) || 0;
      const price = Number(p.price) || 0;
      const stock = Number(p.stock) || 0;
      const rowCostVal = cost * stock;
      const rowRetailVal = price * stock;

      totalCostVal += rowCostVal;
      totalRetailVal += rowRetailVal;
      totalUnits += stock;

      const status = stock === 0 
        ? 'หมดสต็อก' 
        : stock < (storeConfig.lowStockThreshold || 10) 
          ? 'ใกล้หมดสต็อก' 
          : 'ปกติ';

      return {
        'ลำดับ': index + 1,
        'บาร์โค้ด': p.barcode || '-',
        'ชื่อสินค้า': p.name,
        'หมวดหมู่': p.category || 'ทั่วไป',
        'ราคาทุน (บาท)': cost,
        'ราคาขาย (บาท)': price,
        'กำไรต่อหน่วย (บาท)': Number((price - cost).toFixed(2)),
        'คงเหลือ (ชิ้น)': stock,
        'สถานะสต็อก': status,
        'มูลค่าทุนรวม (บาท)': Number(rowCostVal.toFixed(2)),
        'มูลค่าขายรวม (บาท)': Number(rowRetailVal.toFixed(2))
      };
    });

    // Summary Row
    exportRows.push({
      'ลำดับ': '' as any,
      'บาร์โค้ด': '',
      'ชื่อสินค้า': `สรุปรวมทั้งหมด (${listToExport.length} รายการ)`,
      'หมวดหมู่': '',
      'ราคาทุน (บาท)': '' as any,
      'ราคาขาย (บาท)': '' as any,
      'กำไรต่อหน่วย (บาท)': '' as any,
      'คงเหลือ (ชิ้น)': totalUnits,
      'สถานะสต็อก': '',
      'มูลค่าทุนรวม (บาท)': Number(totalCostVal.toFixed(2)),
      'มูลค่าขายรวม (บาท)': Number(totalRetailVal.toFixed(2))
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 18 }, // บาร์โค้ด
      { wch: 32 }, // ชื่อสินค้า
      { wch: 20 }, // หมวดหมู่
      { wch: 15 }, // ราคาทุน
      { wch: 15 }, // ราคาขาย
      { wch: 18 }, // กำไร
      { wch: 15 }, // คงเหลือ
      { wch: 16 }, // สถานะ
      { wch: 22 }, // มูลค่าทุนรวม
      { wch: 22 }  // มูลค่าขายรวม
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายงานสต็อกสินค้า");
    const dateStr = getLocalDateString(new Date());
    XLSX.writeFile(wb, `รายงานสต็อกสินค้า_${storeConfig.name || 'NovaPOS'}_${dateStr}.xlsx`);
  };

  // Open Barcode Print Modal for Single Product
  const openSingleBarcodeModal = (product: Product) => {
    setSelectedProductForBarcode(product);
    setBarcodeCopies(Math.min(24, Math.max(1, product.stock || 6)));
    setBarcodePrintMode('single');
    setIsBarcodeModalOpen(true);
  };

  // Open Barcode Print Modal for Batch Products
  const openBatchBarcodeModal = () => {
    const initialBatch: Record<string, number> = {};
    products.forEach(p => {
      if (p.barcode) {
        initialBatch[p.id] = 1;
      }
    });
    setBatchSelectedIds(initialBatch);
    setBarcodePrintMode('batch');
    setSelectedProductForBarcode(null);
    setIsBarcodeModalOpen(true);
  };

  // Helper to safely render an element to HTML5 Canvas without iframe clone matching errors
  const captureElementToCanvas = async (element: HTMLElement): Promise<HTMLCanvasElement> => {
    // Create an unscrollable, isolated sandbox mount point directly on document.body
    const sandbox = document.createElement('div');
    sandbox.style.position = 'fixed';
    sandbox.style.top = '0';
    sandbox.style.left = '0';
    sandbox.style.width = element.style.width || `${element.offsetWidth}px`;
    sandbox.style.minHeight = element.style.minHeight || `${element.offsetHeight}px`;
    sandbox.style.zIndex = '-9999';
    sandbox.style.background = '#ffffff';
    sandbox.style.overflow = 'visible';
    sandbox.style.pointerEvents = 'none';

    // Clone element into sandbox
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.margin = '0';
    clone.style.transform = 'none';
    sandbox.appendChild(clone);
    document.body.appendChild(sandbox);

    // Wait a brief tick for DOM and layout computation
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: clone.offsetWidth || 800,
        windowHeight: clone.offsetHeight || 1130
      });
      return canvas;
    } finally {
      if (document.body.contains(sandbox)) {
        document.body.removeChild(sandbox);
      }
    }
  };

  // PDF Generation for Stock Report (Per-page rendering to avoid sliced rows)
  const handleDownloadReportPdf = async () => {
    if (!stockReportPrintRef.current) return;
    setIsGeneratingPdf(true);
    try {
      const pageElements = stockReportPrintRef.current.querySelectorAll('.pdf-page');
      if (!pageElements || pageElements.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) pdf.addPage('a4', 'portrait');
        const pageEl = pageElements[i] as HTMLElement;
        const canvas = await captureElementToCanvas(pageEl);

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      const dateStr = getLocalDateString(new Date());
      pdf.save(`รายงานสต็อกสินค้า_${storeConfig.name || 'NovaPOS'}_${dateStr}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // PDF Generation for Barcode Stickers (Per-page rendering)
  const handleDownloadBarcodePdf = async () => {
    if (!barcodePrintRef.current) return;
    setIsGeneratingBarcodePdf(true);
    try {
      const pageElements = barcodePrintRef.current.querySelectorAll('.pdf-barcode-page');
      if (!pageElements || pageElements.length === 0) return;

      const isSingleMode = barcodeLayout === 'single-sticker';
      const pdf = new jsPDF({
        orientation: isSingleMode ? 'landscape' : 'portrait',
        unit: 'mm',
        format: isSingleMode ? [40, 60] : 'a4'
      });

      for (let i = 0; i < pageElements.length; i++) {
        if (i > 0) {
          if (isSingleMode) {
            pdf.addPage([40, 60], 'landscape');
          } else {
            pdf.addPage('a4', 'portrait');
          }
        }
        const pageEl = pageElements[i] as HTMLElement;
        const canvas = await captureElementToCanvas(pageEl);

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      const name = selectedProductForBarcode?.name ? `_${selectedProductForBarcode.name}` : '_รวม';
      pdf.save(`สติกเกอร์บาร์โค้ด${name}_${getLocalDateString(new Date())}.pdf`);
    } catch (err) {
      console.error("Barcode PDF generation failed:", err);
      alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF สติกเกอร์บาร์โค้ด");
    } finally {
      setIsGeneratingBarcodePdf(false);
    }
  };

  // Trigger browser print for barcodes or PDF with fallback
  const triggerBrowserPrint = (type: 'report' | 'barcode' = 'report') => {
    try {
      window.print();
    } catch (e) {
      console.warn("window.print() error in iframe, falling back to PDF download", e);
      if (type === 'report') {
        handleDownloadReportPdf();
      } else {
        handleDownloadBarcodePdf();
      }
    }
  };

  const getDefaultProductImage = (name: string, category: string) => {
    const search = (category + " " + name).toLowerCase();
    if (search.includes('กาแฟ') || search.includes('coffee')) return 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80';
    return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80';
  };

  const handleManualBarcodeGenerate = () => {
    const prefix = "885";
    const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    setFormData(prev => ({ ...prev, barcode: prefix + randomPart }));
  };

  const openModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData({
        name: product.name,
        price: product.price,
        costPrice: product.costPrice || 0,
        category: product.category,
        stock: product.stock,
        image: product.image,
        description: product.description || '',
        barcode: product.barcode || ''
      });
      setImageInputMode(product.image?.startsWith('data:') ? 'upload' : 'url');
    } else {
      setEditingId(null);
      setFormData({ name: '', price: 0, costPrice: 0, category: '', stock: 0, image: '', description: '', barcode: '' });
      setImageInputMode('url');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      ...formData,
      id: editingId || Date.now().toString(),
      image: formData.image.trim() || getDefaultProductImage(formData.name, formData.category)
    } as Product;

    if (editingId) {
      updateProduct(productData);
    } else {
      addProduct(productData);
    }
    setIsModalOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirmation({ isOpen: true, id, name });
  };

  const confirmDelete = async () => {
    const idToDelete = deleteConfirmation.id;
    if (!idToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProduct(idToDelete);
      setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    } catch (err: any) {
      console.error("Delete product error:", err);
      alert("เกิดข้อผิดพลาดในการลบสินค้า: " + (err.message || "กรุณาลองใหม่อีกครั้ง"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestock = (product: Product) => {
    const amount = restockAmounts[product.id] || 0;
    if (amount <= 0) return;
    updateProduct({ ...product, stock: product.stock + amount });
    setRestockAmounts(prev => ({ ...prev, [product.id]: 0 }));
  };

  // Filtered Products for PDF Report
  const reportProducts = useMemo(() => {
    return products.filter(p => {
      if (reportCategory !== 'all' && p.category !== reportCategory) return false;
      const lowThreshold = storeConfig.lowStockThreshold || 10;
      if (reportFilter === 'low') return p.stock < lowThreshold && p.stock > 0;
      if (reportFilter === 'out') return p.stock === 0;
      return true;
    });
  }, [products, reportFilter, reportCategory, storeConfig.lowStockThreshold]);

  // Report Metrics
  const reportMetrics = useMemo(() => {
    let totalCost = 0;
    let totalRetail = 0;
    let totalQty = 0;
    let outCount = 0;
    let lowCount = 0;
    const lowThreshold = storeConfig.lowStockThreshold || 10;

    reportProducts.forEach(p => {
      const c = Number(p.costPrice) || 0;
      const r = Number(p.price) || 0;
      const s = Number(p.stock) || 0;
      totalCost += c * s;
      totalRetail += r * s;
      totalQty += s;
      if (s === 0) outCount++;
      else if (s < lowThreshold) lowCount++;
    });

    return {
      totalSKUs: reportProducts.length,
      totalQty,
      totalCost,
      totalRetail,
      estimatedProfit: totalRetail - totalCost,
      outCount,
      lowCount
    };
  }, [reportProducts, storeConfig.lowStockThreshold]);

  // Prepared barcode list for printing
  const printBarcodeList = useMemo(() => {
    if (barcodePrintMode === 'single') {
      if (!selectedProductForBarcode || !selectedProductForBarcode.barcode) return [];
      return Array(barcodeCopies).fill(selectedProductForBarcode);
    } else {
      // Batch mode
      const list: Product[] = [];
      Object.entries(batchSelectedIds).forEach(([productId, count]) => {
        if (count > 0) {
          const product = products.find(p => p.id === productId);
          if (product && product.barcode) {
            for (let i = 0; i < count; i++) {
              list.push(product);
            }
          }
        }
      });
      return list;
    }
  }, [barcodePrintMode, selectedProductForBarcode, barcodeCopies, batchSelectedIds, products]);

  // Paginate report products to exact A4 pages so rows are never sliced in half
  const reportPages = useMemo(() => {
    const total = reportProducts.length;
    if (total === 0) {
      return [{
        pageNumber: 1,
        items: [] as Product[],
        startIndex: 0,
        isFirst: true,
        isLast: true
      }];
    }

    const pages: {
      pageNumber: number;
      items: Product[];
      startIndex: number;
      isFirst: boolean;
      isLast: boolean;
    }[] = [];

    let currentIndex = 0;
    let pageNum = 1;

    while (currentIndex < total) {
      const isFirst = pageNum === 1;
      const remaining = total - currentIndex;
      // Page 1 has store header + KPI cards, so fits ~14 rows
      // Continuation pages fit ~20 rows
      const maxCapacity = isFirst ? 14 : 20;

      if (remaining <= maxCapacity) {
        // If remaining is tight for signatures on the last page (~4 rows needed)
        if (remaining > (isFirst ? 10 : 15)) {
          const count = isFirst ? 10 : 15;
          pages.push({
            pageNumber: pageNum,
            items: reportProducts.slice(currentIndex, currentIndex + count),
            startIndex: currentIndex,
            isFirst,
            isLast: false
          });
          currentIndex += count;
          pageNum++;
        } else {
          pages.push({
            pageNumber: pageNum,
            items: reportProducts.slice(currentIndex, total),
            startIndex: currentIndex,
            isFirst,
            isLast: true
          });
          currentIndex = total;
        }
      } else {
        pages.push({
          pageNumber: pageNum,
          items: reportProducts.slice(currentIndex, currentIndex + maxCapacity),
          startIndex: currentIndex,
          isFirst,
          isLast: false
        });
        currentIndex += maxCapacity;
        pageNum++;
      }
    }

    if (pages.length > 0) {
      pages[pages.length - 1].isLast = true;
    }

    return pages;
  }, [reportProducts]);

  // Paginate barcode stickers so they never get sliced across A4 sheets
  const barcodePages = useMemo(() => {
    if (barcodeLayout === 'single-sticker') {
      return printBarcodeList.map((item, idx) => ({
        pageNumber: idx + 1,
        items: [item]
      }));
    } else {
      const pages: { pageNumber: number; items: Product[] }[] = [];
      const pageSize = 24; // 3 columns x 8 rows
      for (let i = 0; i < printBarcodeList.length; i += pageSize) {
        pages.push({
          pageNumber: Math.floor(i / pageSize) + 1,
          items: printBarcodeList.slice(i, i + pageSize)
        });
      }
      return pages.length > 0 ? pages : [{ pageNumber: 1, items: [] }];
    }
  }, [printBarcodeList, barcodeLayout]);

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all shadow-sm";

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">
      {/* Scoped Print CSS */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Hide sidebar, headers, and UI elements */
          aside, nav, header, .no-print, [role="navigation"] {
            display: none !important;
          }
          .print-modal-container {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
            z-index: 99999 !important;
          }
          .print-modal-card {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .print-sheet {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .pdf-page, .pdf-barcode-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .no-print-area {
            display: none !important;
          }
          .barcode-sticker {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      {/* Main Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 no-print">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">คลังสินค้า</h1>
          <p className="text-slate-500 font-medium">จัดการสต็อก พิมพ์บาร์โค้ด นำเข้าและส่งออกข้อมูล Excel / PDF</p>
        </div>
        
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Download Sample Template Excel */}
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 hover:text-primary-600 transition-all shadow-xs"
              title="ดาวน์โหลดไฟล์ตัวอย่าง Excel สำหรับนำเข้าข้อมูล"
            >
              <ArrowDownToLine size={16} className="text-primary-600" />
              <span>ไฟล์ตัวอย่าง Excel</span>
            </button>

            {/* Export Stock to Excel */}
            <button
              onClick={handleExportStockExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-emerald-700 border border-emerald-200 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-all shadow-xs"
              title="ส่งออกรายการสต็อกสินค้าเป็นไฟล์ Excel"
            >
              <FileSpreadsheet size={16} className="text-emerald-600" />
              <span>ส่งออก Excel</span>
            </button>

            {/* Export Stock to PDF / Print Report */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-xs"
              title="เปิดรายงานสต็อกสินค้าสำหรับพิมพ์หรือบันทึกเป็น PDF"
            >
              <FileText size={16} className="text-indigo-600" />
              <span>พิมพ์รายงานสต็อก (PDF)</span>
            </button>

            {/* Batch Print Barcode */}
            <button
              onClick={openBatchBarcodeModal}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-amber-700 border border-amber-200 rounded-xl font-bold text-sm hover:bg-amber-50 transition-all shadow-xs"
              title="พิมพ์สติกเกอร์บาร์โค้ดสินค้าหลายรายการพร้อมกัน"
            >
              <Printer size={16} className="text-amber-600" />
              <span>พิมพ์บาร์โค้ด</span>
            </button>

            {/* Excel Import Feature */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleExcelUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm"
              title="อัปโหลดไฟล์ Excel เพื่อนำเข้าหรืออัปเดตสต็อก"
            >
              {isProcessingExcel ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
              <span>นำเข้าจาก Excel</span>
            </button>

            {/* View Switcher */}
            <div className="flex bg-white p-1 rounded-xl shadow-xs border border-slate-200">
              <button 
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${view === 'list' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <List size={16} /> รายการ
              </button>
              <button 
                onClick={() => setView('restock')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${view === 'restock' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <PackagePlus size={16} /> เติมสต็อก
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Search and Add Product Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหาสินค้า ชื่อ, บาร์โค้ด, หมวดหมู่..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 shadow-sm outline-none font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {view === 'list' && isAdmin && (
          <button 
            onClick={() => openModal()} 
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-2 shrink-0 active:scale-95"
          >
            <Plus size={20} /> เพิ่มสินค้าใหม่
          </button>
        )}
      </div>

      {/* Content View */}
      {view === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden no-print">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest">สินค้า</th>
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">บาร์โค้ด</th>
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">ราคาขาย</th>
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">สต็อก</th>
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-slate-400">
                      ไม่พบข้อมูลสินค้าที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(product => (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shadow-xs border border-slate-200 shrink-0">
                            <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={product.name} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{product.name}</p>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{product.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-center">
                         {product.barcode ? (
                            <div 
                              onClick={() => openSingleBarcodeModal(product)}
                              className="inline-flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 p-2 rounded-xl transition-colors group/barcode"
                              title="คลิกเพื่อสั่งพิมพ์สติกเกอร์บาร์โค้ดสินค้านี้"
                            >
                               <Barcode value={product.barcode} height={30} width={1.2} displayValue={false} className="bg-transparent p-0" />
                               <span className="text-[10px] font-mono font-bold text-slate-500 group-hover/barcode:text-primary-600 flex items-center gap-1">
                                 {product.barcode}
                                 <Printer size={12} className="opacity-0 group-hover/barcode:opacity-100 transition-opacity" />
                               </span>
                            </div>
                         ) : (
                            <span className="text-xs text-slate-300 italic">ไม่มีบาร์โค้ด</span>
                         )}
                      </td>
                      <td className="p-5 text-center">
                        <div className="text-base font-black text-primary-600">{storeConfig.currency}{product.price.toFixed(2)}</div>
                        {product.costPrice ? (
                          <div className="text-[11px] text-slate-400">ทุน: {storeConfig.currency}{product.costPrice.toFixed(2)}</div>
                        ) : null}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-black shadow-xs inline-block ${
                          product.stock === 0 
                            ? 'bg-red-500 text-white' 
                            : product.stock < (storeConfig.lowStockThreshold || 10) 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                              {product.barcode && (
                                <button 
                                  onClick={() => openSingleBarcodeModal(product)} 
                                  className="p-2.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" 
                                  title="พิมพ์สติกเกอร์บาร์โค้ด"
                                >
                                  <Printer size={18} />
                                </button>
                              )}
                              <button 
                                onClick={() => openModal(product)} 
                                className="p-2.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all" 
                                title="แก้ไขสินค้า"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteClick(product.id, product.name)} 
                                className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" 
                                title="ลบสินค้า"
                              >
                                <Trash2 size={18} />
                              </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Restock View */
        <div className="space-y-6 no-print">
          <div className="flex gap-2">
            <button 
              onClick={() => setRestockFilter('all')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${restockFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              ทั้งหมด
            </button>
            <button 
              onClick={() => setRestockFilter('low')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${restockFilter === 'low' ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              ใกล้หมด (&lt; {storeConfig.lowStockThreshold || 10})
            </button>
            <button 
              onClick={() => setRestockFilter('out')}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${restockFilter === 'out' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              หมดสต็อก (0)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                <div className="flex gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border shrink-0">
                    <img src={product.image} className="w-full h-full object-cover" alt={product.name} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">{product.name}</h3>
                    <p className="text-xs text-slate-400">{product.category}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-black ${
                        product.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        คงเหลือ: {product.stock}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                  <input 
                    type="number" 
                    min="1"
                    placeholder="จำนวน"
                    className="w-24 p-2 bg-slate-50 border rounded-xl font-bold text-center text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    value={restockAmounts[product.id] || ''}
                    onChange={(e) => setRestockAmounts({...restockAmounts, [product.id]: parseInt(e.target.value) || 0})}
                  />
                  <button 
                    onClick={() => handleRestock(product)}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Plus size={16} /> เติมสต็อก
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. Barcode Print Modal */}
      {/* ========================================================= */}
      {isBarcodeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto print-modal-container">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-6 relative max-h-[92vh] flex flex-col print-modal-card">
            
            {/* Modal Controls (Hidden during print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 no-print-area">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Printer size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">สั่งพิมพ์สติกเกอร์บาร์โค้ด</h2>
                  <p className="text-xs text-slate-500">
                    {barcodePrintMode === 'single' && selectedProductForBarcode 
                      ? `สินค้า: ${selectedProductForBarcode.name} (${selectedProductForBarcode.barcode})`
                      : `เลือกพิมพ์บาร์โค้ดรวม ${printBarcodeList.length} ฉลาก`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadBarcodePdf}
                  disabled={isGeneratingBarcodePdf}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                >
                  {isGeneratingBarcodePdf ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                  <span>{isGeneratingBarcodePdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดสติกเกอร์เป็น PDF'}</span>
                </button>
                <button
                  onClick={() => triggerBrowserPrint('barcode')}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                  title="สั่งพิมพ์ออกเครื่องพิมพ์"
                >
                  <Printer size={16} /> สั่งพิมพ์
                </button>
                <button 
                  onClick={() => setIsBarcodeModalOpen(false)} 
                  className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={18}/>
                </button>
              </div>
            </div>

            {/* Print Options Toolbar (Hidden during print) */}
            <div className="py-3 px-4 bg-slate-50 rounded-2xl border border-slate-200 my-4 flex flex-wrap items-center justify-between gap-4 no-print-area text-xs font-bold text-slate-700">
              {/* Layout Mode */}
              <div className="flex items-center gap-2">
                <span>รูปแบบสติกเกอร์:</span>
                <button
                  onClick={() => setBarcodeLayout('a4-grid')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${barcodeLayout === 'a4-grid' ? 'bg-primary-600 text-white' : 'bg-white border text-slate-600'}`}
                >
                  แผ่น A4 (ตาราง 3 คอลัมน์)
                </button>
                <button
                  onClick={() => setBarcodeLayout('single-sticker')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${barcodeLayout === 'single-sticker' ? 'bg-primary-600 text-white' : 'bg-white border text-slate-600'}`}
                >
                  ฉลากเดี่ยว / ม้วนความร้อน (50x30mm)
                </button>
              </div>

              {/* Single item copy quantity */}
              {barcodePrintMode === 'single' ? (
                <div className="flex items-center gap-2">
                  <span>จำนวนฉลากที่พิมพ์:</span>
                  <input 
                    type="number" 
                    min="1" 
                    max="100"
                    className="w-16 p-1 border rounded text-center bg-white font-bold"
                    value={barcodeCopies}
                    onChange={(e) => setBarcodeCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <div className="flex gap-1">
                    {[1, 6, 12, 24].map(num => (
                      <button
                        key={num}
                        onClick={() => setBarcodeCopies(num)}
                        className={`px-2 py-1 rounded text-[11px] ${barcodeCopies === num ? 'bg-primary-100 text-primary-700' : 'bg-white border text-slate-500'}`}
                      >
                        {num}
                      </button>
                    ))}
                    {selectedProductForBarcode?.stock ? (
                      <button
                        onClick={() => setBarcodeCopies(selectedProductForBarcode.stock)}
                        className="px-2 py-1 rounded text-[11px] bg-amber-50 text-amber-700 border border-amber-200"
                        title="พิมพ์ตามจำนวนสต็อกที่มีอยู่"
                      >
                        ตามสต็อก ({selectedProductForBarcode.stock})
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                /* Batch mode controls */
                <div className="flex items-center gap-2">
                  <span>ตั้งค่าจำนวนพิมพ์ทั้งชุด:</span>
                  <button
                    onClick={() => {
                      const updated: Record<string, number> = {};
                      products.forEach(p => { if (p.barcode) updated[p.id] = 1; });
                      setBatchSelectedIds(updated);
                    }}
                    className="px-2.5 py-1 bg-white border rounded text-slate-600 hover:bg-slate-100"
                  >
                    1 ใบทุกสินค้า
                  </button>
                  <button
                    onClick={() => {
                      const updated: Record<string, number> = {};
                      products.forEach(p => { if (p.barcode) updated[p.id] = p.stock || 1; });
                      setBatchSelectedIds(updated);
                    }}
                    className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                  >
                    ตามสต็อกจริง
                  </button>
                </div>
              )}

              {/* Toggles */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={barcodeShowStoreName} 
                    onChange={e => setBarcodeShowStoreName(e.target.checked)} 
                    className="rounded text-primary-600"
                  />
                  <span>แสดงชื่อร้าน</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={barcodeShowPrice} 
                    onChange={e => setBarcodeShowPrice(e.target.checked)} 
                    className="rounded text-primary-600"
                  />
                  <span>แสดงราคา</span>
                </label>
              </div>
            </div>

            {/* Live Print Preview Sheet */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 rounded-2xl border border-slate-200">
              <div ref={barcodePrintRef} className="print-sheet mx-auto">
                {printBarcodeList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 bg-white rounded-2xl p-8 max-w-md mx-auto shadow-sm">
                    <AlertCircle size={36} className="mx-auto mb-2 opacity-30" />
                    <p>ไม่มีรายการบาร์โค้ดที่จะพิมพ์</p>
                  </div>
                ) : (
                  barcodePages.map((page) => (
                    <div 
                      key={page.pageNumber}
                      className={`pdf-barcode-page bg-white shadow-lg mx-auto mb-8 relative ${
                        barcodeLayout === 'single-sticker' 
                          ? 'p-2 flex items-center justify-center rounded-xl' 
                          : 'p-6 rounded-2xl'
                      }`}
                      style={
                        barcodeLayout === 'single-sticker'
                          ? { width: '60mm', height: '40mm', boxSizing: 'border-box' }
                          : { width: '210mm', minHeight: '297mm', maxHeight: '297mm', boxSizing: 'border-box' }
                      }
                    >
                      {barcodeLayout === 'single-sticker' ? (
                        <div className="border border-slate-300 rounded-xl p-2.5 flex flex-col items-center justify-between text-center w-full h-full bg-white box-border">
                          {barcodeShowStoreName && (
                            <div className="text-[10px] font-bold text-slate-500 uppercase truncate w-full">
                              {storeConfig.name || 'NovaPOS'}
                            </div>
                          )}
                          <div className="text-sm font-black text-slate-900 truncate w-full px-1 my-0.5 leading-snug">
                            {page.items[0]?.name}
                          </div>
                          <div className="my-0.5 flex items-center justify-center w-full overflow-hidden">
                            <Barcode value={page.items[0]?.barcode || ''} height={26} width={1.1} displayValue={false} className="p-0 bg-transparent" />
                          </div>
                          <div className="text-[10px] font-mono font-bold tracking-widest text-slate-700">
                            {page.items[0]?.barcode}
                          </div>
                          {barcodeShowPrice && (
                            <div className="text-sm font-black text-slate-900 mt-0.5">
                              {storeConfig.currency}{Number(page.items[0]?.price || 0).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 h-full content-start">
                          {page.items.map((item, sIdx) => (
                            <div 
                              key={sIdx} 
                              className="barcode-sticker border border-slate-200 rounded-xl p-2 flex flex-col items-center justify-between text-center bg-white shadow-2xs hover:border-primary-400 transition-colors"
                              style={{ height: '33.5mm', boxSizing: 'border-box' }}
                            >
                              {barcodeShowStoreName && (
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate w-full mb-0.5">
                                  {storeConfig.name || 'NovaPOS'}
                                </div>
                              )}
                              {/* Large & Prominent Product Name with standard truncate (no line-clamp to prevent html2canvas overlap) */}
                              <div className="text-[13px] font-black text-slate-900 truncate w-full px-0.5 leading-snug my-0.5">
                                {item.name}
                              </div>
                              <div className="my-0.5 flex items-center justify-center w-full overflow-hidden">
                                <Barcode value={item.barcode} height={24} width={1.05} displayValue={false} className="p-0 bg-transparent" />
                              </div>
                              <div className="text-[10px] font-mono tracking-widest text-slate-700 font-bold">
                                {item.barcode}
                              </div>
                              {barcodeShowPrice && (
                                <div className="text-xs font-black text-slate-900 mt-0.5">
                                  {storeConfig.currency}{Number(item.price).toFixed(2)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer (Hidden during print) */}
            <div className="mt-4 flex justify-between items-center no-print-area pt-2">
              <span className="text-xs font-bold text-slate-500">
                รวมทั้งหมด {printBarcodeList.length} ฉลาก
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBarcodeModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  onClick={() => triggerBrowserPrint('barcode')}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <Printer size={16} /> สั่งพิมพ์
                </button>
                <button
                  onClick={handleDownloadBarcodePdf}
                  disabled={isGeneratingBarcodePdf}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm disabled:opacity-70"
                >
                  {isGeneratingBarcodePdf ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                  <span>{isGeneratingBarcodePdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลดสติกเกอร์เป็น PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. Stock Report (PDF / Print) Modal */}
      {/* ========================================================= */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto print-modal-container">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-6 relative max-h-[94vh] flex flex-col print-modal-card">
            
            {/* Modal Controls (Hidden during print) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 no-print-area">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">รายงานสรุปสต็อกสินค้าคงคลัง (Inventory Report)</h2>
                  <p className="text-xs text-slate-500">
                    สามารถดาวน์โหลดไฟล์ PDF หรือสั่งพิมพ์ออกเครื่องพิมพ์ได้ทันที
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadReportPdf}
                  disabled={isGeneratingPdf}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-70"
                >
                  {isGeneratingPdf ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                  <span>{isGeneratingPdf ? 'กำลังสร้างไฟล์ PDF...' : 'ดาวน์โหลดไฟล์ PDF'}</span>
                </button>
                <button
                  onClick={() => triggerBrowserPrint('report')}
                  className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                  title="สั่งพิมพ์ออกเครื่องพิมพ์"
                >
                  <Printer size={16} /> สั่งพิมพ์
                </button>
                <button 
                  onClick={() => setIsReportModalOpen(false)} 
                  className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={18}/>
                </button>
              </div>
            </div>

            {/* Filter Controls (Hidden during print) */}
            <div className="py-3 px-4 bg-slate-50 rounded-2xl border border-slate-200 my-4 flex flex-wrap items-center justify-between gap-4 no-print-area text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <span>กรองสถานะสต็อก:</span>
                <button
                  onClick={() => setReportFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${reportFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'}`}
                >
                  สินค้าทั้งหมด ({products.length})
                </button>
                <button
                  onClick={() => setReportFilter('low')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${reportFilter === 'low' ? 'bg-amber-500 text-white' : 'bg-white border text-slate-600'}`}
                >
                  ใกล้หมด (&lt; {storeConfig.lowStockThreshold || 10})
                </button>
                <button
                  onClick={() => setReportFilter('out')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${reportFilter === 'out' ? 'bg-red-500 text-white' : 'bg-white border text-slate-600'}`}
                >
                  หมดสต็อก (0)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span>หมวดหมู่:</span>
                <select
                  value={reportCategory}
                  onChange={e => setReportCategory(e.target.value)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none"
                >
                  <option value="all">ทุกหมวดหมู่ ({categories.length})</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Printable Report Sheet */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 rounded-2xl border border-slate-200">
              <div ref={stockReportPrintRef} className="print-sheet mx-auto">
                {reportPages.map((page) => (
                  <div 
                    key={page.pageNumber} 
                    className="pdf-page bg-white shadow-lg mx-auto mb-8 relative flex flex-col justify-between rounded-xl"
                    style={{ 
                      width: '210mm', 
                      minHeight: '297mm', 
                      maxHeight: '297mm', 
                      padding: '12mm 14mm 10mm 14mm', 
                      boxSizing: 'border-box' 
                    }}
                  >
                    <div className="flex-1">
                      {page.isFirst ? (
                        <>
                          <div className="border-b-2 border-slate-800 pb-3 mb-3 flex justify-between items-start">
                            <div>
                              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                                {storeConfig.name || 'NovaPOS'}
                              </h1>
                              <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                                {storeConfig.address || 'ที่อยู่ร้านค้าไม่ได้ระบุ'}
                                {storeConfig.phone ? ` • โทร: ${storeConfig.phone}` : ''}
                                {storeConfig.taxId ? ` • เลขประจำตัวผู้เสียภาษี: ${storeConfig.taxId}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black rounded-lg uppercase tracking-wider mb-1">
                                รายงานสต็อกสินค้าคงคลัง
                              </span>
                              <p className="text-xs text-slate-500 font-medium">
                                วันที่ออกรายงาน: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <p className="text-xs text-slate-400">
                                ผู้จัดทำ: {currentUser?.name || 'ผู้ดูแลระบบ'}
                              </p>
                            </div>
                          </div>

                          {/* 4 Summary Metric Cards */}
                          <div className="grid grid-cols-4 gap-2.5 mb-3.5">
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">รายการสินค้า</span>
                              <span className="text-base font-black text-slate-800">{reportMetrics.totalSKUs} รายการ</span>
                            </div>
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">จำนวนในสต็อก</span>
                              <span className="text-base font-black text-slate-800">{reportMetrics.totalQty.toLocaleString()} ชิ้น</span>
                            </div>
                            <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
                              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">มูลค่าสต็อกราคาทุน</span>
                              <span className="text-base font-black text-amber-700">{storeConfig.currency}{reportMetrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">มูลค่าสต็อกราคาขาย</span>
                              <span className="text-base font-black text-emerald-700">{storeConfig.currency}{reportMetrics.totalRetail.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Running Header on Continuation Pages */
                        <div className="border-b border-slate-300 pb-2 mb-3 flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2 font-bold text-slate-800">
                            <span className="font-black">{storeConfig.name || 'NovaPOS'}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">รายงานสรุปสต็อกสินค้าคงคลัง (Inventory Valuation Report)</span>
                          </div>
                          <div className="text-slate-400 text-[11px]">
                            {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      )}

                      {/* Table */}
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-y-2 border-slate-300 font-bold text-slate-700 text-[11px]">
                            <th className="py-2 px-2 text-center w-8">ที่</th>
                            <th className="py-2 px-2.5 w-28">บาร์โค้ด</th>
                            <th className="py-2 px-2.5">ชื่อสินค้า</th>
                            <th className="py-2 px-2 w-28">หมวดหมู่</th>
                            <th className="py-2 px-2 text-right w-16">ทุน</th>
                            <th className="py-2 px-2 text-right w-16">ขาย</th>
                            <th className="py-2 px-2 text-center w-14">คงเหลือ</th>
                            <th className="py-2 px-2.5 text-right w-24">มูลค่าทุน</th>
                            <th className="py-2 px-2 text-center w-16">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px]">
                          {page.items.map((p, itemIdx) => {
                            const globalIdx = page.startIndex + itemIdx;
                            const cost = Number(p.costPrice) || 0;
                            const price = Number(p.price) || 0;
                            const stock = Number(p.stock) || 0;
                            const rowCostVal = cost * stock;
                            const isLow = stock < (storeConfig.lowStockThreshold || 10) && stock > 0;
                            const isOut = stock === 0;

                            return (
                              <tr key={p.id} className={itemIdx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                                <td className="py-1.5 px-2 text-center text-slate-400 font-medium">{globalIdx + 1}</td>
                                <td className="py-1.5 px-2.5 font-mono text-[10px] text-slate-600 truncate">{p.barcode || '-'}</td>
                                <td className="py-1.5 px-2.5 font-bold text-slate-800 truncate max-w-[210px]">{p.name}</td>
                                <td className="py-1.5 px-2 text-slate-500 truncate max-w-[100px]">{p.category || '-'}</td>
                                <td className="py-1.5 px-2 text-right font-medium">{cost.toFixed(2)}</td>
                                <td className="py-1.5 px-2 text-right font-bold text-slate-800">{price.toFixed(2)}</td>
                                <td className="py-1.5 px-2 text-center font-bold">
                                  <span className={isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-800'}>
                                    {stock}
                                  </span>
                                </td>
                                <td className="py-1.5 px-2.5 text-right font-bold text-slate-800">
                                  {rowCostVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  {isOut ? (
                                    <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">หมด</span>
                                  ) : isLow ? (
                                    <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">ใกล้หมด</span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-emerald-600">ปกติ</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {page.isLast && (
                          <tfoot>
                            <tr className="bg-slate-100 border-t-2 border-slate-400 font-black text-slate-900 text-[11px]">
                              <td colSpan={6} className="py-2 px-3 text-right">รวมทั้งสิ้น ({reportMetrics.totalSKUs} รายการ):</td>
                              <td className="py-2 px-2 text-center text-primary-700 font-black">{reportMetrics.totalQty.toLocaleString()}</td>
                              <td className="py-2 px-2.5 text-right text-amber-700 font-black">
                                {storeConfig.currency}{reportMetrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>

                      {/* Signature Section on Final Page */}
                      {page.isLast && (
                        <div className="grid grid-cols-2 gap-8 pt-5 mt-4 border-t border-slate-200 text-center text-xs">
                          <div>
                            <div className="w-44 border-b border-slate-400 mx-auto mb-1.5"></div>
                            <p className="font-bold text-slate-700">ลงชื่อ .....................................................</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">(ผู้จัดทำรายงาน / พนักงานตรวจนับ)</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">วันที่ ..... / ..... / ..........</p>
                          </div>
                          <div>
                            <div className="w-44 border-b border-slate-400 mx-auto mb-1.5"></div>
                            <p className="font-bold text-slate-700">ลงชื่อ .....................................................</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">(ผู้ตรวจสอบ / ผู้จัดการร้านค้า)</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">วันที่ ..... / ..... / ..........</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Footer */}
                    <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-[10px] text-slate-400">
                      <span>NovaPOS - ระบบบริหารจัดการสต็อกสินค้า • วันที่พิมพ์ {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">หน้า {page.pageNumber} จาก {reportPages.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer (Hidden during print) */}
            <div className="mt-4 flex justify-between items-center no-print-area pt-2">
              <span className="text-xs font-bold text-slate-500">
                รวมแสดงผล {reportProducts.length} รายการ
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  onClick={() => triggerBrowserPrint('report')}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <Printer size={16} /> สั่งพิมพ์
                </button>
                <button
                  onClick={handleDownloadReportPdf}
                  disabled={isGeneratingPdf}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm disabled:opacity-70"
                >
                  {isGeneratingPdf ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                  <span>{isGeneratingPdf ? 'กำลังสร้างไฟล์ PDF...' : 'ดาวน์โหลดไฟล์ PDF'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. Excel Import Modal */}
      {/* ========================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200 no-print">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-6 md:p-8 relative max-h-[90vh] flex flex-col">
            <button onClick={() => setIsImportModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <FileSpreadsheet className="text-emerald-600" size={28} />
                ตรวจสอบการนำเข้าสต็อก
              </h2>
              <p className="text-slate-500 text-sm mt-1">ระบบตรวจพบข้อมูลดังนี้ กรุณาตรวจสอบก่อนกดยืนยัน</p>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 border rounded-2xl bg-slate-50">
              <table className="w-full text-left">
                <thead className="bg-white border-b sticky top-0">
                  <tr>
                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">ประเภท</th>
                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest">ข้อมูลสินค้า</th>
                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">ราคา</th>
                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">ต้นทุน</th>
                    <th className="p-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">สต็อกใหม่</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.map((item, idx) => (
                    <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        {item.action === 'add' ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg uppercase">เพิ่มใหม่</span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg uppercase">อัปเดต</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden shrink-0 border">
                             {item.data.image && <img src={item.data.image} className="w-full h-full object-cover" alt="" />}
                           </div>
                           <div>
                              <p className="text-sm font-bold text-slate-800">{item.data.name}</p>
                              <p className="text-[10px] font-mono text-slate-400">Barcode: {item.data.barcode || '-'}</p>
                           </div>
                        </div>
                      </td>
                      <td className="p-4 text-center text-sm font-medium">{storeConfig.currency}{Number(item.data.price).toFixed(2)}</td>
                      <td className="p-4 text-center text-sm text-slate-500">{storeConfig.currency}{Number(item.data.costPrice).toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                           <span className="text-sm font-black text-primary-600">{item.data.stock}</span>
                           {item.action === 'update' && item.original && (
                             <span className="text-[10px] text-slate-400 line-through">เดิม: {item.original.stock}</span>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <button 
                onClick={downloadTemplate}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-800 text-sm font-bold transition-colors"
              >
                <Download size={18} /> ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)
              </button>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 sm:flex-none px-6 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-white transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmImport}
                  className="flex-1 sm:flex-none px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} /> ยืนยันนำเข้าทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. Product Add/Edit Modal */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
            <h2 className="text-2xl font-black mb-8 text-slate-900 tracking-tight flex items-center gap-3">
               {editingId ? <Edit size={24} className="text-primary-600"/> : <Plus size={24} className="text-primary-600"/>}
               {editingId ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">ชื่อสินค้า</label>
                  <input required type="text" className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">หมวดหมู่</label>
                  <input required type="text" list="categories" className={inputClass} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                  <datalist id="categories">
                     <option value="อุปกรณ์เครื่องเขียน" />
                     <option value="เครื่องดื่ม" />
                     <option value="อาหาร" />
                     <option value="ขนม" />
                     <option value="เบเกอรี่" />
                     <option value="ของใช้ทั่วไป" />
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">ทุน</label>
                  <input required type="number" step="0.01" className={inputClass} value={formData.costPrice} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">ขาย</label>
                  <input required type="number" step="0.01" className={`${inputClass} font-bold text-primary-600`} value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">สต็อก</label>
                  <input required type="number" className={`${inputClass} font-bold`} value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                   <span>รูปภาพสินค้า</span>
                   <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button type="button" onClick={() => setImageInputMode('url')} className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${imageInputMode === 'url' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-400'}`}>ลิงก์ URL</button>
                      <button type="button" onClick={() => setImageInputMode('upload')} className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${imageInputMode === 'upload' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-400'}`}>อัปโหลด</button>
                   </div>
                </label>
                
                <div className="space-y-4">
                   <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white shrink-0">
                         {formData.image ? <img src={formData.image} className="w-full h-full object-cover" alt="" /> : <PackageSearch className="w-full h-full p-6 text-slate-200"/>}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {imageInputMode === 'url' ? (
                           <div className="relative">
                              <LinkIcon size={16} className="absolute left-3 top-3 text-slate-400" />
                              <input 
                                 type="text" 
                                 placeholder="วางลิงก์รูปภาพ (https://...)" 
                                 className={`${inputClass} pl-9 text-xs`}
                                 value={formData.image.startsWith('data:') ? '' : formData.image}
                                 onChange={e => setFormData({...formData, image: e.target.value})}
                              />
                           </div>
                        ) : (
                           <div className="relative">
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                              <button type="button" className="w-full bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
                                 <Upload size={16} /> เลือกไฟล์รูปภาพ
                              </button>
                           </div>
                        )}
                      </div>
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">บาร์โค้ด</label>
                <div className="flex gap-2">
                   <input type="text" className={inputClass} value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} placeholder="สแกนหรือกรอกบาร์โค้ด..." />
                   <button type="button" onClick={handleManualBarcodeGenerate} className="bg-primary-50 text-primary-600 p-2.5 rounded-xl border border-primary-100 hover:bg-primary-100 shadow-sm transition-colors" title="สุ่มรหัสบาร์โค้ดอัตโนมัติ"><Wand2 size={20}/></button>
                </div>
                {formData.barcode && (
                   <div className="mt-3 flex flex-col items-center p-3 bg-slate-50 border border-slate-200 rounded-2xl animate-in zoom-in-95">
                      <Barcode value={formData.barcode} height={50} width={1.5} className="bg-transparent" />
                      <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Preview Barcode Image</p>
                   </div>
                )}
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 font-bold text-slate-500 transition-all">ยกเลิก</button>
                <button type="submit" className="flex-1 py-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 font-bold shadow-xl shadow-primary-200 transition-all active:scale-95">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. Delete Confirmation Modal */}
      {/* ========================================================= */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md no-print">
          <div className="bg-white w-full max-sm rounded-3xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 text-center">
             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 mb-6 text-red-500">
                <Trash2 size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-2">ยืนยันการลบสินค้า?</h3>
             <p className="text-sm text-slate-500 mb-8 px-4">ต้องการลบ "{deleteConfirmation.name}" ออกจากระบบอย่างถาวรหรือไม่?</p>
             <div className="flex gap-3">
                <button 
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })} 
                  className="flex-1 py-3 border-2 border-slate-100 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button 
                  disabled={isDeleting}
                  onClick={confirmDelete} 
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-xl shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      กำลังลบ...
                    </>
                  ) : (
                    'ยืนยันการลบ'
                  )}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
