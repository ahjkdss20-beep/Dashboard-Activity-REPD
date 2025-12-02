
import React, { useState } from 'react';
import { Menu, ChevronDown, ChevronRight, LayoutDashboard, Briefcase, LogOut, Lock, X } from 'lucide-react';
import { MENU_STRUCTURE, LOGO_URL } from '../constants';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeCategory: string | null;
  activeSubCategory: string | null;
  onNavigate: (category: string | null, subCategory: string | null) => void;
  user: User | null;
  onLogout: () => void;
  onChangePassword: (oldPass: string, newPass: string) => boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeCategory, 
  activeSubCategory, 
  onNavigate,
  user,
  onLogout,
  onChangePassword
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    "Penyesuaian": true,
    "Request Data": false,
    "Problem": false,
    "Produksi Master Data": false
  });
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMessage, setPassMessage] = useState({ type: '', text: '' });

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const handleNavClick = (cat: string | null, sub: string | null) => {
    onNavigate(cat, sub);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 4) {
      setPassMessage({ type: 'error', text: 'Password baru minimal 4 karakter.' });
      return;
    }
    
    const success = onChangePassword(oldPass, newPass);
    if (success) {
      setPassMessage({ type: 'success', text: 'Password berhasil diubah!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setOldPass('');
        setNewPass('');
        setPassMessage({ type: '', text: '' });
      }, 1500);
    } else {
      setPassMessage({ type: 'error', text: 'Password lama salah.' });
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="h-20 flex items-center justify-center border-b border-gray-100 p-4">
            <img 
              src={LOGO_URL} 
              alt="JNE Logo" 
              className="h-12 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                ((e.target as HTMLImageElement).nextSibling as HTMLElement).style.display = 'block';
              }}
            />
            <span className="text-2xl font-bold text-[#EE2E24] hidden">JNE</span>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
            <button
              onClick={() => handleNavClick(null, null)}
              className={`flex items-center w-full px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                activeCategory === null 
                  ? 'bg-red-50 text-[#EE2E24]' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Summary Dashboard
            </button>

            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Menu Akun Pekerjaan
              </p>
            </div>

            {Object.values(MENU_STRUCTURE).map((menu) => (
              <div key={menu.name} className="mb-1">
                <button
                  onClick={() => toggleMenu(menu.name)}
                  className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center">
                    <Briefcase className="w-5 h-5 mr-3 text-gray-400" />
                    {menu.name}
                  </div>
                  {expandedMenus[menu.name] ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {expandedMenus[menu.name] && (
                  <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-100 pl-2">
                    {menu.submenus.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => handleNavClick(menu.name, sub)}
                        className={`flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors ${
                          activeCategory === menu.name && activeSubCategory === sub
                            ? 'bg-red-50 text-[#EE2E24] font-medium'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current mr-2 opacity-50"></span>
                        {sub}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
              <div 
                className="flex items-center overflow-hidden cursor-pointer flex-1"
                onClick={() => setShowPasswordModal(true)}
                title="Klik untuk ubah password"
              >
                <div className="w-8 h-8 rounded-full bg-[#002F6C] flex-shrink-0 flex items-center justify-center text-white font-bold text-xs">
                  {user?.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="ml-2 p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 z-10">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              <Menu className="w-6 h-6" />
            </button>
            <img src={LOGO_URL} alt="JNE" className="h-8 ml-3" />
          </div>
          <div className="flex items-center">
             <div 
              onClick={() => setShowPasswordModal(true)}
              className="w-8 h-8 rounded-full bg-[#002F6C] flex items-center justify-center text-white font-bold text-xs cursor-pointer"
             >
                {user?.name.substring(0, 2).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Ubah Password</h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePasswordSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Lama</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="password"
                      required
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#EE2E24]"
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="password"
                      required
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#EE2E24]"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                    />
                </div>
              </div>

              {passMessage.text && (
                <div className={`text-sm p-2 rounded ${passMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {passMessage.text}
                </div>
              )}

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full py-2 bg-[#002F6C] text-white rounded-lg hover:bg-blue-900 transition-colors font-medium"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
