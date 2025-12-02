

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

export interface TarifRow {
  ORIGIN: string;
  DEST: string;
  SYS_CODE: string;
  SERVICE: string;
  TARIF: string;
  SLA_FORM: string;
  SLA_THRU: string;
  [key: string]: string | string[] | undefined; // Fallback
}

export interface ValidationResultRow extends TarifRow {
  validationStatus: 'MATCH' | 'MISMATCH' | 'BLANK';
  errors: string[];
}