
import React, { useState, useEffect } from 'react';
import { Upload, FileUp, AlertTriangle, CheckCircle2, Download, Eye, X, Table as TableIcon, History, RotateCcw, Trash2, HelpCircle } from 'lucide-react';
import { ValidationResult, ValidationMismatch, FullValidationRow, ValidationDetail, ValidationHistoryItem, ValidationCategory } from '../types';

interface TarifValidatorProps {
    category: ValidationCategory;
}

export const TarifValidator: React.FC<TarifValidatorProps> = ({ category }) => {
  const [fileIT, setFileIT] = useState<File | null>(null);
  const [fileMaster, setFileMaster] = useState<File | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [selectedMismatch, setSelectedMismatch] = useState<ValidationMismatch | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  
  const [history, setHistory] = useState<ValidationHistoryItem[]>([]);
  const [reportFilter, setReportFilter] = useState<'ALL' | 'MATCH' | 'MISMATCH' | 'BLANK'>('ALL');

  useEffect(() => {
    const savedHistory = localStorage.getItem('validationHistory');
    if (savedHistory) {
        try {
            setHistory(JSON.parse(savedHistory));
        } catch (e) {
            console.error("Failed to parse history", e);
        }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('validationHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
      setFileIT(null);
      setFileMaster(null);
      setResult(null);
      setSelectedMismatch(null);
      setShowFullReport(false);
      setProgress(0);
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
        // BIAYA TEMPLATES
        if (type === 'IT') {
            content = 'ORIGIN,DESTINASI,SERVICE,BT,BD,BD NEXT,BP,BP NEXT\nAMI20100,BDJ10502,REG23,1500,3200,0,0,0';
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
    if (!result) return;
    
    const data = rowsToDownload || result.fullReport;
    let header = '';
    let rows: string[] = [];

    if (category === 'TARIF') {
        header = [
            'ORIGIN', 'DEST', 'SYS_CODE', 
            'Service REG', 'Tarif REG', 'sla form REG', 'sla thru REG', 
            'SERVICE', 'TARIF', 'SLA_FORM', 'SLA_THRU', 'Keterangan'
        ].join(',');

        rows = data.map(row => [
            row.origin, row.dest, row.sysCode,
            row.serviceMaster, row.tarifMaster, row.slaFormMaster, row.slaThruMaster,
            row.serviceIT, row.tarifIT, row.slaFormIT, row.slaThruIT,
            `"${row.keterangan}"`
        ].join(','));
    } else {
        // BIAYA HEADER
        header = [
            'ORIGIN', 'DESTINASI', 'SERVICE', 
            'BP Master', 'BP Next Master', 'BT Master', 'BD Master', 'BD Next Master', 
            'BP IT', 'BP Next IT', 'BT IT', 'BD IT', 'BD Next IT', 'Keterangan'
        ].join(',');

        rows = data.map(row => [
            row.origin, row.dest, row.sysCode, // sysCode stores Service for Biaya view internal logic sometimes, but distinct cols here
            row.bpMaster, row.bpNextMaster, row.btMaster, row.bdMaster, row.bdNextMaster,
            row.bpIT, row.bpNextIT, row.btIT, row.bdIT, row.bdNextIT,
            `"${row.keterangan}"`
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

  // Robust CSV Reader
  const readCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        let text = e.target?.result as string;
        if (!text) { resolve([]); return; }
        
        text = text.replace(/^\uFEFF/, '');
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalizedText.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) { resolve([]); return; }

        const firstLine = lines[0];
        const commaCount = (firstLine.match(/,/g) || []).length;
        const semiCount = (firstLine.match(/;/g) || []).length;
        const delimiter = semiCount > commaCount ? ';' : ',';
        
        const parseLine = (line: string) => {
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

        const headers = parseLine(lines[0]);
        
        const data = lines.slice(1).map(line => {
            const values = parseLine(line);
            const row: any = {};
            const hasContent = values.some(v => v.trim() !== '');
            if (!hasContent) return null;

            headers.forEach((header, idx) => {
                if (header) {
                    row[header.trim()] = values[idx] || '';
                }
            });
            return row;
        }).filter(r => r !== null);
        
        resolve(data);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  const processValidation = async () => {
    if (!fileIT || !fileMaster) return;
    
    setIsValidating(true);
    setProgress(0);
    setResult(null);

    try {
        const [itData, masterData] = await Promise.all([readCSV(fileIT), readCSV(fileMaster)]);
        
        if (itData.length === 0 || masterData.length === 0) {
            alert("Salah satu file kosong atau format tidak valid (tidak ada data).");
            setIsValidating(false);
            return;
        }

        // --- BIAYA LOGIC ---
        if (category === 'BIAYA') {
            // Master Map: Key = DESTINASI (uppercase trim)
            const masterMap = new Map<string, any>();
            const destKeyMaster = Object.keys(masterData[0]).find(k => k.toUpperCase().includes('DEST')) || 'DESTINASI';
            
            masterData.forEach(row => {
                const key = String(row[destKeyMaster] || '').trim().toUpperCase();
                if(key) masterMap.set(key, row);
            });

            // IT Data Key = DESTINASI
            const destKeyIT = Object.keys(itData[0]).find(k => k.toUpperCase().includes('DEST')) || 'DESTINASI';
            const serviceKeyIT = Object.keys(itData[0]).find(k => k.toUpperCase().includes('SERVICE')) || 'SERVICE';

            if (!destKeyIT || !serviceKeyIT) {
                throw new Error("Header DESTINASI atau SERVICE tidak ditemukan di file IT.");
            }

            const totalItems = itData.length;
            const CHUNK_SIZE = 1000;
            const fullReport: FullValidationRow[] = [];
            const mismatches: ValidationMismatch[] = [];
            let matchesCount = 0;
            let blanksCount = 0;

            for (let i = 0; i < totalItems; i += CHUNK_SIZE) {
                const chunk = itData.slice(i, i + CHUNK_SIZE);

                chunk.forEach((itRow, idx) => {
                    const rowIndex = i + idx + 1;
                    const dest = String(itRow[destKeyIT] || '').trim();
                    const service = String(itRow[serviceKeyIT] || '').trim(); // e.g. "REG23"
                    const masterRow = masterMap.get(dest.toUpperCase());

                    const parseNum = (val: any) => parseInt((val || '0').replace(/[^0-9]/g, '')) || 0;

                    const reportRow: FullValidationRow = {
                        origin: String(itRow['ORIGIN'] || ''),
                        dest: dest,
                        sysCode: service, // Using sysCode field to display Service in report logic if needed, or just serviceIT
                        
                        serviceMaster: service, // Logic dictates we compare against this service
                        tarifMaster: 0, slaFormMaster: 0, slaThruMaster: 0, // Unused in Biaya
                        serviceIT: service,
                        tarifIT: 0, slaFormIT: 0, slaThruIT: 0, // Unused in Biaya

                        // Cost Fields
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
                        // Fill masters with 0
                        reportRow.bpMaster = 0; reportRow.bpNextMaster = 0; reportRow.btMaster = 0; reportRow.bdMaster = 0; reportRow.bdNextMaster = 0;
                    } else {
                        // Dynamic Column Lookup in Master
                        // Format: "BP [SERVICE]", "BP NEXT [SERVICE]"
                        const getMasterVal = (prefix: string) => {
                            // Find key that contains prefix + service
                            // Example: prefix="BP", service="REG23" -> search for "BP REG23"
                            const key = Object.keys(masterRow).find(k => 
                                k.toUpperCase() === `${prefix} ${service}`.toUpperCase()
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

                        const check = (col: string, valIT: number, valMaster: number) => {
                            const match = valIT === valMaster;
                            if (!match) issues.push(col);
                            details.push({ column: col, itValue: valIT, masterValue: valMaster, isMatch: match });
                        };

                        check('BP', reportRow.bpIT!, reportRow.bpMaster!);
                        check('BP NEXT', reportRow.bpNextIT!, reportRow.bpNextMaster!);
                        check('BT', reportRow.btIT!, reportRow.btMaster!);
                        check('BD', reportRow.bdIT!, reportRow.bdMaster!);
                        check('BD NEXT', reportRow.bdNextIT!, reportRow.bdNextMaster!);

                        if (issues.length === 0) {
                            reportRow.keterangan = 'Sesuai';
                            matchesCount++;
                        } else {
                            reportRow.keterangan = `Tidak sesuai: ${issues.join(', ')}`;
                            mismatches.push({
                                rowId: rowIndex,
                                reasons: issues.map(i => `${i} tidak sesuai`),
                                details: details
                            });
                        }
                    }
                    fullReport.push(reportRow);
                });
                
                setProgress(Math.round(((i + CHUNK_SIZE) / totalItems) * 100));
                await new Promise(resolve => setTimeout(resolve, 0));
            }

            finishValidation(fullReport, matchesCount, blanksCount, mismatches);

        } else {
            // --- TARIF LOGIC (Existing) ---
            const findSysCodeHeader = (row: any) => {
                if (!row) return null;
                return Object.keys(row).find(k => k.trim().replace(/_/g, '').toUpperCase() === 'SYSCODE');
            };

            const sysKeyIT = findSysCodeHeader(itData[0]);
            const sysKeyMaster = findSysCodeHeader(masterData[0]);

            if (!sysKeyIT || !sysKeyMaster) throw new Error("Kolom SYS_CODE tidak ditemukan.");

            const getCleanSysCode = (val: any) => val ? String(val).trim().toUpperCase() : '';

            const itMap = new Map<string, any>();
            itData.forEach(row => {
                const sysCode = getCleanSysCode(row[sysKeyIT]);
                if (sysCode) itMap.set(sysCode, row);
            });

            const masterMap = new Map<string, any>();
            masterData.forEach(row => {
                const sysCode = getCleanSysCode(row[sysKeyMaster]);
                if (sysCode) masterMap.set(sysCode, row);
            });

            const allSysCodesArray = Array.from(new Set([...itMap.keys(), ...masterMap.keys()]));
            const totalItems = allSysCodesArray.length;
            const CHUNK_SIZE = 1000;
            const fullReport: FullValidationRow[] = [];
            const mismatches: ValidationMismatch[] = [];
            let matchesCount = 0;
            let blanksCount = 0;

            for (let i = 0; i < totalItems; i += CHUNK_SIZE) {
                const chunk = allSysCodesArray.slice(i, i + CHUNK_SIZE);

                chunk.forEach((sysCode, idx) => {
                    const rowIndex = i + idx + 1;
                    const itRow = itMap.get(sysCode);
                    const masterRow = masterMap.get(sysCode);
                    const parseNum = (val: any) => parseInt((val || '0').replace(/[^0-9]/g, '')) || 0;
                    
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
                    } else if (!itRow) {
                        reportRow.keterangan = 'Data IT Tidak Ada';
                        blanksCount++;
                        mismatches.push({ rowId: rowIndex, reasons: ['Data IT Tidak Ada'], details: [] });
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
                });
                
                setProgress(Math.round(((i + CHUNK_SIZE) / totalItems) * 100));
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            finishValidation(fullReport, matchesCount, blanksCount, mismatches);
        }

    } catch (error: any) {
        console.error("Validation Error:", error);
        alert(`Terjadi kesalahan: ${error.message}`);
    } finally {
        setIsValidating(false);
        setProgress(0);
    }
  };

  const finishValidation = (report: FullValidationRow[], matches: number, blanks: number, mismatches: ValidationMismatch[]) => {
      const validationResult: ValidationResult = {
          totalRows: report.length,
          matches,
          blanks,
          mismatches,
          fullReport: report
      };
      setResult(validationResult);

      const historyItem: ValidationHistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('id-ID'),
          fileNameIT: fileIT!.name,
          fileNameMaster: fileMaster!.name,
          result: validationResult,
          category: category
      };
      setHistory(prev => [historyItem, ...prev]);
  };

  const getDisplayedRows = () => {
      if (!result) return [];
      if (reportFilter === 'ALL') return result.fullReport;
      if (reportFilter === 'MATCH') return result.fullReport.filter(r => r.keterangan === 'Sesuai');
      if (reportFilter === 'BLANK') return result.fullReport.filter(r => r.keterangan.includes('Tidak Ada'));
      if (reportFilter === 'MISMATCH') return result.fullReport.filter(r => !r.keterangan.includes('Sesuai') && !r.keterangan.includes('Tidak Ada'));
      return [];
  };

  const displayedRows = getDisplayedRows();
  const displayedHistory = history.filter(item => {
    if (!item.category && category === 'TARIF') return true;
    return item.category === category;
  });

  const clearHistory = () => {
      if(window.confirm('Hapus semua riwayat validasi?')) setHistory([]);
  };

  const restoreFromHistory = (item: ValidationHistoryItem) => {
      setResult(item.result);
      setFileIT(null); setFileMaster(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenReport = (filter: 'ALL' | 'MATCH' | 'MISMATCH' | 'BLANK') => {
    setReportFilter(filter);
    setShowFullReport(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">Validasi {category === 'TARIF' ? 'Tarif' : 'Biaya'} Otomatis</h2>
        <p className="text-slate-500 max-w-2xl mx-auto">
            {category === 'TARIF' ? (
                <>
                Upload Data IT dan Master Data Tarif. Validasi: Service, Tarif, SLA Form, SLA Thru.<br/>
                <span className="text-xs italic">Lookup: SYS_CODE</span>
                </>
            ) : (
                <>
                Upload Data IT dan Master Data Costing. Validasi: BP, BP Next, BT, BD, BD Next.<br/>
                <span className="text-xs italic">Lookup: Destinasi & Service (Map ke Master Columns)</span>
                </>
            )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:border-blue-400 transition group relative">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <FileUp size={24} />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">Template Data IT</h3>
            <p className="text-xs text-slate-400 mb-3">Upload file CSV</p>
            <input type="file" onChange={(e) => handleFileChange(e, 'IT')} className="hidden" id="file-it" accept=".csv" />
            <label htmlFor="file-it" className="cursor-pointer px-4 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 w-full truncate mb-3">
                {fileIT ? fileIT.name : (result ? 'Tidak ada file baru' : 'Click to Upload')}
            </label>
            <button onClick={() => downloadTemplate('IT')} className="text-xs text-blue-600 border border-blue-100 px-3 py-1 rounded hover:bg-blue-50">
                <Download size={12}/> Download Template
            </button>
            {fileIT && <span className="absolute top-4 right-4 text-green-500"><CheckCircle2 size={20}/></span>}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:border-purple-400 transition group relative">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4">
                <FileUp size={24} />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">Template Master Data</h3>
            <p className="text-xs text-slate-400 mb-3">Upload file CSV</p>
            <input type="file" onChange={(e) => handleFileChange(e, 'MASTER')} className="hidden" id="file-master" accept=".csv" />
            <label htmlFor="file-master" className="cursor-pointer px-4 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 w-full truncate mb-3">
                {fileMaster ? fileMaster.name : (result ? 'Tidak ada file baru' : 'Click to Upload')}
            </label>
            <button onClick={() => downloadTemplate('MASTER')} className="text-xs text-purple-600 border border-purple-100 px-3 py-1 rounded hover:bg-purple-50">
                <Download size={12}/> Download Template
            </button>
            {fileMaster && <span className="absolute top-4 right-4 text-green-500"><CheckCircle2 size={20}/></span>}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        {isValidating ? (
             <div className="w-full max-w-md bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-slate-700">Validating...</span>
                    <span className="text-sm font-bold text-blue-600">{progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-200 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
             </div>
        ) : (
            <button 
                disabled={!fileIT || !fileMaster || isValidating}
                onClick={processValidation}
                className={`px-8 py-3 rounded-full font-semibold shadow-lg transition flex items-center gap-2 ${(!fileIT || !fileMaster) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
                <Upload size={20} /> Mulai Validasi {category === 'TARIF' ? 'Tarif' : 'Biaya'}
            </button>
        )}
      </div>

      {result && (
          <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-lg text-slate-800">Hasil Validasi {category}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenReport('ALL')} className="text-slate-500 text-sm flex items-center gap-1 hover:text-blue-600 border border-slate-200 px-3 py-1 rounded">
                        <TableIcon size={16} /> Lihat Detail
                    </button>
                    <button onClick={() => downloadFullReport()} className="text-blue-600 text-sm flex items-center gap-1 hover:underline font-medium">
                        <Download size={16} /> Download Report
                    </button>
                  </div>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div onClick={() => handleOpenReport('ALL')} className="bg-blue-50 p-4 rounded-lg border border-blue-100 hover:bg-blue-100 transition cursor-pointer">
                    <p className="text-sm text-blue-600 mb-1">Total Data</p>
                    <p className="text-3xl font-bold text-blue-800">{result.totalRows}</p>
                </div>
                <div onClick={() => handleOpenReport('MATCH')} className="bg-green-50 p-4 rounded-lg border border-green-100 hover:bg-green-100 transition cursor-pointer">
                    <p className="text-sm text-green-600 mb-1">Data Sesuai</p>
                    <p className="text-3xl font-bold text-green-800">{result.matches}</p>
                </div>
                <div onClick={() => handleOpenReport('MISMATCH')} className="bg-red-50 p-4 rounded-lg border border-red-100 hover:bg-red-100 transition cursor-pointer">
                    <p className="text-sm text-red-600 mb-1">Tidak Sesuai</p>
                    <p className="text-3xl font-bold text-red-800">{result.mismatches.length - result.blanks}</p>
                </div>
                <div onClick={() => handleOpenReport('BLANK')} className="bg-slate-100 p-4 rounded-lg border border-slate-200 hover:bg-slate-200 transition cursor-pointer">
                    <p className="text-sm text-slate-600 mb-1">Data Blank</p>
                    <p className="text-3xl font-bold text-slate-800">{result.blanks}</p>
                </div>
              </div>

              {result.mismatches.length > 0 && (
                <div className="border-t border-slate-200">
                    <div className="bg-slate-50 px-6 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick List Ketidaksesuaian</div>
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {result.mismatches.map((item, idx) => (
                            <div key={idx} onClick={(e) => { e.stopPropagation(); setSelectedMismatch(item); }} className="px-6 py-3 flex items-center justify-between hover:bg-blue-50 cursor-pointer group transition">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">Row ID: {item.rowId}</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {item.reasons.map((reason, rIdx) => (
                                                <span key={rIdx} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">{reason}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Eye size={16} className="text-slate-300 group-hover:text-blue-500" />
                            </div>
                        ))}
                    </div>
                </div>
              )}
          </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><History size={20} className="text-slate-500" /> Riwayat Validasi {category}</h3>
            {displayedHistory.length > 0 && <button onClick={clearHistory} className="text-red-500 text-sm flex items-center gap-1"><Trash2 size={16} /> Hapus</button>}
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr><th className="px-6 py-3">Waktu</th><th className="px-6 py-3">File IT</th><th className="px-6 py-3">File Master</th><th className="px-6 py-3">Hasil</th><th className="px-6 py-3">Aksi</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {displayedHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3">{item.timestamp}</td>
                            <td className="px-6 py-3 font-medium">{item.fileNameIT}</td>
                            <td className="px-6 py-3 font-medium">{item.fileNameMaster}</td>
                            <td className="px-6 py-3">{item.result.matches} Sesuai / {item.result.mismatches.length} Mismatch</td>
                            <td className="px-6 py-3"><button onClick={() => restoreFromHistory(item)} className="text-blue-600 flex items-center gap-1 text-xs border border-blue-100 px-2 py-1 rounded"><RotateCcw size={12} /> Lihat</button></td>
                        </tr>
                    ))}
                    {displayedHistory.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Belum ada riwayat.</td></tr>}
                </tbody>
            </table>
        </div>
      </div>

      {/* FULL REPORT MODAL */}
      {showFullReport && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[90vh] flex flex-col animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 flex-shrink-0">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><TableIcon size={20} className="text-blue-600" /> Laporan Validasi {category}</h3>
                    <div className="flex items-center gap-3">
                        <button onClick={() => downloadFullReport(displayedRows)} className="flex items-center gap-2 bg-green-600 text-white px-3 py-1.5 rounded text-sm"><Download size={16} /> Download CSV</button>
                        <button onClick={() => setShowFullReport(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr className="uppercase text-slate-800 font-bold border-b border-slate-300">
                                {category === 'TARIF' ? (
                                    <>
                                    <th className="bg-yellow-300 px-2 py-3 border-r min-w-[100px]">ORIGIN</th>
                                    <th className="bg-yellow-300 px-2 py-3 border-r min-w-[100px]">DEST</th>
                                    <th className="bg-yellow-300 px-2 py-3 border-r min-w-[150px]">SYS_CODE</th>
                                    <th className="bg-slate-200 px-2 py-3 border-r min-w-[80px]">Service REG</th>
                                    <th className="bg-slate-200 px-2 py-3 border-r min-w-[80px]">Tarif REG</th>
                                    <th className="bg-slate-200 px-2 py-3 border-r min-w-[80px]">sla form</th>
                                    <th className="bg-slate-200 px-2 py-3 border-r min-w-[80px]">sla thru</th>
                                    <th className="bg-white px-2 py-3 border-r min-w-[80px]">SERVICE</th>
                                    <th className="bg-white px-2 py-3 border-r min-w-[80px]">TARIF</th>
                                    <th className="bg-white px-2 py-3 border-r min-w-[80px]">SLA_FORM</th>
                                    <th className="bg-white px-2 py-3 border-r min-w-[80px]">SLA_THRU</th>
                                    </>
                                ) : (
                                    <>
                                    <th className="bg-yellow-300 px-2 py-3 border-r min-w-[100px]">ORIGIN</th>
                                    <th className="bg-yellow-300 px-2 py-3 border-r min-w-[100px]">DEST</th>
                                    <th className="bg-yellow-300 px-2 py-3 border-r min-w-[80px]">SERVICE</th>
                                    <th className="bg-slate-200 px-2 py-3 border-r min-w-[60px]">BP Master</th>
                                    <th className="bg-slate-200 px-2 py-3 border-r min-w-[60px]">BP Next M</th>
                                    <th className="bg-slate-200 px-2 py-3 border-r min-w-[60px]">BT Master</th>
                                    <th className="bg-slate-200 px-2 py-3 border-r min-w-[60px]">BD Master</th>
                                    <th className="bg-slate-200 px-2 py-3 border-r min-w-[60px]">BD Next M</th>
                                    <th className="bg-white px-2 py-3 border-r min-w-[60px]">BP IT</th>
                                    <th className="bg-white px-2 py-3 border-r min-w-[60px]">BP Next IT</th>
                                    <th className="bg-white px-2 py-3 border-r min-w-[60px]">BT IT</th>
                                    <th className="bg-white px-2 py-3 border-r min-w-[60px]">BD IT</th>
                                    <th className="bg-white px-2 py-3 border-r min-w-[60px]">BD Next IT</th>
                                    </>
                                )}
                                <th className="bg-white px-2 py-3 min-w-[200px]">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayedRows.length > 0 ? (
                                displayedRows.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50 transition">
                                        <td className="px-2 py-2 border-r">{row.origin}</td>
                                        <td className="px-2 py-2 border-r">{row.dest}</td>
                                        <td className="px-2 py-2 border-r">{row.sysCode}</td>
                                        
                                        {category === 'TARIF' ? (
                                            <>
                                            <td className="px-2 py-2 border-r bg-slate-50">{row.serviceMaster}</td>
                                            <td className="px-2 py-2 border-r bg-slate-50">{row.tarifMaster.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r bg-slate-50">{row.slaFormMaster}</td>
                                            <td className="px-2 py-2 border-r bg-slate-50">{row.slaThruMaster}</td>
                                            <td className="px-2 py-2 border-r">{row.serviceIT}</td>
                                            <td className="px-2 py-2 border-r">{row.tarifIT.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r">{row.slaFormIT}</td>
                                            <td className="px-2 py-2 border-r">{row.slaThruIT}</td>
                                            </>
                                        ) : (
                                            <>
                                            <td className="px-2 py-2 border-r bg-slate-50">{row.bpMaster?.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r bg-slate-50">{row.bpNextMaster?.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r bg-slate-50">{row.btMaster?.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r bg-slate-50">{row.bdMaster?.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r bg-slate-50">{row.bdNextMaster?.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r">{row.bpIT?.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r">{row.bpNextIT?.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r">{row.btIT?.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r">{row.bdIT?.toLocaleString()}</td>
                                            <td className="px-2 py-2 border-r">{row.bdNextIT?.toLocaleString()}</td>
                                            </>
                                        )}
                                        
                                        <td className={`px-2 py-2 font-medium ${row.keterangan === 'Sesuai' ? 'text-slate-800' : 'text-red-600'}`}>
                                            {row.keterangan}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={13} className="px-6 py-12 text-center text-slate-400">Tidak ada data untuk filter ini.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {selectedMismatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Detail Ketidaksesuaian</h3>
                        <p className="text-sm text-slate-500">Row ID: {selectedMismatch.rowId}</p>
                    </div>
                    <button onClick={() => setSelectedMismatch(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>
                <div className="p-6">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr><th className="px-4 py-3">Column</th><th className="px-4 py-3">Data IT (Uploaded)</th><th className="px-4 py-3">Master Data</th><th className="px-4 py-3 text-center">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {selectedMismatch.details.map((detail, idx) => (
                                <tr key={idx} className={!detail.isMatch ? "bg-red-50/50" : ""}>
                                    <td className="px-4 py-3 font-medium text-slate-700">{detail.column}</td>
                                    <td className={`px-4 py-3 ${!detail.isMatch ? 'text-black font-semibold' : 'text-slate-600'}`}>{detail.itValue}</td>
                                    <td className={`px-4 py-3 ${!detail.isMatch ? 'text-green-700 font-semibold' : 'text-slate-600'}`}>{detail.masterValue}</td>
                                    <td className="px-4 py-3 text-center">{detail.isMatch ? <CheckCircle2 size={12} className="text-green-600"/> : <X size={12} className="text-red-600"/>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end"><button onClick={() => setSelectedMismatch(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition text-sm font-medium">Tutup</button></div>
            </div>
        </div>
      )}
    </div>
  );
};
