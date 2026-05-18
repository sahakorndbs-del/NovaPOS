
import React, { useState, useMemo, useRef } from 'react';
import { useStore } from '../context/StoreContext.tsx';
import { Product } from '../types.ts';
import { 
  Edit, Trash2, Plus, X, List, Upload, ScanLine, 
  Search, PackagePlus, CheckCircle2, PackageSearch, 
  Wand2, Link as LinkIcon, FileSpreadsheet, Download, RefreshCw, AlertCircle, Save
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Barcode from './Barcode.tsx';

interface ExcelImportRow {
  id?: string | number;
  name: string;
  barcode?: string | number;
  category: string;
  stock: number | string;
  price: number | string;
  costPrice: number | string;
  image?: string;
  description?: string;
}

interface PreviewItem {
  action: 'add' | 'update';
  data: Product;
  original?: Product;
}

const ProductManagement: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, storeConfig, currentUser } = useStore();
  const [view, setView] = useState<'list' | 'restock'>('list');
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

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({ isOpen: false, id: null, name: '' });

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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (view === 'restock') {
        if (restockFilter === 'low') return matchesSearch && p.stock < storeConfig.lowStockThreshold && p.stock > 0;
        if (restockFilter === 'out') return matchesSearch && p.stock === 0;
      }
      return matchesSearch;
    });
  }, [products, searchQuery, view, restockFilter, storeConfig.lowStockThreshold]);

  // Excel Import Logic
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

        const previewList: PreviewItem[] = data.map((row) => {
          const rowId = row.id?.toString() || '';
          const rowBarcode = row.barcode?.toString() || '';
          
          // Try to find existing product by ID or Barcode
          let existing = products.find(p => p.id === rowId);
          if (!existing && rowBarcode) {
            existing = products.find(p => p.barcode === rowBarcode);
          }

          const productData: Product = {
            id: existing ? existing.id : (rowId || Date.now().toString() + Math.random().toString(36).substr(2, 5)),
            name: row.name || 'ไม่มีชื่อสินค้า',
            barcode: rowBarcode,
            category: row.category || 'ทั่วไป',
            stock: Number(row.stock) || 0,
            price: Number(row.price) || 0,
            costPrice: Number(row.costPrice) || 0,
            image: row.image || '',
            description: row.description || ''
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

  const downloadTemplate = () => {
    const headers = [
      { id: '123', name: 'สินค้าตัวอย่าง', barcode: '885000000', category: 'เครื่องดื่ม', stock: 100, price: 20, costPrice: 15, image: 'https://...', description: 'คำอธิบาย...' }
    ];
    const ws = XLSX.utils.json_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");
    XLSX.writeFile(wb, "NovaPOS_Template.xlsx");
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
      setImageInputMode(product.image.startsWith('data:') ? 'upload' : 'url');
    } else {
      setEditingId(null);
      setFormData({ name: '', price: 0, costPrice: 0, category: '', stock: 0, image: '', description: '', barcode: '' });
      setImageInputMode('url');
    }
    setIsModalOpen(true);
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

  const confirmDelete = () => {
    if (deleteConfirmation.id) {
      deleteProduct(deleteConfirmation.id);
    }
    setDeleteConfirmation({ isOpen: false, id: null, name: '' });
  };

  const handleRestock = (product: Product) => {
    const amount = restockAmounts[product.id] || 0;
    if (amount <= 0) return;
    updateProduct({ ...product, stock: product.stock + amount });
    setRestockAmounts(prev => ({ ...prev, [product.id]: 0 }));
  };

  const inputClass = "w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all shadow-sm";

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">คลังสินค้า</h1>
          <p className="text-slate-500 font-medium">จัดการสต็อกและอัปโหลดข้อมูลจาก Excel</p>
        </div>
        
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
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
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-all shadow-sm"
              title="อัปโหลดไฟล์ Excel ตามรูปแบบที่กำหนด"
            >
              {isProcessingExcel ? <RefreshCw className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
              นำเข้าจาก Excel
            </button>

            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <button 
                onClick={() => setView('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${view === 'list' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <List size={18} /> รายการ
              </button>
              <button 
                onClick={() => setView('restock')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${view === 'restock' ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <PackagePlus size={18} /> เติมสต็อก
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหาสินค้า..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 shadow-sm outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {view === 'list' && isAdmin && (
          <button 
            onClick={() => openModal()} 
            className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={20} /> เพิ่มสินค้าใหม่
          </button>
        )}
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
                    ไม่พบข้อมูลสินค้า
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shadow-sm border border-slate-200 shrink-0">
                          <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.name} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{product.name}</p>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{product.category}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                       {product.barcode ? (
                          <div className="flex flex-col items-center justify-center gap-1">
                             <Barcode value={product.barcode} height={30} width={1.2} displayValue={false} className="bg-transparent p-0" />
                             <span className="text-[9px] font-mono text-slate-400">{product.barcode}</span>
                          </div>
                       ) : (
                          <span className="text-xs text-slate-300 italic">ไม่มีบาร์โค้ด</span>
                       )}
                    </td>
                    <td className="p-5 text-center">
                      <div className="text-base font-black text-primary-600">{storeConfig.currency}{product.price.toFixed(2)}</div>
                    </td>
                    <td className="p-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm inline-block ${product.stock < storeConfig.lowStockThreshold ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                        {product.stock}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      {isAdmin && (
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(product)} className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"><Edit size={18} /></button>
                            <button onClick={() => handleDeleteClick(product.id, product.name)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:shadow-lg transition-all">
               <div className="flex gap-4 mb-6">
                  <img src={product.image} className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
                    <p className="text-xs text-slate-400 mb-2">{product.category}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-500 uppercase">สต็อก:</span>
                       <span className={`text-sm font-black ${product.stock < storeConfig.lowStockThreshold ? 'text-red-500' : 'text-emerald-600'}`}>{product.stock}</span>
                    </div>
                  </div>
               </div>
               <div className="mt-auto flex gap-3">
                  <input 
                    type="number" 
                    placeholder="จำนวนที่จะเพิ่ม..."
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold"
                    value={restockAmounts[product.id] || ''}
                    onChange={(e) => setRestockAmounts(prev => ({ ...prev, [product.id]: parseInt(e.target.value) || 0 }))}
                  />
                  <button 
                    onClick={() => handleRestock(product)}
                    className="bg-primary-600 text-white px-5 rounded-xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center shadow-lg shadow-primary-200"
                  >
                    <CheckCircle2 size={20} />
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Excel Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
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
                             {item.data.image && <img src={item.data.image} className="w-full h-full object-cover" />}
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
                className="flex items-center gap-2 text-slate-500 hover:text-primary-600 text-sm font-bold transition-colors"
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

      {/* Product Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
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
                     <option value="เครื่องดื่ม" />
                     <option value="อาหาร" />
                     <option value="ขนม" />
                     <option value="เบเกอรี่" />
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
                         {formData.image ? <img src={formData.image} className="w-full h-full object-cover" /> : <PackageSearch className="w-full h-full p-6 text-slate-200"/>}
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
                   <button type="button" onClick={handleManualBarcodeGenerate} className="bg-primary-50 text-primary-600 p-2.5 rounded-xl border border-primary-100 hover:bg-primary-100 shadow-sm transition-colors"><Wand2 size={20}/></button>
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

      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white w-full max-sm rounded-3xl shadow-2xl p-8 relative animate-in zoom-in-95 duration-200 text-center">
             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 mb-6 text-red-500">
                <Trash2 size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-2">ยืนยันการลบ?</h3>
             <p className="text-sm text-slate-500 mb-8 px-4">ต้องการลบ "{deleteConfirmation.name}" หรือไม่?</p>
             <div className="flex gap-3">
                <button onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })} className="flex-1 py-3 border-2 border-slate-100 rounded-xl font-bold text-slate-400">ยกเลิก</button>
                <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-xl shadow-red-200 transition-all">ยืนยัน</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
