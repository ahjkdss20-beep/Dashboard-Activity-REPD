import React, { useState, useMemo } from 'react';
import { ValidationLog } from '../types';
import { Search, Filter, ArrowDownUp, Clock, User, Activity, FileText, ClipboardCheck } from 'lucide-react';

interface ValidationHistoryProps {
  logs: ValidationLog[];
}

export const ValidationHistory: React.FC<ValidationHistoryProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.category && log.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesAction = filterAction === 'ALL' || log.action === filterAction;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, filterAction]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
      case 'BULK_IMPORT': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'RESET_PASSWORD': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'VALIDATION': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
     switch (action) {
      case 'CREATE': return <Activity className="w-3 h-3" />;
      case 'UPDATE': return <FileText className="w-3 h-3" />;
      case 'DELETE': return <ArrowDownUp className="w-3 h-3" />;
      case 'VALIDATION': return <ClipboardCheck className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Riwayat Validasi & Aktivitas</h2>
          <p className="text-gray-500 text-sm">Monitor semua perubahan data dan aktivitas user dalam sistem.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari aktivitas, user, atau deskripsi..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 bg-white"
                value={filterAction}
                onChange={e => setFilterAction(e.target.value)}
            >
                <option value="ALL">Semua Aksi</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="BULK_IMPORT">Import</option>
                <option value="VALIDATION">Validasi Tarif</option>
                <option value="RESET_PASSWORD">Security</option>
            </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
              <tr>
                <th className="p-4 w-48">Waktu</th>
                <th className="p-4 w-32">User</th>
                <th className="p-4 w-32">Aksi</th>
                <th className="p-4">Deskripsi Aktivitas</th>
                <th className="p-4 w-32">Kategori</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    Tidak ada riwayat aktivitas yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-500 font-mono text-xs">
                        <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {new Date(log.timestamp).toLocaleString('id-ID')}
                        </div>
                    </td>
                    <td className="p-4">
                        <div className="flex items-center gap-2 font-medium text-gray-700">
                            <User className="w-3 h-3 text-gray-400" />
                            {log.user}
                        </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                        {log.description}
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                        {log.category || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};