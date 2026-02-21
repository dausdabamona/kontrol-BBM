import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fuel, 
  ShoppingCart, 
  BarChart3, 
  User, 
  Truck, 
  Scissors, 
  Zap, 
  ChevronLeft,
  Plus,
  History,
  Save,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  LogOut,
  Settings,
  Users,
  Package,
  Calculator
} from 'lucide-react';
import { Role, BBMUsage, BBMPurchase, User as UserType, Asset } from './types';

type View = 'login' | 'home' | 'usage' | 'purchase' | 'admin' | 'settings_users' | 'settings_assets';

export default function App() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [reports, setReports] = useState<{ usage: BBMUsage[], purchases: BBMPurchase[] }>({ usage: [], purchases: [] });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  
  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (user) {
      fetchAssets();
      if (user.role === 'admin') {
        fetchReports();
        fetchUsers();
      }
    }
  }, [user, view]);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error('Failed to fetch assets', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setAllUsers(data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setView('home');
      } else {
        showMessage('error', data.message || 'Login gagal');
      }
    } catch (err) {
      showMessage('error', 'Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      showMessage('error', 'Gagal mengakses kamera');
      setShowCamera(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const handleUsageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      date: formData.get('date'),
      user_id: user.id,
      asset_id: parseInt(formData.get('asset_id') as string),
      amount_liters: parseFloat(formData.get('amount_liters') as string),
      notes: formData.get('notes'),
      photo: photo
    };

    try {
      const res = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showMessage('success', 'Data penggunaan berhasil disimpan');
        setPhoto(null);
        setView('home');
      } else {
        throw new Error('Gagal menyimpan data');
      }
    } catch (err) {
      showMessage('error', 'Gagal menyimpan data. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      date: formData.get('date'),
      user_id: user.id,
      amount_liters: parseFloat(formData.get('amount_liters') as string),
      cost: parseFloat(formData.get('cost') as string),
      payment_type: formData.get('payment_type'),
      notes: formData.get('notes'),
      photo: photo
    };

    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showMessage('success', 'Data pembelian berhasil disimpan');
        setPhoto(null);
        setView('home');
      } else {
        throw new Error('Gagal menyimpan data');
      }
    } catch (err) {
      showMessage('error', 'Gagal menyimpan data. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const calculateLiters = (cost: number, pricePerLiter: number) => {
    if (pricePerLiter > 0) {
      return (cost / pricePerLiter).toFixed(2);
    }
    return '';
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (res.ok) {
      showMessage('success', 'User berhasil ditambahkan');
      fetchUsers();
      e.currentTarget.reset();
    }
  };

  const handleAddAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await fetch('/api/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    if (res.ok) {
      showMessage('success', 'Aset berhasil ditambahkan');
      fetchAssets();
      e.currentTarget.reset();
    }
  };

  const deleteUser = async (id: number) => {
    if (confirm('Hapus user ini?')) {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  const deleteAsset = async (id: number) => {
    if (confirm('Hapus aset ini?')) {
      await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      fetchAssets();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Fuel className="w-6 h-6 text-indigo-600" />
            <h1 className="font-bold text-lg tracking-tight">BBM Control</h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-slate-900 leading-none">{user.full_name}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{user.role}</span>
              </div>
              <button onClick={() => { setUser(null); setView('login'); }} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          {/* Login View */}
          {view === 'login' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 pt-10"
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-200">
                  <Fuel className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Masuk Sistem</h2>
                <p className="text-slate-500">Silakan login dengan akun Anda</p>
              </div>
              <form onSubmit={handleLogin} className="card space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                  <input type="text" name="username" required className="input-field" placeholder="admin / supir1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" name="password" required className="input-field" placeholder="••••••••" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-lg">
                  {loading ? 'Memproses...' : 'Masuk'}
                </button>
              </form>
            </motion.div>
          )}

          {/* Home View */}
          {user && view === 'home' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className="text-xl font-bold text-slate-900">Menu Utama</h2>

              {user.role !== 'admin' ? (
                <>
                  <button 
                    onClick={() => setView('usage')}
                    className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Fuel className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Input Penggunaan</h3>
                      <p className="text-sm text-slate-500">Catat pemakaian BBM harian</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setView('purchase')}
                    className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Input Pembelian</h3>
                      <p className="text-sm text-slate-500">Catat pembelian BBM (Cash/Kupon)</p>
                    </div>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => setView('admin')}
                    className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Laporan & Riwayat</h3>
                      <p className="text-sm text-slate-500">Lihat semua data transaksi</p>
                    </div>
                  </button>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setView('settings_users')}
                      className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm">Kelola User</span>
                    </button>
                    <button 
                      onClick={() => setView('settings_assets')}
                      className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm">Kelola Aset</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Usage Form */}
          {user && view === 'usage' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-slate-900">Input Penggunaan</h2>
              </div>

              <form onSubmit={handleUsageSubmit} className="card space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                  <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Pilih Kendaraan / Alat</label>
                  <select name="asset_id" required className="input-field">
                    <option value="">-- Pilih --</option>
                    {assets.filter(a => user.role === 'supir' ? a.type === 'vehicle' : a.type === 'equipment').map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah (Liter)</label>
                  <input type="number" step="0.01" name="amount_liters" required placeholder="0.00" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Foto Bukti / Lokasi</label>
                  {photo ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                      <img src={photo} className="w-full h-48 object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setPhoto(null)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={startCamera}
                      className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all"
                    >
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Ambil Foto</span>
                    </button>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catatan</label>
                  <textarea name="notes" rows={2} className="input-field" placeholder="Keterangan tambahan..."></textarea>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  {loading ? 'Menyimpan...' : <><Save className="w-5 h-5" /> Simpan Data</>}
                </button>
              </form>
            </motion.div>
          )}

          {/* Purchase Form */}
          {user && view === 'purchase' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-slate-900">Input Pembelian</h2>
              </div>

              <form onSubmit={handlePurchaseSubmit} className="card space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                  <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="input-field" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Biaya (Rp)</label>
                    <input 
                      type="number" 
                      name="cost" 
                      id="purchase_cost"
                      required 
                      placeholder="0" 
                      className="input-field" 
                      onChange={(e) => {
                        const price = (document.getElementById('price_per_liter') as HTMLInputElement)?.value;
                        if (price) {
                          const liters = calculateLiters(parseFloat(e.target.value), parseFloat(price));
                          (document.getElementById('amount_liters') as HTMLInputElement).value = liters;
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Harga / Liter</label>
                    <input 
                      type="number" 
                      id="price_per_liter"
                      placeholder="Contoh: 10000" 
                      className="input-field" 
                      onChange={(e) => {
                        const cost = (document.getElementById('purchase_cost') as HTMLInputElement)?.value;
                        if (cost) {
                          const liters = calculateLiters(parseFloat(cost), parseFloat(e.target.value));
                          (document.getElementById('amount_liters') as HTMLInputElement).value = liters;
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jumlah (Liter)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01" 
                      name="amount_liters" 
                      id="amount_liters"
                      required 
                      placeholder="0.00" 
                      className="input-field pr-10" 
                    />
                    <Calculator className="absolute right-3 top-2.5 w-5 h-5 text-slate-300" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">*Bisa terisi otomatis jika Harga/Liter diisi</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Metode Pembayaran</label>
                  <select name="payment_type" className="input-field">
                    <option value="cash">Uang Tunai (Cash)</option>
                    <option value="kupon">Kupon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Foto Struk / Bukti</label>
                  {photo ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                      <img src={photo} className="w-full h-48 object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setPhoto(null)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button" 
                      onClick={startCamera}
                      className="w-full py-8 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all"
                    >
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-sm font-medium">Ambil Foto Struk</span>
                    </button>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
                  {loading ? 'Menyimpan...' : <><Save className="w-5 h-5" /> Simpan Data</>}
                </button>
              </form>
            </motion.div>
          )}

          {/* Admin Dashboard */}
          {user?.role === 'admin' && view === 'admin' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-slate-900">Laporan BBM</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card bg-indigo-600 text-white border-none">
                  <p className="text-xs opacity-80 uppercase tracking-wider font-bold">Total Digunakan</p>
                  <p className="text-2xl font-bold mt-1">
                    {reports.usage.reduce((acc, curr) => acc + curr.amount_liters, 0).toFixed(1)} L
                  </p>
                </div>
                <div className="card bg-emerald-600 text-white border-none">
                  <p className="text-xs opacity-80 uppercase tracking-wider font-bold">Total Dibeli</p>
                  <p className="text-2xl font-bold mt-1">
                    {reports.purchases.reduce((acc, curr) => acc + curr.amount_liters, 0).toFixed(1)} L
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4" /> Riwayat Penggunaan
                </h3>
                <div className="space-y-3">
                  {reports.usage.length === 0 && <p className="text-sm text-slate-500 italic">Belum ada data penggunaan.</p>}
                  {reports.usage.map((u) => (
                    <div key={u.id} className="card p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900">{u.asset_name}</p>
                          <p className="text-xs text-slate-500">{u.date} • {u.user_name}</p>
                        </div>
                        <p className="font-bold text-orange-600">-{u.amount_liters} L</p>
                      </div>
                      {u.photo && (
                        <img src={u.photo} className="w-full h-32 object-cover rounded-lg border border-slate-100" />
                      )}
                      {u.notes && <p className="text-xs text-slate-400 italic">"{u.notes}"</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4" /> Riwayat Pembelian
                </h3>
                <div className="space-y-3">
                  {reports.purchases.length === 0 && <p className="text-sm text-slate-500 italic">Belum ada data pembelian.</p>}
                  {reports.purchases.map((p) => (
                    <div key={p.id} className="card p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-900">{p.payment_type === 'cash' ? 'Tunai' : 'Kupon'}</p>
                          <p className="text-xs text-slate-500">{p.date} • {p.user_name}</p>
                          <p className="text-xs font-medium text-slate-600 mt-1">Rp {p.cost.toLocaleString('id-ID')}</p>
                        </div>
                        <p className="font-bold text-emerald-600">+{p.amount_liters} L</p>
                      </div>
                      {p.photo && (
                        <img src={p.photo} className="w-full h-32 object-cover rounded-lg border border-slate-100" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Manage Users */}
          {user?.role === 'admin' && view === 'settings_users' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-slate-900">Kelola User</h2>
              </div>

              <form onSubmit={handleAddUser} className="card space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Tambah User Baru</h3>
                <input type="text" name="username" required placeholder="Username" className="input-field" />
                <input type="password" name="password" required placeholder="Password" className="input-field" />
                <input type="text" name="full_name" required placeholder="Nama Lengkap" className="input-field" />
                <select name="role" required className="input-field">
                  <option value="supir">Supir</option>
                  <option value="operator">Operator Babat</option>
                  <option value="pengelola">Operator Genset</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Tambah User
                </button>
              </form>

              <div className="space-y-3">
                {allUsers.map(u => (
                  <div key={u.id} className="card p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{u.full_name}</p>
                      <p className="text-xs text-slate-500">@{u.username} • {u.role}</p>
                    </div>
                    {u.username !== 'admin' && (
                      <button onClick={() => deleteUser(u.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Manage Assets */}
          {user?.role === 'admin' && view === 'settings_assets' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-xl font-bold text-slate-900">Kelola Aset</h2>
              </div>

              <form onSubmit={handleAddAsset} className="card space-y-4">
                <h3 className="font-bold text-sm text-slate-900">Tambah Aset Baru</h3>
                <input type="text" name="name" required placeholder="Nama Kendaraan / Alat" className="input-field" />
                <select name="type" required className="input-field">
                  <option value="vehicle">Kendaraan (Supir)</option>
                  <option value="equipment">Peralatan (Operator)</option>
                </select>
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Tambah Aset
                </button>
              </form>

              <div className="space-y-3">
                {assets.map(a => (
                  <div key={a.id} className="card p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{a.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{a.type}</p>
                    </div>
                    <button onClick={() => deleteAsset(a.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            <div className="flex-1 relative">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <button onClick={stopCamera} className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-[10px] font-bold uppercase tracking-widest">
                  Live Camera
                </div>
              </div>
            </div>
            <div className="h-32 bg-slate-900 flex items-center justify-center gap-12">
              <button 
                onClick={takePhoto}
                className="w-16 h-16 bg-white rounded-full border-4 border-slate-400 flex items-center justify-center active:scale-90 transition-transform"
              >
                <div className="w-12 h-12 bg-white rounded-full border-2 border-slate-900" />
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-4 right-4 p-4 rounded-2xl shadow-lg flex items-center gap-3 z-50 ${
              message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <p className="font-medium">{message.text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
