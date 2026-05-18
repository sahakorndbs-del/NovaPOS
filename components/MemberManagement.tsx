
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Member } from '../types';
import { Search, Plus, Edit, Trash2, X, User, AlertTriangle, Stamp, Coins } from 'lucide-react';

const MemberManagement: React.FC = () => {
  const { members, addMember, updateMember, deleteMember, storeConfig } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string | null;
    name: string;
  }>({ isOpen: false, id: null, name: '' });

  const [formData, setFormData] = useState<Omit<Member, 'id' | 'registerDate'>>({
    name: '',
    phone: '',
    points: 0,
    stamps: 0
  });

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.phone.includes(searchQuery)
  );

  const openModal = (member?: Member) => {
    if (member) {
      setEditingId(member.id);
      setFormData({
        name: member.name,
        phone: member.phone,
        points: member.points,
        stamps: member.stamps || 0
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', phone: '', points: 0, stamps: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      // Preserve original data for update
      const original = members.find(m => m.id === editingId);
      if (original) {
        updateMember({
          ...original,
          ...formData
        });
      }
    } else {
      addMember({
        id: Date.now().toString(),
        registerDate: new Date().toISOString(),
        ...formData
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteConfirmation({ isOpen: true, id, name });
  };

  const confirmDelete = () => {
    if (deleteConfirmation.id) {
        deleteMember(deleteConfirmation.id);
        setDeleteConfirmation({ isOpen: false, id: null, name: '' });
    }
  };

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">จัดการสมาชิก</h1>
        <button 
          onClick={() => openModal()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> เพิ่มสมาชิก
        </button>
      </div>

      {storeConfig.loyaltySystem === 'none' && (
         <div className="mb-6 p-4 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> ระบบสะสมแต้ม/คะแนน ถูกปิดใช้งานในการตั้งค่า
         </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="ค้นหาด้วยชื่อ หรือ เบอร์โทรศัพท์..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-sm font-semibold text-slate-600">ลูกค้า</th>
              <th className="p-4 text-sm font-semibold text-slate-600">เบอร์โทรศัพท์</th>
              
              {storeConfig.loyaltySystem !== 'none' && (
                  <th className="p-4 text-sm font-semibold text-slate-600">
                      {storeConfig.loyaltySystem === 'points' ? 'คะแนนสะสม' : 'ดวงตราสะสม'}
                  </th>
              )}
              
              <th className="p-4 text-sm font-semibold text-slate-600">วันที่สมัคร</th>
              <th className="p-4 text-sm font-semibold text-slate-600 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">ไม่พบรายชื่อสมาชิก</td>
              </tr>
            ) : (
              filteredMembers.map(member => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                      <User size={16} />
                    </div>
                    <span className="font-medium text-slate-800">{member.name}</span>
                  </td>
                  <td className="p-4 text-slate-600 font-mono">{member.phone}</td>
                  
                  {storeConfig.loyaltySystem !== 'none' && (
                      <td className="p-4">
                        {storeConfig.loyaltySystem === 'points' ? (
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                                <Coins size={12} /> {member.points.toLocaleString()} แต้ม
                            </span>
                        ) : (
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                                <Stamp size={12} /> {member.stamps?.toLocaleString() || 0} ดวง
                            </span>
                        )}
                      </td>
                  )}

                  <td className="p-4 text-slate-500 text-sm">{new Date(member.registerDate).toLocaleDateString('th-TH')}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openModal(member)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteClick(member.id, member.name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl p-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
            <h2 className="text-xl font-bold mb-6">{editingId ? 'แก้ไขข้อมูลสมาชิก' : 'ลงทะเบียนสมาชิกใหม่'}</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อ-นามสกุล</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                <input required type="tel" className="w-full p-2 border rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              
              {/* Only show input relevant to active system, but keep data in state */}
              {storeConfig.loyaltySystem === 'points' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">คะแนนสะสม (แต้ม)</label>
                    <input type="number" className="w-full p-2 border rounded-lg bg-slate-50" value={formData.points} onChange={e => setFormData({...formData, points: parseInt(e.target.value) || 0})} />
                </div>
              )}

              {storeConfig.loyaltySystem === 'stamps' && (
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ดวงตราสะสม (Stamp)</label>
                    <input type="number" className="w-full p-2 border rounded-lg bg-slate-50" value={formData.stamps} onChange={e => setFormData({...formData, stamps: parseInt(e.target.value) || 0})} />
                 </div>
              )}

              {storeConfig.loyaltySystem === 'none' && (
                  <div className="p-3 bg-slate-50 rounded text-xs text-slate-500">
                      ข้อมูลคะแนนและดวงตราถูกซ่อนอยู่เนื่องจากปิดระบบสมาชิก
                  </div>
              )}

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">ยกเลิก</button>
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium shadow-md shadow-primary-200">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
             <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
             </div>
             <h3 className="text-lg font-bold text-center text-slate-900 mb-2">ยืนยันการลบสมาชิก</h3>
             <p className="text-sm text-center text-slate-500 mb-6 whitespace-pre-line">
                คุณแน่ใจหรือไม่ว่าต้องการลบสมาชิก <br/>
                <span className="font-bold text-slate-800">"{deleteConfirmation.name}"</span> ? <br/>
                ข้อมูลแต้มสะสมจะหายไปและกู้คืนไม่ได้
             </p>
             <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmation({ isOpen: false, id: null, name: '' })}
                  className="flex-1 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                >
                  ลบข้อมูล
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;
