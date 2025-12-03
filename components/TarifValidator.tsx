
import React, { useState, useEffect, useMemo } from 'react';
import { Upload, FileUp, AlertTriangle, CheckCircle2, Download, Eye, X, Table as TableIcon, History, RotateCcw, Trash2, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ValidationResult, ValidationMismatch, FullValidationRow, ValidationDetail, ValidationHistoryItem, ValidationCategory } from '../types';

interface TarifValidatorProps {
    category: ValidationCategory;
}

export const TarifValidator: React.FC<TarifValidatorProps> = ({ category }) => {
  const [fileIT, setFileIT] = useState<File | null>(null);
  const [fileMaster, setFileMaster] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [statusMessage, setStatusMessage] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [selectedMismatch, setSelectedMismatch] = useState<ValidationMismatch | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  
  // Pagination State for Modal
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 50;
  
  const [history, setHistory] = useState<ValidationHistoryItem[]>([]);
  const [reportFilter, setReportFilter] = useState<'ALL' | 'MATCH' | 'MISMATCH' | 'BLANK'>('ALL');

  useEffect(() => {
    const savedHistory = localStorage.getItem('validationHistory');
    if (savedHistory) {
        try {
            setHistory(JSON.parse(savedHistory));
        } catch (e) {
            console.error("Failed to parse history", e);
            localStorage.removeItem('validationHistory');
        }
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('validationHistory', JSON.stringify(history));
    } catch (e) {
        console.error("Storage Full or Error:", e);
        if (history.length > 0) {
            const trimmedHistory = history.slice(0, 5);
            try {
                localStorage.setItem('validationHistory', JSON.stringify(trimmedHistory));
            } catch (err) {
                 console.warn("Cannot save history even after trimming.");
            }
        }
    }
  }, [history]);

  useEffect(() => {
      setFileIT(null);
      setFileMaster(null);
      setResult(null);
      setSelectedMismatch(null);
      setShowFullReport(false);
      setProgress(0);
      setStatusMessage('');
  }, [category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'IT' | 'MASTER') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'IT') setFileIT(e.target.files[0]);
      else setFileMaster(e.target.files[0]);
    }
  };

  const downloadTemplate = (type: 'IT' | 'MASTER') => {
    let content = '';
    let filename = '';

    if (category === 'TARIF') {
        if (type === 'IT') {
            content = 'ORIGIN,DEST,SYS_CODE,SERVICE,TARIF,SLA_FORM,SLA_THRU\nMES10612,AMI10000,MES10612AMI10000,REG23,59000,3,5';
            filename = `Template_Data_IT_TARIF.csv`;
        } else {
            content = 'ORIGIN,DEST,SYS_CODE,Service REG,Tarif REG,sla form REG,sla thru REG\nDJJ10000,AMI10000,DJJ10000AMI10000,REG23,107000,4,5';
            filename = `Template_Master_Data_TARIF.csv`;
        }
    } else {
        if (type === 'IT') {
            content = 'ORIGIN,DESTINASI,SERVICE,BT,BD,BD NEXT,BP,BP NEXT\nAMI20100,BDJ10502,REG19,1500,3200,0,0,0';
            filename = `Template_Data_IT_BIAYA.csv`;
        } else {
            content = 'DESTINASI,ZONA,BP OKE23,BP NEXT OKE23,BT OKE23,BD OKE23,BP REG23,BP NEXT REG23,BT REG23,BD REG23,BD NEXT REG23\nAMI10000,A,1500,0,1200,3200,2000,0,1500,3500,0';
            filename = `Template_Master_Data_BIAYA.csv`;
        }
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadFullReport = (rowsToDownload?: FullValidationRow[]) => {
    if (!result || !result.fullReport) {
        alert("Data report tidak tersedia untuk didownload (Mungkin ini data history lama).");
        return;
    }
    
    const data = rowsToDownload || result.fullReport;
    let header = '';
    let rows: string[] = [];

    const esc = (val: any) => {
        const str = String(val === undefined || val === null ? '' : val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    if (category === 'TARIF') {
        header = [
            'ORIGIN', 'DEST', 'SYS_CODE', 
            'Service REG', 'Tarif REG', 'sla form REG', 'sla thru REG', 
            'SERVICE', 'TARIF', 'SLA_FORM', 'SLA_THRU', 'Keterangan'
        ].join(',');

        rows = data.map(row => [
            esc(row.origin), esc(row.dest), esc(row.sysCode),
            esc(row.serviceMaster), esc(row.tarifMaster), esc(row.slaFormMaster), esc(row.slaThruMaster),
            esc(row.serviceIT), esc(row.tarifIT), esc(row.slaFormIT), esc(row.slaThruIT),
            esc(row.keterangan)
        ].join(','));
    } else {
        header = [
            'ORIGIN', 'DESTINASI', 'SERVICE', 'ACUAN SERVICE',
            'BP Master', 'BP Next Master', 'BT Master', 'BD Master', 'BD Next Master', 
            'BP IT', 'BP Next IT', 'BT IT', 'BD IT', 'BD Next IT', 'Keterangan'
        ].join(',');

        rows = data.map(row => [
            esc(row.origin), esc(row.dest), esc(row.serviceIT), esc(row.serviceMaster), 
            esc(row.bpMaster), esc(row.bpNextMaster), esc(row.btMaster), esc(row.bdMaster), esc(row.bdNextMaster),
            esc(row.bpIT), esc(row.bpNextIT), esc(row.btIT), esc(row.bdIT), esc(row.bdNextIT),
            esc(row.keterangan)
        ].join(','));
    }

    const content = [header, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = reportFilter === 'ALL' ? `Laporan_Validasi_${category}_Full.csv` : `Laporan_Validasi_${category}_${reportFilter}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const CHUNK_SIZE = 1024 * 1024 * 5; 

  const parseLine = (line: string, delimiter: string) => {
    const result: string[] = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQuotes = !inQuotes; }
        else if (line[i] === delimiter && !inQuotes) {
            result.push(line.substring(start, i));
            start = i + 1;
        }
    }
    result.push(line.substring(start));
    return result.map(v => v.trim().replace(/^"|"$/g, ''));
  };

  const processFileChunked = async (
      file: File, 
      onHeader: (headers: string[], delimiter: string) => void,
      onRows: (rows: any[]) => void,
      onProgress: (percent: number) => void
  ) => {
      let offset = 0;
      let leftover = '';
      let headers: string[] | null = null;
      let delimiter = ',';
      
      const fileSize = file.size;

      while (offset < fileSize) {
          const slice = file.slice(offset, offset + CHUNK_SIZE);
          const text = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.onerror = reject;
              reader.readAsText(slice);
          });

          const cleanText = (offset === 0) ? text.replace(/^\uFEFF/, '') : text;
          
          const rawLines = (leftover + cleanText).split(/\r\n|\n/);
          
          if (offset + CHUNK_SIZE < fileSize) {
              leftover = rawLines.pop() || '';
          } else {
              leftover = '';
          }

          const validLines = rawLines.filter(l => l.trim().length > 0);

          if (validLines.length > 0) {
              let startIndex = 0;

              if (!headers) {
                  const firstLine = validLines[0];
                  const commaCount = (firstLine.match(/,/g) || []).length;
                  const semiCount = (firstLine.match(/;/g) || []).length;
                  delimiter = semiCount > commaCount ? ';' : ',';
                  
                  headers = parseLine(firstLine, delimiter);
                  onHeader(headers, delimiter);
                  startIndex = 1;
              }

              const rows: any[] = [];
              for (let i = startIndex; i < validLines.length; i++) {
                  const values = parseLine(validLines[i], delimiter);
                  const row: any = {};
                  if (values.length === 1 && values[0] === '') continue;

                  headers.forEach((h, idx) => {
                      if (h) row[h.trim()] = values[idx] || '';
                  });
                  rows.push(row);
              }
              onRows(rows);
          }

          offset += CHUNK_SIZE;
          onProgress(Math.min(Math.round((offset / fileSize) * 100), 100));
          await new Promise(resolve => setTimeout(resolve, 0));
      }
  };

  const safeRender = (val: number | undefined | null) => {
      if (val === undefined || val === null || isNaN(val)) return '0';
      return val.toLocaleString('id-ID');
  };

  const processValidation = async () => {
    if (!fileIT || !fileMaster) return;
    
    setIsValidating(true);
    setProgress(0);
    setStatusMessage('Mempersiapkan data...');
    setResult(null);

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        setStatusMessage('Membaca Master Data (Acuan)...');
        const masterMap = new Map<string, any>();
        
        await processFileChunked(
            fileMaster,
            () => {}, 
            (rows) => {
                if (category === 'BIAYA') {
                    const keys = Object.keys(rows[0] || {});
                    const destKey = keys.find(k => k.toUpperCase().includes('DEST')) || 'DESTINASI';
                    rows.forEach(row => {
                        const k = String(row[destKey] || '').trim().toUpperCase();
                        if (k) masterMap.set(k, row);
                    });
                } else {
                    const keys = Object.keys(rows[0] || {});
                    const sysKey = keys.find(k => k.trim().replace(/_/g, '').toUpperCase() === 'SYSCODE');
                    if (!sysKey) return; 
                    rows.forEach(row => {
                        const k = String(row[sysKey] || '').trim().toUpperCase();
                        if (k) masterMap.set(k, row);
                    });
                }
            },
            (pct) => setProgress(Math.round(pct * 0.3)) 
        );

        if (masterMap.size === 0) {
            throw new Error("Gagal membaca Master Data atau kolom Key (SYS_CODE/DESTINASI) tidak ditemukan.");
        }

        setStatusMessage('Memvalidasi Data IT (Baris per baris)...');
        
        const fullReport: FullValidationRow[] = [];
        const mismatches: ValidationMismatch[] = [];
        let matchesCount = 0;
        let blanksCount = 0;
        let rowIndexGlobal = 0;

        const getAcuanService = (val: string) => {
            const v = val.toUpperCase().trim();
            if (['CRGTK', 'JTR23', 'JTR5_23'].includes(v)) return 'JTR23';
            if (['REG05', 'REG19', 'REG23', 'REGSUM'].includes(v)) return 'REG23';
            if (v.startsWith('YES') || ['YES19', 'YES23'].includes(v)) return 'YES23';
            return v; 
        };

        const parseNum = (val: any) => {
            if (!val) return 0;
            let str = String(val).trim();
            str = str.replace(/[.,]00$/, ''); 
            const clean = str.replace(/[^0-9-]/g, ''); 
            return parseInt(clean, 10) || 0;
        };

        await processFileChunked(
            fileIT,
            (headers) => {
                 if (category === 'BIAYA') {
                     const hasDest = headers.some(h => h.toUpperCase().includes('DEST'));
                     const hasServ = headers.some(h => h.toUpperCase().includes('SERVICE'));
                     if (!hasDest || !hasServ) throw new Error("File IT harus memiliki kolom DESTINASI dan SERVICE");
                 } else {
                     const hasSys = headers.some(h => h.trim().replace(/_/g, '').toUpperCase() === 'SYSCODE');
                     if (!hasSys) throw new Error("File IT harus memiliki kolom SYS_CODE");
                 }
            },
            (rows) => {
                rows.forEach((itRow) => {
                    rowIndexGlobal++;
                    const rowIndex = rowIndexGlobal;

                    if (category === 'BIAYA') {
                         const keys = Object.keys(itRow);
                         const destKey = keys.find(k => k.toUpperCase().includes('DEST')) || 'DESTINASI';
                         const serviceKey = keys.find(k => k.toUpperCase().includes('SERVICE')) || 'SERVICE';

                         const dest = String(itRow[destKey] || '').trim();
                         const rawService = String(itRow[serviceKey] || '').trim();
                         const acuanService = getAcuanService(rawService);

                         const masterRow = masterMap.get(dest.toUpperCase());

                         const reportRow: FullValidationRow = {
                            origin: String(itRow['ORIGIN'] || ''),
                            dest: dest,
                            sysCode: rawService, 
                            serviceMaster: acuanService,
                            tarifMaster: 0, slaFormMaster: 0, slaThruMaster: 0, 
                            serviceIT: rawService,
                            tarifIT: 0, slaFormIT: 0, slaThruIT: 0, 

                            bpIT: parseNum(itRow['BP']),
                            bpNextIT: parseNum(itRow['BP NEXT'] || itRow['BP_NEXT']),
                            btIT: parseNum(itRow['BT']),
                            bdIT: parseNum(itRow['BD']),
                            bdNextIT: parseNum(itRow['BD NEXT'] || itRow['BD_NEXT']),
                            
                            keterangan: ''
                         };

                         if (!masterRow) {
                             reportRow.keterangan = 'Master Data Tidak Ada (Destinasi)';
                             blanksCount++;
                             mismatches.push({ rowId: rowIndex, reasons: ['Master Data Tidak Ada'], details: [] });
                             reportRow.bpMaster = 0; reportRow.bpNextMaster = 0; reportRow.btMaster = 0; reportRow.bdMaster = 0; reportRow.bdNextMaster = 0;
                         } else {
                             const getMasterVal = (prefix: string) => {
                                 const target = `${prefix} ${acuanService}`.toUpperCase().replace(/\s+/g, ' ');
                                 const key = Object.keys(masterRow).find(k => 
                                     k.toUpperCase().replace(/\s+/g, ' ') === target
                                 );
                                 return parseNum(key ? masterRow[key] : '0');
                             };

                             reportRow.bpMaster = getMasterVal('BP');
                             reportRow.bpNextMaster = getMasterVal('BP NEXT');
                             reportRow.btMaster = getMasterVal('BT');
                             reportRow.bdMaster = getMasterVal('BD');
                             reportRow.bdNextMaster = getMasterVal('BD NEXT');

                             const issues: string[] = [];
                             const details: ValidationDetail[] = [];
                             const check = (col: string, valIT: number | undefined, valMaster: number | undefined) => {
                                 const v1 = valIT || 0;
                                 const v2 = valMaster || 0;
                                 const match = v1 === v2;
                                 if (!match) issues.push(col);
                                 details.push({ column: col, itValue: v1, masterValue: v2, isMatch: match });
                             };

                             check('BP', reportRow.bpIT, reportRow.bpMaster);
                             check('BP NEXT', reportRow.bpNextIT, reportRow.bpNextMaster);
                             check('BT', reportRow.btIT, reportRow.btMaster);
                             check('BD', reportRow.bdIT, reportRow.bdMaster);
                             check('BD NEXT', reportRow.bdNextIT, reportRow.bdNextMaster);

                             if (issues.length === 0) {
                                 reportRow.keterangan = 'Sesuai';
                                 matchesCount++;
                             } else {
                                 reportRow.keterangan = `Tidak sesuai: ${issues.join(', ')}`;
                                 mismatches.push({ rowId: rowIndex, reasons: issues, details: details });
                             }
                         }
                         fullReport.push(reportRow);

                    } else {
                        const keys = Object.keys(itRow);
                        const sysKey = keys.find(k => k.trim().replace(/_/g, '').toUpperCase() === 'SYSCODE');
                        const sysCode = String(itRow[sysKey!] || '').trim().toUpperCase();

                        const masterRow = masterMap.get(sysCode);
                        
                        const findVal = (row: any, keyStart: string) => {
                            if (!row) return '';
                            const key = Object.keys(row).find(k => k.toUpperCase().startsWith(keyStart.toUpperCase()));
                            return key ? row[key] : '';
                        };

                        let tarifIT = 0, slaFormIT = 0, slaThruIT = 0;
                        let tarifMaster = 0, slaFormMaster = 0, slaThruMaster = 0;

                        if (itRow) {
                            tarifIT = parseNum(findVal(itRow, 'TARIF'));
                            slaFormIT = parseNum(findVal(itRow, 'SLA_FORM'));
                            slaThruIT = parseNum(findVal(itRow, 'SLA_THRU'));
                        }
                        if (masterRow) {
                            tarifMaster = parseNum(findVal(masterRow, 'Tarif REG') || findVal(masterRow, 'TARIF'));
                            slaFormMaster = parseNum(findVal(masterRow, 'sla form') || findVal(masterRow, 'SLA_FORM'));
                            slaThruMaster = parseNum(findVal(masterRow, 'sla thru') || findVal(masterRow, 'SLA_THRU'));
                        }

                        const reportRow: FullValidationRow = {
                            origin: (itRow ? findVal(itRow, 'ORIGIN') : findVal(masterRow, 'ORIGIN')) || '',
                            dest: (itRow ? findVal(itRow, 'DEST') : findVal(masterRow, 'DEST')) || '',
                            sysCode: sysCode || '',
                            serviceMaster: masterRow ? (findVal(masterRow, 'Service REG') || findVal(masterRow, 'SERVICE') || '-') : '-',
                            tarifMaster: masterRow ? tarifMaster : 0,
                            slaFormMaster: masterRow ? slaFormMaster : 0,
                            slaThruMaster: masterRow ? slaThruMaster : 0,
                            serviceIT: itRow ? (findVal(itRow, 'SERVICE') || '-') : '-',
                            tarifIT: itRow ? tarifIT : 0,
                            slaFormIT: itRow ? slaFormIT : 0,
                            slaThruIT: itRow ? slaThruIT : 0,
                            keterangan: ''
                        };

                        if (!masterRow) {
                             reportRow.keterangan = 'Master Data Tidak Ada';
                             blanksCount++;
                             mismatches.push({ rowId: rowIndex, reasons: ['Master Data Tidak Ada'], details: [] });
                        } else {
                             const issues: string[] = [];
                             const details: ValidationDetail[] = [];
                             
                             const isSame = (val1: string | number, val2: string | number) => 
                                 String(val1).trim().replace(/\s/g,'').toUpperCase() === String(val2).trim().replace(/\s/g,'').toUpperCase();

                             if (!isSame(reportRow.serviceIT, reportRow.serviceMaster)) {
                                 issues.push('Service');
                                 details.push({ column: 'Service', itValue: reportRow.serviceIT, masterValue: reportRow.serviceMaster, isMatch: false });
                             }
                             if (reportRow.tarifIT !== reportRow.tarifMaster) {
                                 issues.push('Tarif');
                                 details.push({ column: 'Tarif', itValue: reportRow.tarifIT, masterValue: reportRow.tarifMaster, isMatch: false });
                             }
                             if (reportRow.slaFormIT !== reportRow.slaFormMaster) {
                                 issues.push('SLA_FORM');
                                 details.push({ column: 'sla_form', itValue: reportRow.slaFormIT, masterValue: reportRow.slaFormMaster, isMatch: false });
                             }
                             if (reportRow.slaThruIT !== reportRow.slaThruMaster) {
                                 issues.push('SLA_THRU');
                                 details.push({ column: 'sla_thru', itValue: reportRow.slaThruIT, masterValue: reportRow.slaThruMaster, isMatch: false });
                             }

                             if (issues.length === 0) {
                                 reportRow.keterangan = 'Sesuai';
                                 matchesCount++;
                             } else {
                                 reportRow.keterangan = `Tidak sesuai : ${issues.join(', ')}`;
                                 mismatches.push({ rowId: rowIndex, reasons: issues, details: details });
                             }
                        }
                        fullReport.push(reportRow);
                    }
                });
            },
            (pct) => setProgress(30 + Math.round(pct * 0.7)) 
        );

        setStatusMessage('Menyimpan hasil...');
        const validationResult: ValidationResult = {
            totalRows: fullReport.length,
            matches: matchesCount,
            blanks: blanksCount,
            mismatches: mismatches,
            fullReport: fullReport
        };
        setResult(validationResult);

        const isTooLarge = fullReport.length > 5000;
        
        const historyItem: ValidationHistoryItem = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString('id-ID'),
            fileNameIT: fileIT.name,
            fileNameMaster: fileMaster.name,
            result: {
                ...validationResult,
                fullReport: isTooLarge ? [] : fullReport, 
                mismatches: isTooLarge ? [] : mismatches 
            },
            category: category
        };
        setHistory(prev => [historyItem, ...prev]);

    } catch (error: any) {
        console.error("Validation Error:", error);
        alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
        setIsValidating(false);
        setProgress(0);
        setStatusMessage('');
    }
  };

  const getDisplayedRows = useMemo(() => {
      if (!result) return [];
      let rows = [];
      
      if (result.totalRows > 0 && result.fullReport.length === 0) {
          return [];
      }

      if (reportFilter === 'ALL') rows = result.fullReport;
      else if (reportFilter === 'MATCH') rows = result.fullReport.filter(r => r.keterangan === 'Sesuai');
      else if (reportFilter === 'BLANK') rows = result.fullReport.filter(r => r.keterangan.includes('Tidak Ada'));
      else if (reportFilter === 'MISMATCH') rows = result.fullReport.filter(r => !r.keterangan.includes('Sesuai') && !r.keterangan.includes('Tidak Ada'));
      else rows = [];
      
      return rows;
  }, [result, reportFilter]);

  const totalPages = Math.ceil(getDisplayedRows.length / ROWS_PER_PAGE);
  const paginatedRows = useMemo(() => {
      const start = (currentPage - 1) * ROWS_PER_PAGE;
      return getDisplayedRows.slice(start, start + ROWS_PER_PAGE);
  }, [getDisplayedRows, currentPage]);

  const handlePageChange = (newPage: number) => {
      if(newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const clearHistory = () => {
      if(window.confirm('Hapus semua riwayat validasi?')) setHistory([]);
  };

  const restoreFromHistory = (item: ValidationHistoryItem) => {
      setResult(item.result);
      setFileIT(null); setFileMaster(null);
      
      if (item.result.totalRows > 0 && item.result.fullReport.length === 0) {
          alert("Detail data untuk validasi ini tidak tersimpan karena ukurannya terlalu besar. Hanya ringkasan statistik yang tersedia.");
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReport = (filter: 'ALL' | 'MATCH' | 'MISMATCH' | 'BLANK') => {
    setReportFilter(filter);
    setCurrentPage(1); 
    setShowFullReport(true);
  };

  const displayedHistory = history.filter(item => {
    if (!item.category && category === 'TARIF') return true; 
    return item.category === category;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">Validasi {category === 'TARIF' ? 'Tarif' : 'Biaya'} Otomatis</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
            {category === 'TARIF' ? (
                <>Upload <strong>Data IT</strong> dan <strong>Master Data Tarif</strong>. Sistem akan memvalidasi Service, Tarif, SLA Form, dan SLA Thru menggunakan <strong>SYS_CODE</strong>.</>
            ) : (
                <>Upload <strong>Data IT</strong> dan <strong>Master Data Biaya</strong>. Sistem akan memvalidasi komponen biaya (BP, BT, BD) berdasarkan <strong>DESTINASI</strong> dan <strong>SERVICE Mapping</strong>.</>
            )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:border-blue-500 transition group relative">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <FileUp size={24} />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">Template Data IT</h3>
            <p className="text-xs text-slate-400 mb-3">Upload file CSV</p>
            
            <input type="file" onChange={(e) => handleFileChange(e, 'IT')} className="hidden" id="file-it" accept=".csv" />
            <label htmlFor="file-it" className="cursor-pointer px-4 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-blue-500 transition w-full truncate mb-3">
                {fileIT ? fileIT.name : (result ? 'Tidak ada file baru' : 'Click to Upload')}
            </label>
            <button onClick={() => downloadTemplate('IT')} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium border border-blue-100 px-3 py-1 rounded hover:bg-blue-50 transition">
                <Download size={12}/> Download Template IT
            </button>
            {fileIT && <span className="absolute top-4 right-4 text-green-500"><CheckCircle2 size={20}/></span>}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:border-purple-500 transition group relative">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <FileUp size={24} />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">Template Master Data</h3>
            <p className="text-xs text-slate-400 mb-3">Upload file CSV</p>
            
            <input type="file" onChange={(e) => handleFileChange(e, 'MASTER')} className="hidden" id="file-master" accept=".csv" />
            <label htmlFor="file-master" className="cursor-pointer px-4 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-purple-500 transition w-full truncate mb-3">
                {fileMaster ? fileMaster.name : (result ? 'Tidak ada file baru' : 'Click to Upload')}
            </label>
            <button onClick={() => downloadTemplate('MASTER')} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium border border-purple-100 px-3 py-1 rounded hover:bg-purple-50 transition">
                <Download size={12}/> Download Template Master
            </button>
            {fileMaster && <span className="absolute top-4 right-4 text-green-500"><CheckCircle2 size={20}/></span>}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {isValidating ? (
             <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-700">Processing...</span>
                    <span className="text-sm font-bold text-blue-600">{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-200 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-center text-xs text-slate-400 mt-2">{statusMessage}</p>
             </div>
        ) : (
            <button 
                disabled={!fileIT || !fileMaster || isValidating}
                onClick={processValidation}
                className={`px-8 py-3 rounded-full font-semibold shadow-lg transition flex items-center gap-2
                    ${(!fileIT || !fileMaster) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'}
                `}
            >
                <Upload size={20} />
                Mulai Validasi {category === 'TARIF' ? 'Tarif' : 'Biaya'}
            </button>
        )}
      </div>

      {result && (
          <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-800">Hasil Validasi {category}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenReport('ALL')} className="text-slate-500 text-sm flex items-center gap-1 hover:text-blue-600 border border-slate-200 px-3 py-1 rounded hover:bg-slate-50 transition">
                        <TableIcon size={16} /> Lihat Detail Table
                    </button>
                    <button onClick={() => downloadFullReport()} className="text-blue-600 text-sm flex items-center gap-1 hover:underline font-medium">
                        <Download size={16} /> Download Report
                    </button>
                  </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div onClick={() => handleOpenReport('ALL')} className="bg-blue-50 p-4 rounded-lg border border-blue-100 hover:bg-blue-100 transition cursor-pointer">
                    <p className="text-sm text-blue-600 mb-1">Total Data</p>
                    <p className="text-3xl font-bold text-blue-800">{result.totalRows.toLocaleString()}</p>
                </div>
                <div onClick={() => handleOpenReport('MATCH')} className="bg-green-50 p-4 rounded-lg border border-green-100 hover:bg-green-100 transition cursor-pointer">
                    <p className="text-sm text-green-600 mb-1">Data Sesuai</p>
                    <p className="text-3xl font-bold text-green-800">{result.matches.toLocaleString()}</p>
                </div>
                <div onClick={() => handleOpenReport('MISMATCH')} className="bg-red-50 p-4 rounded-lg border border-red-100 hover:bg-red-100 transition cursor-pointer">
                    <p className="text-sm text-red-600 mb-1">Tidak Sesuai</p>
                    <p className="text-3xl font-bold text-red-800">{(result.mismatches.length - result.blanks).toLocaleString()}</p>
                </div>
                <div onClick={() => handleOpenReport('BLANK')} className="bg-slate-100 p-4 rounded-lg border border-slate-200 hover:bg-slate-200 transition cursor-pointer">
                    <p className="text-sm text-slate-600 mb-1">Data Blank</p>
                    <p className="text-3xl font-bold text-slate-800">{result.blanks.toLocaleString()}</p>
                </div>
              </div>

              {result.mismatches.length > 0 && result.fullReport.length > 0 && (
                <div className="border-t border-slate-200">
                    <div className="bg-slate-50 px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
                        <span>Quick List Ketidaksesuaian (Sampel 100 Data Pertama)</span>
                        <span className="text-red-500">Total Error: {result.mismatches.length.toLocaleString()}</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {result.mismatches.slice(0, 100).map((item, idx) => (
                            <div 
                                key={idx} 
                                onClick={(e) => { e.stopPropagation(); setSelectedMismatch(item); }}
                                className="px-6 py-3 flex items-center justify-between hover:bg-blue-50 cursor-pointer group transition"
                            >
                                <div className="flex items-start gap-3">
                                    {item.reasons[0].includes('Tidak Ada') ? (
                                        <HelpCircle size={18} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    )}
                                    
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">Row ID: {item.rowId}</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {item.reasons.map((reason, rIdx) => (
                                                <span 
                                                    key={rIdx} 
                                                    className={`text-xs px-2 py-0.5 rounded-full ${reason.includes('Tidak Ada') ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-700'}`}
                                                >
                                                    {reason}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Eye size={16} className="text-slate-300 group-hover:text-blue-600" />
                            </div>
                        ))}
                        {result.mismatches.length > 100 && (
                            <div className="px-6 py-4 text-center text-sm text-slate-500 bg-slate-50 italic">
                                ... dan {(result.mismatches.length - 100).toLocaleString()} error lainnya. 
                                <br/>
                                Silakan <strong>Download Report</strong> atau klik <strong>Lihat Detail Table</strong> untuk data lengkap.
                            </div>
                        )}
                    </div>
                </div>
              )}
          </div>
      )}

      {/* History Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <History size={20} className="text-slate-500" />
                Riwayat Validasi {category}
            </h3>
            {displayedHistory.length > 0 && (
                <button onClick={clearHistory} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                    <Trash2 size={16} /> Hapus Riwayat
                </button>
            )}
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3">Waktu</th>
                        <th className="px-6 py-3">File IT</th>
                        <th className="px-6 py-3">File Master</th>
                        <th className="px-6 py-3">Hasil</th>
                        <th className="px-6 py-3">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {displayedHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                            <td className="px-6 py-3 text-slate-500">{item.timestamp}</td>
                            <td className="px-6 py-3 text-slate-800 font-medium">{item.fileNameIT}</td>
                            <td className="px-6 py-3 text-slate-800 font-medium">{item.fileNameMaster}</td>
                            <td className="px-6 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                    {item.result.matches} Sesuai / {item.result.blanks} Blank
                                </span>
                            </td>
                            <td className="px-6 py-3">
                                <button onClick={() => restoreFromHistory(item)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-medium border border-blue-100 px-2 py-1 rounded hover:bg-blue-50">
                                    <RotateCcw size={12} /> Lihat Kembali
                                </button>
                            </td>
                        </tr>
                    ))}
                    {displayedHistory.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Belum ada riwayat.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* FULL REPORT MODAL */}
      {showFullReport && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[90vh] flex flex-col animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                           <TableIcon size={20} className="text-blue-600" />
                           Laporan Validasi {category}: {reportFilter}
                        </h3>
                        <p className="text-xs text-slate-500">Menampilkan {getDisplayedRows.length.toLocaleString()} data</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => downloadFullReport(getDisplayedRows)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm transition">
                            <Download size={16} /> Download CSV
                        </button>
                        <button onClick={() => setShowFullReport(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded transition">
                            <X size={24} />
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto bg-slate-50">
                    {getDisplayedRows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <AlertTriangle size={48} className="mb-2 opacity-50" />
                            <p>Data tidak tersedia untuk ditampilkan (Mungkin file terlalu besar).</p>
                            <p className="text-sm">Silakan download CSV untuk melihat detail lengkap.</p>
                        </div>
                    ) : (
                    <table className="w-full text-xs text-left border-collapse bg-white">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr className="uppercase text-slate-800 font-bold border-b border-slate-300">
                                <th className="bg-yellow-300 px-2 py-3 border-r border-slate-300 min-w-[80px]">ORIGIN</th>
                                <th className="bg-yellow-300 px-2 py-3 border-r border-slate-300 min-w-[80px]">DEST</th>
                                <th className="bg-yellow-300 px-2 py-3 border-r border-slate-300 min-w-[150px]">
                                    {category === 'TARIF' ? 'SYS_CODE' : 'SERVICE IT'}
                                </th>
                                {category === 'BIAYA' && (
                                    <th className="bg-yellow-300 px-2 py-3 border-r border-slate-300 min-w-[100px]">ACUAN SERVICE</th>
                                )}
                                
                                {category === 'TARIF' ? (
                                    <>
                                        <th className="bg-slate-200 px-2 py-3 border-r border-slate-300">Service REG</th>
                                        <th className="bg-slate-200 px-2 py-3 border-r border-slate-300">Tarif REG</th>
                                        <th className="bg-slate-200 px-2 py-3 border-r border-slate-300">sla form</th>
                                        <th className="bg-slate-200 px-2 py-3 border-r border-slate-300">sla thru</th>
                                        <th className="bg-white px-2 py-3 border-r border-slate-200">SERVICE</th>
                                        <th className="bg-white px-2 py-3 border-r border-slate-200">TARIF</th>
                                        <th className="bg-white px-2 py-3 border-r border-slate-200">SLA_FORM</th>
                                        <th className="bg-white px-2 py-3 border-r border-slate-200">SLA_THRU</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="bg-slate-200 px-2 py-3 border-r border-slate-300">BP M</th>
                                        <th className="bg-slate-200 px-2 py-3 border-r border-slate-300">BP N M</th>
                                        <th className="bg-slate-200 px-2 py-3 border-r border-slate-300">BT M</th>
                                        <th className="bg-slate-200 px-2 py-3 border-r border-slate-300">BD M</th>
                                        <th className="bg-slate-200 px-2 py-3 border-r border-slate-300">BD N M</th>

                                        <th className="bg-white px-2 py-3 border-r border-slate-200">BP IT</th>
                                        <th className="bg-white px-2 py-3 border-r border-slate-200">BP N IT</th>
                                        <th className="bg-white px-2 py-3 border-r border-slate-200">BT IT</th>
                                        <th className="bg-white px-2 py-3 border-r border-slate-200">BD IT</th>
                                        <th className="bg-white px-2 py-3 border-r border-slate-200">BD N IT</th>
                                    </>
                                )}
                                <th className="bg-white px-2 py-3 min-w-[200px]">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRows.length > 0 ? (
                                paginatedRows.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50 transition">
                                        <td className="px-2 py-2 border-r border-slate-100">{row.origin}</td>
                                        <td className="px-2 py-2 border-r border-slate-100">{row.dest}</td>
                                        <td className="px-2 py-2 border-r border-slate-100">{category === 'TARIF' ? row.sysCode : row.serviceIT}</td>
                                        {category === 'BIAYA' && (
                                            <td className="px-2 py-2 border-r border-slate-100 text-blue-600 font-semibold">{row.serviceMaster}</td>
                                        )}

                                        {category === 'TARIF' ? (
                                            <>
                                                <td className="px-2 py-2 border-r border-slate-100 bg-slate-50">{row.serviceMaster}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 bg-slate-50 text-right">{safeRender(row.tarifMaster)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 bg-slate-50 text-center">{row.slaFormMaster}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 bg-slate-50 text-center">{row.slaThruMaster}</td>

                                                <td className="px-2 py-2 border-r border-slate-100">{row.serviceIT}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 text-right">{safeRender(row.tarifIT)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 text-center">{row.slaFormIT}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 text-center">{row.slaThruIT}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-2 py-2 border-r border-slate-100 bg-slate-50 text-right">{safeRender(row.bpMaster)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 bg-slate-50 text-right">{safeRender(row.bpNextMaster)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 bg-slate-50 text-right">{safeRender(row.btMaster)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 bg-slate-50 text-right">{safeRender(row.bdMaster)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 bg-slate-50 text-right">{safeRender(row.bdNextMaster)}</td>

                                                <td className="px-2 py-2 border-r border-slate-100 text-right">{safeRender(row.bpIT)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 text-right">{safeRender(row.bpNextIT)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 text-right">{safeRender(row.btIT)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 text-right">{safeRender(row.bdIT)}</td>
                                                <td className="px-2 py-2 border-r border-slate-100 text-right">{safeRender(row.bdNextIT)}</td>
                                            </>
                                        )}

                                        <td className={`px-2 py-2 font-medium ${row.keterangan === 'Sesuai' ? 'text-green-600' : 'text-red-600'}`}>
                                            {row.keterangan}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={15} className="px-6 py-12 text-center text-slate-400">Tidak ada data.</td></tr>
                            )}
                        </tbody>
                    </table>
                    )}
                </div>

                {totalPages > 0 && (
                <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center flex-shrink-0">
                    <p className="text-sm text-slate-500">Page {currentPage} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50">
                            <ChevronLeft size={16} />
                        </button>
                        <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};