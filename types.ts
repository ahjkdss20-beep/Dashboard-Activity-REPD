

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

// --- New Validation Interfaces ---

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
    serviceMaster: string;
    tarifMaster: number;
    slaFormMaster: number;
    slaThruMaster: number;
    serviceIT: string;
    tarifIT: number;
    slaFormIT: number;
    slaThruIT: number;
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

// Legacy support if needed, but mostly replaced by FullValidationRow
export interface TarifRow {
  ORIGIN: string;
  DEST: string;
  SYS_CODE: string;
  SERVICE: string;
  TARIF: string;
  SLA_FORM: string;
  SLA_THRU: string;
  [key: string]: string | string[] | undefined;
}

export interface ValidationResultRow extends TarifRow {
  validationStatus: 'MATCH' | 'MISMATCH' | 'BLANK';
  errors: string[];
  SERVICE_REG?: string;
  TARIF_REG?: string;
  SLA_FORM_REG?: string;
  SLA_THRU_REG?: string;
}