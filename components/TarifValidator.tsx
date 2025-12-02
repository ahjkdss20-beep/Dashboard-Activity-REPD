import React, { useState, useRef } from 'react';
import { Upload, FileDown, AlertTriangle, CheckCircle2, FileText, Download, X, RefreshCw, ClipboardCheck } from 'lucide-react';
import { TarifRow, ValidationResultRow, ValidationLog, User } from '../types';

interface TarifValidatorProps {
  onLogValidation?: (log: ValidationLog) => void;
  currentUser?: User | null;
}

type FilterType = 'ALL' | 'MATCH' | 'MISMATCH' | 'BLANK';

export const TarifValidator: React.FC<TarifValidatorProps> = ({ onLogValidation, currentUser }) => {
  const [itData, setItData] = useState<TarifRow[]>([]);
  const [masterData, setMasterData] = useState<TarifRow[]>([]);
  const [results, setResults] = useState<ValidationResultRow[]>([]);
  const [stats, setStats] = useState({ total: 0, match: 0, mismatch: 0, blank: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [validated, setValidated] = useState(false);
  
  // State for filtering
  const [activeFilter, setActiveFilter] = useState<FilterType>('MISMATCH'); // Default show errors
  
  // State for Modal Detail
  const [selectedDetail, setSelectedDetail] = useState<{it: ValidationResultRow, master: TarifRow | undefined} | null>(null);

  const itFileRef = useRef<HTMLInputElement>(null);
  const masterFileRef = useRef<HTMLInputElement>(null);

  // Helper to clean CSV cell values (remove quotes, trim spaces) for display
  const cleanValue = (val: string | string[] | undefined | null): string => {
    if (!val) return '';
    const strVal = Array.isArray(val) ? val.join(',') : String(val);
    return strVal.replace(/^="|^"|"$|"/g, '').trim(); 
  };

  // Helper for comparison: normalize by removing non-alphanumeric chars (dots, commas, spaces)
  // This makes "80,000" == "80000" == "80.000"
  const normalizeForCompare = (val: string | undefined | null): string => {
    if (!val) return '';
    return cleanValue(val).toUpperCase().replace(/[\s.,]/g, '');
  };

  // Strict key normalization for SYS_CODE lookup
  const normalizeKey = (val: string | undefined | null): string => {
    if (!val) return '';
    return cleanValue(val).toUpperCase().replace(/\s/g, '');
  };

  // Robust CSV Line Splitter that handles quoted fields containing delimiters
  const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let start = 0;
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if ((line[i] === ',' || line[i] === ';') && !inQuotes) {
        // Found a delimiter outside quotes
        result.push(line.substring(start, i));
        start = i + 1;
      }
    }
    // Push the last field
    result.push(line.substring(start));
    return result;
  };

  const parseCSV = (text: string): TarifRow[] => {
    // Remove BOM
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r\n|\n/);
    if (lines.length < 2) return [];

    // Header parsing
    const headerLine = lines[0];
    const headers = splitCSVLine(headerLine).map(h => cleanValue(h).toUpperCase());
    
    const requiredCols = ['SYS_CODE'];
    const missing = requiredCols.filter(req => !headers.includes(req));
    
    if (missing.length > 0) {
        alert(`Format Header Salah! Kolom berikut wajib ada: ${missing.join(', ')}`);
        return [];
    }

    const data: TarifRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const cols = splitCSVLine(lines[i]);
      
      const row: any = {};
      let hasSysCode = false;

      headers.forEach((h, index) => {
        const val = cleanValue(cols[index]);
        row[h] = val;
        if (h === 'SYS_CODE' && val) hasSysCode = true;
      });
      
      if (hasSysCode) { 
          data.push(row as TarifRow);
      }
    }
    return data;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'IT' | 'MASTER') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsedData = parseCSV(text);
      
      if (parsedData.length === 0) {
          if (!text.toUpperCase().includes('SYS_CODE')) {
               alert("File kosong atau header SYS_CODE tidak ditemukan.");
          }
          return;
      }

      if (type === 'IT') {
        setItData(parsedData);
        setValidated(false); 
        setResults([]);
      } else {
        setMasterData(parsedData);
        setValidated(false);
        setResults([]);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = (type: 'IT' | 'MASTER') => {
    const headers = "ORIGIN,DEST,SYS_CODE,SERVICE,TARIF,SLA_FORM,SLA_THRU";
    const example = "MES10000,PLM10007,MES10000PLM10007JTR23,JTR23,80000,7,10";
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + example;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Template_${type === 'IT' ? 'Data_IT' : 'Master_Data'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runValidation = () => {
    if (itData.length === 0 || masterData.length === 0) {
      alert("Harap upload Data IT dan Master Data terlebih dahulu.");
      return;
    }

    setIsProcessing(true);
    setValidated(false);

    setTimeout(() => {
      // 1. Build Index Map for IT Data
      const itMap = new Map<string, TarifRow>();
      itData.forEach(row => {
        const code = normalizeKey(row.SYS_CODE);
        if (code) itMap.set(code, row);
      });

      let matchCount = 0;
      let mismatchCount = 0;
      let blankCount = 0;

      // 2. Iterate Master Data
      const validationResults: ValidationResultRow[] = masterData.map(masterRow => {
        const lookupKey = normalizeKey(masterRow.SYS_CODE);
        const itRow = itMap.get(lookupKey);
        
        const errors: string[] = [];
        let status: 'MATCH' | 'MISMATCH' | 'BLANK' = 'MATCH';

        const resultRow: ValidationResultRow = {
            ORIGIN: masterRow.ORIGIN,
            DEST: masterRow.DEST,
            SYS_CODE: masterRow.SYS_CODE,
            
            SERVICE_REG: masterRow.SERVICE,
            TARIF_REG: masterRow.TARIF,
            SLA_FORM_REG: masterRow.SLA_FORM,
            SLA_THRU_REG: masterRow.SLA_THRU,

            SERVICE: '',
            TARIF: '',
            SLA_FORM: '',
            SLA_THRU: '',
            
            validationStatus: 'MATCH',
            errors: []
        };

        if (!itRow) {
          status = 'BLANK';
          blankCount++;
          errors.push('Data IT Tidak Ditemukan');
        } else {
          resultRow.SERVICE = itRow.SERVICE;
          resultRow.TARIF = itRow.TARIF;
          resultRow.SLA_FORM = itRow.SLA_FORM;
          resultRow.SLA_THRU = itRow.SLA_THRU;

          // Normalized Comparison Logic
          if (normalizeForCompare(itRow.SERVICE) !== normalizeForCompare(masterRow.SERVICE)) {
              errors.push(`Tidak sesuai : Service`);
          }
          if (normalizeForCompare(itRow.TARIF) !== normalizeForCompare(masterRow.TARIF)) {
              errors.push(`Tidak sesuai : Tarif`);
          }
          if (normalizeForCompare(itRow.SLA_FORM) !== normalizeForCompare(masterRow.SLA_FORM)) {
              errors.push(`Tidak sesuai : SLA_FORM`);
          }
          if (normalizeForCompare(itRow.SLA_THRU) !== normalizeForCompare(masterRow.SLA_THRU)) {
              errors.push(`Tidak sesuai : SLA_THRU`);
          }

          if (errors.length > 0) {
            status = 'MISMATCH';
            mismatchCount++;
          } else {
            status = 'MATCH';
            matchCount++;
          }
        }

        resultRow.validationStatus = status;
        resultRow.errors = errors;
        return resultRow;
      });

      setResults(validationResults);
      setStats({
        total: masterData.length,
        match: matchCount,
        mismatch: mismatchCount,
        blank: blankCount
      });
      setValidated(true);
      setIsProcessing(false);
      
      setActiveFilter('MISMATCH');

      if (onLogValidation) {
          onLogValidation({
              id: crypto.randomUUID(),
              timestamp: new Date().toISOString(),
              user: currentUser?.name || 'Unknown',
              action: 'VALIDATION',
              description: `Validasi Tarif: Total ${masterData.length}. Sesuai: ${matchCount}, Tidak Sesuai: ${mismatchCount}, Missing: ${blankCount}.`,
              category: 'Validasi'
          });
      }

    }, 500);
  };

  const handleViewDetail = (row: ValidationResultRow) => {
      const itObj: any = {
          SYS_CODE: row.SYS_CODE,
          SERVICE: row.SERVICE,
          TARIF: row.TARIF,
          SLA_FORM: row.SLA_FORM,
          SLA_THRU: row.SLA_THRU
      };
      
      const masterObj: any = {
          SYS_CODE: row.SYS_CODE,
          SERVICE: row.SERVICE_REG,
          TARIF: row.TARIF_REG,
          SLA_FORM: row.SLA_FORM_REG,
          SLA_THRU: row.SLA_THRU_REG
      };
      
      setSelectedDetail({ it: itObj as ValidationResultRow, master: masterObj as TarifRow });
  };

  const downloadReport = () => {
      if (results.length === 0) return;
      
      const headers = "ORIGIN,DEST,SYS_CODE,SERVICE_REG,TARIF_REG,SLA_FORM_REG,SLA_THRU_REG,SERVICE,TARIF,SLA_FORM,SLA_THRU,KETERANGAN\n";
      const rows = results.map(r => {
          const cleanErrors = r.errors.join(", ").replace(/"/g, '""');
          // Wrap in quotes to handle commas in data
          const rowData = [
              r.ORIGIN, r.DEST, r.SYS_CODE,
              r.SERVICE_REG, r.TARIF_REG, r.SLA_FORM_REG, r.SLA_THRU_REG,
              r.SERVICE, r.TARIF, r.SLA_FORM, r.SLA_THRU,
              cleanErrors
          ].map(val => `"${cleanValue(String(val || ''))}"`).join(",");
          
          return rowData;
      }).join("\n");
      
      const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Hasil_Validasi_Tarif_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleReset = () => {
      setItData([]);
      setMasterData([]);
      setResults([]);
      setValidated(false);
      setActiveFilter('ALL');
      if (itFileRef.current) itFileRef.current.value = '';
      if (masterFileRef.current) masterFileRef.current.value = '';
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Validasi Tarif Otomatis</h2>
            <p className="text-gray-500 text-sm max-w-3xl">
            Sistem validasi berbasis <strong>Lookup SYS_CODE</strong> (Master ke IT). 
            Total data mengacu pada jumlah Master Data. Data angka dinormalisasi (mengabaikan titik/koma) saat perbandingan.
            </p>
          </div>
          {(itData.length > 0 || masterData.length > 0) && (
              <button 
                onClick={handleReset}
                className="flex items-center px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                  <RefreshCw className="w-4 h-4 mr-2" /> Reset Upload
              </button>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Data IT */}
        <div className={`bg-white p-8 rounded-xl shadow-sm border transition-all ${itData.length > 0 ? 'border-green-200 ring-2 ring-green-50' : 'border-gray-100'}`}>
            <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${itData.length > 0 ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {itData.length > 0 ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <h3 className="font-bold text-gray-800 mb-1">Data IT (Upload)</h3>
                <p className="text-xs text-gray-400 mb-6">File CSV yang akan divalidasi</p>
                
                <div className="w-full mb-4">
                    <input 
                        type="file" 
                        ref={itFileRef}
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'IT')}
                    />
                    <div 
                        onClick={() => itFileRef.current?.click()}
                        className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${itData.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}
                    >
                        {itData.length > 0 ? (
                            <span className="text-green-700 text-sm font-medium flex items-center justify-center">
                                {itData.length} Baris Data Terbaca
                            </span>
                        ) : (
                            <span className="text-gray-500 text-sm">Klik untuk upload file CSV</span>
                        )}
                    </div>
                </div>

                <button 
                    onClick={() => handleDownloadTemplate('IT')}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center border px-3 py-1.5 rounded-md border-blue-100 hover:bg-blue-50"
                >
                    <Download className="w-3 h-3 mr-1" /> Download Template IT
                </button>
            </div>
        </div>

        {/* Card Master Data */}
        <div className={`bg-white p-8 rounded-xl shadow-sm border transition-all ${masterData.length > 0 ? 'border-green-200 ring-2 ring-green-50' : 'border-gray-100'}`}>
            <div className="flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${masterData.length > 0 ? 'bg-green-100 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
                    {masterData.length > 0 ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                </div>
                <h3 className="font-bold text-gray-800 mb-1">Master Data (Acuan)</h3>
                <p className="text-xs text-gray-400 mb-6">File CSV sebagai acuan validasi</p>
                
                <div className="w-full mb-4">
                    <input 
                        type="file" 
                        ref={masterFileRef}
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'MASTER')}
                    />
                    <div 
                        onClick={() => masterFileRef.current?.click()}
                        className={`border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors ${masterData.length > 0 ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-purple-400'}`}
                    >
                        {masterData.length > 0 ? (
                            <span className="text-green-700 text-sm font-medium flex items-center justify-center">
                                {masterData.length} Baris Data Terbaca
                            </span>
                        ) : (
                            <span className="text-gray-500 text-sm">Klik untuk upload file CSV</span>
                        )}
                    </div>
                </div>

                <button 
                    onClick={() => handleDownloadTemplate('MASTER')}
                    className="text-purple-600 hover:text-purple-800 text-xs font-medium flex items-center border px-3 py-1.5 rounded-md border-purple-100 hover:bg-purple-50"
                >
                    <Download className="w-3 h-3 mr-1" /> Download Template Master
                </button>
            </div>
        </div>
      </div>

      <div className="flex justify-center">
         <button
            onClick={runValidation}
            disabled={isProcessing || itData.length === 0 || masterData.length === 0}
            className="bg-[#EE2E24] text-white px-8 py-3 rounded-full shadow-lg hover:bg-red-700 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
         >
            {isProcessing ? 'Sedang Memvalidasi...' : (
                <>
                    <Upload className="w-4 h-4 mr-2" /> Mulai Validasi Tarif
                </>
            )}
         </button>
      </div>

      {validated && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                 <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-800">Hasil Validasi TARIF</h3>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">
                        Menampilkan: {activeFilter === 'ALL' ? 'Semua' : activeFilter}
                    </span>
                 </div>
                 <div className="flex gap-2">
                     <button 
                        onClick={downloadReport}
                        className="text-blue-600 border border-blue-100 bg-blue-50 px-3 py-1.5 rounded-md text-sm hover:bg-blue-100 flex items-center font-medium"
                     >
                        <FileDown className="w-3 h-3 mr-2" /> Download Report
                     </button>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                 <button 
                    onClick={() => setActiveFilter('ALL')}
                    className={`p-4 rounded-lg cursor-pointer transition-all border text-left ${activeFilter === 'ALL' ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-200' : 'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}
                 >
                     <p className="text-blue-600 text-xs font-medium uppercase mb-1">Total Data (Master)</p>
                     <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                 </button>
                 <button 
                    onClick={() => setActiveFilter('MATCH')}
                    className={`p-4 rounded-lg cursor-pointer transition-all border text-left ${activeFilter === 'MATCH' ? 'bg-green-100 border-green-400 ring-2 ring-green-200' : 'bg-green-50 border-green-100 hover:bg-green-100'}`}
                 >
                     <p className="text-green-600 text-xs font-medium uppercase mb-1">Data Sesuai (Match)</p>
                     <p className="text-3xl font-bold text-green-900">{stats.match}</p>
                 </button>
                 <button 
                    onClick={() => setActiveFilter('MISMATCH')}
                    className={`p-4 rounded-lg cursor-pointer transition-all border text-left ${activeFilter === 'MISMATCH' ? 'bg-red-100 border-red-400 ring-2 ring-red-200' : 'bg-red-50 border-red-100 hover:bg-red-100'}`}
                 >
                     <p className="text-red-600 text-xs font-medium uppercase mb-1">Tidak Sesuai</p>
                     <p className="text-3xl font-bold text-red-900">{stats.mismatch}</p>
                 </button>
                 <button 
                    onClick={() => setActiveFilter('BLANK')}
                    className={`p-4 rounded-lg cursor-pointer transition-all border text-left ${activeFilter === 'BLANK' ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                 >
                     <p className="text-gray-600 text-xs font-medium uppercase mb-1">IT Missing</p>
                     <p className="text-3xl font-bold text-gray-800">{stats.blank}</p>
                 </button>
             </div>

             {/* RESULT TABLE */}
             <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                 <table className="w-full text-xs text-left whitespace-nowrap">
                     <thead>
                         <tr className="border-b border-gray-200">
                             <th colSpan={3} className="bg-yellow-200 text-yellow-800 p-2 text-center border-r border-yellow-300 font-bold">INFO JALUR</th>
                             <th colSpan={4} className="bg-gray-200 text-gray-700 p-2 text-center border-r border-gray-300 font-bold">DATA MASTER (ACUAN)</th>
                             <th colSpan={4} className="bg-white text-gray-700 p-2 text-center border-r border-gray-200 font-bold">DATA IT (UPLOAD)</th>
                             <th className="bg-white p-2"></th>
                         </tr>
                         <tr className="border-b border-gray-200">
                             <th className="bg-yellow-100 p-3 font-semibold text-gray-700">ORIGIN</th>
                             <th className="bg-yellow-100 p-3 font-semibold text-gray-700">DEST</th>
                             <th className="bg-yellow-100 p-3 font-semibold text-gray-700 border-r border-yellow-200">SYS_CODE</th>
                             
                             <th className="bg-gray-100 p-3 font-semibold text-gray-600">SERVICE REG</th>
                             <th className="bg-gray-100 p-3 font-semibold text-gray-600">TARIF REG</th>
                             <th className="bg-gray-100 p-3 font-semibold text-gray-600">SLA FORM REG</th>
                             <th className="bg-gray-100 p-3 font-semibold text-gray-600 border-r border-gray-200">SLA THRU REG</th>

                             <th className="bg-white p-3 font-semibold text-gray-600">SERVICE</th>
                             <th className="bg-white p-3 font-semibold text-gray-600">TARIF</th>
                             <th className="bg-white p-3 font-semibold text-gray-600">SLA_FORM</th>
                             <th className="bg-white p-3 font-semibold text-gray-600 border-r border-gray-200">SLA_THRU</th>

                             <th className="bg-white p-3 font-semibold text-gray-800">KETERANGAN</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {results.map((row, idx) => {
                             const isMatch = row.validationStatus === 'MATCH';
                             const isMismatch = row.validationStatus === 'MISMATCH';
                             const isBlank = row.validationStatus === 'BLANK';
                             
                             if (activeFilter === 'MATCH' && !isMatch) return null;
                             if (activeFilter === 'MISMATCH' && !isMismatch) return null;
                             if (activeFilter === 'BLANK' && !isBlank) return null;
                             
                             return (
                                 <tr 
                                    key={idx} 
                                    className={`cursor-pointer transition-colors ${isMatch ? 'hover:bg-green-50' : 'hover:bg-red-50'}`}
                                    onClick={() => !isMatch ? handleViewDetail(row) : null}
                                 >
                                     <td className="p-3 bg-yellow-50">{row.ORIGIN}</td>
                                     <td className="p-3 bg-yellow-50">{row.DEST}</td>
                                     <td className="p-3 bg-yellow-50 font-mono font-bold border-r border-yellow-100">{row.SYS_CODE}</td>

                                     <td className="p-3 bg-gray-50">{row.SERVICE_REG}</td>
                                     <td className="p-3 bg-gray-50">{row.TARIF_REG}</td>
                                     <td className="p-3 bg-gray-50">{row.SLA_FORM_REG}</td>
                                     <td className="p-3 bg-gray-50 border-r border-gray-200">{row.SLA_THRU_REG}</td>

                                     <td className="p-3 text-gray-600">{row.SERVICE || '-'}</td>
                                     <td className="p-3 text-gray-600">{row.TARIF || '-'}</td>
                                     <td className="p-3 text-gray-600">{row.SLA_FORM || '-'}</td>
                                     <td className="p-3 text-gray-600 border-r border-gray-200">{row.SLA_THRU || '-'}</td>

                                     <td className={`p-3 font-bold ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
                                         {row.validationStatus === 'MATCH' && 'Sesuai'}
                                         {row.validationStatus === 'BLANK' && 'Data IT Tidak Ditemukan'}
                                         {row.validationStatus === 'MISMATCH' && row.errors.join(", ")}
                                     </td>
                                 </tr>
                             );
                         })}
                     </tbody>
                 </table>
             </div>
          </div>
      )}

      {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center p-5 border-b border-gray-100">
                      <div>
                          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                              <AlertTriangle className="text-red-500 w-5 h-5" /> Detail Ketidaksesuaian
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                              Sys Code: <span className="font-mono font-bold text-black bg-gray-100 px-1 rounded">{selectedDetail.master?.SYS_CODE}</span>
                          </p>
                      </div>
                      <button 
                        onClick={() => setSelectedDetail(null)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                      >
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto bg-gray-50">
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs border-b border-gray-200">
                                  <tr>
                                      <th className="p-4 w-1/4">Atribut</th>
                                      <th className="p-4 w-1/3 bg-blue-50 text-blue-900 border-r border-blue-100">Data IT (Upload)</th>
                                      <th className="p-4 w-1/3 bg-gray-50 text-gray-900">Master Data (Acuan)</th>
                                      <th className="p-4 w-24 text-center">Status</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                  {[
                                      { label: 'Service', key: 'SERVICE' },
                                      { label: 'Tarif', key: 'TARIF' },
                                      { label: 'SLA Form', key: 'SLA_FORM' },
                                      { label: 'SLA Thru', key: 'SLA_THRU' }
                                  ].map((field) => {
                                      const itKey = field.key as keyof ValidationResultRow;
                                      
                                      const itVal = selectedDetail.it[itKey];
                                      const masterVal = selectedDetail.master ? selectedDetail.master[field.key as keyof TarifRow] : 'N/A';
                                      
                                      const isMatch = normalizeForCompare(String(itVal || '')) === normalizeForCompare(String(masterVal || ''));
                                      
                                      return (
                                          <tr key={field.key} className={!isMatch ? "bg-red-50" : ""}>
                                              <td className="p-4 font-medium text-gray-600">{field.label}</td>
                                              <td className={`p-4 font-mono font-bold border-r border-gray-100 ${!isMatch ? 'text-black' : 'text-gray-800'}`}>
                                                  {String(itVal || '-')}
                                              </td>
                                              <td className="p-4 font-mono text-gray-800">
                                                  {String(masterVal || '-')}
                                              </td>
                                              <td className="p-4 text-center">
                                                  {isMatch ? (
                                                      <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                                  ) : (
                                                      <X className="w-5 h-5 text-red-500 mx-auto" />
                                                  )}
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                      <button onClick={() => setSelectedDetail(null)} className="px-6 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300">Tutup</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};