
import React, { useState, useEffect } from 'react';
import { Store, AlertCircle, ShieldCheck, CheckSquare, Square, LogIn } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const REMEMBER_KEY = 'novapos_remembered_credentials';

const Login: React.FC = () => {
  const { loginWithGoogle } = useStore();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login detail error:", err);
      setError(`ไม่สามารถลงชื่อเข้าใช้ด้วย Google ได้: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary-600 rounded-full blur-[120px] opacity-10 animate-pulse"></div>
      <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-indigo-600 rounded-full blur-[120px] opacity-10 animate-pulse"></div>
      
      <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-10 rounded-[3rem] shadow-2xl w-full max-w-md text-white z-10 relative group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-30"></div>
        
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-primary-600 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary-900/40 transition-transform hover:scale-105">
            <Store size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">DBS POS</h1>
          <p className="text-slate-400 text-center font-medium opacity-80 uppercase tracking-widest text-[10px]">Cloud Sync Enabled</p>
        </div>

        <div className="space-y-6">
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white text-slate-900 font-bold py-5 rounded-3xl flex items-center justify-center gap-4 transition-all hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-black/40 group overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
            ) : (
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="w-7 h-7 group-hover:rotate-12 transition-transform" alt="Google" />
            )}
            <span className="text-xl">เข้าใช้งานด้วย Google</span>
          </button>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle size={18} /> {error}
            </div>
          )}
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3">Cloud Persistence V3.1</p>
            <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed font-medium">
              ข้อมูลทั้งหมดจะถูกบันทึกขึ้นระบบคลาวด์โดยอัตโนมัติ เข้าใช้ได้ทุกที่ ทุกเวลา
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
