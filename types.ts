
export type Status = 'Pending' | 'In Progress' | 'Completed' | 'Overdue';

export interface Job {
  id: string;
  category: string;
  subCategory: string;
  dateInput: string;
  branchDept: string;
  jobType: string;
  status: Status;
  deadline: string;
  activationDate?: string;
  keterangan?: string;
  notes?: string;
  createdBy?: string;
}

export interface MenuItem {
  name: string;
  submenus: string[];
}

export interface MenuStructure {
  [key: string]: MenuItem;
}

export type ViewMode = 'dashboard' | 'category';

export type UserRole = 'Admin' | 'User';

export interface User {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface ValidationLog {
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_IMPORT' | 'RESET_PASSWORD' | 'VALIDATION';
  description: string;
  category?: string;
}

export type ValidationCategory = 'TARIF' | 'BIAYA';

export interface ValidationDetail {
    column: string;
    itValue: string | number;
    masterValue: string | number;
    isMatch: boolean;
}

export interface ValidationMismatch {
    rowId: number;
    reasons: string[];
    details: ValidationDetail[];
}

export interface FullValidationRow {
    origin: string;
    dest: string;
    sysCode: string;
    
    // Tarif Fields
    serviceMaster: string;
    tarifMaster: number;
    slaFormMaster: number;
    slaThruMaster: number;
    serviceIT: string;
    tarifIT: number;
    slaFormIT: number;
    slaThruIT: number;

    // Biaya Fields
    bpMaster?: number;
    bpNextMaster?: number;
    btMaster?: number;
    bdMaster?: number;
    bdNextMaster?: number;
    
    bpIT?: number;
    bpNextIT?: number;
    btIT?: number;
    bdIT?: number;
    bdNextIT?: number;

    keterangan: string;
}

export interface ValidationResult {
    totalRows: number;
    matches: number;
    blanks: number;
    mismatches: ValidationMismatch[];
    fullReport: FullValidationRow[];
}

export interface ValidationHistoryItem {
    id: string;
    timestamp: string;
    fileNameIT: string;
    fileNameMaster: string;
    result: ValidationResult;
    category: ValidationCategory;
}