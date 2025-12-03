
import { MenuStructure, User } from './types';

export const MENU_STRUCTURE: MenuStructure = {
  "Penyesuaian": {
    name: "Penyesuaian",
    submenus: ["Harga Jual", "Routing", "Costing"]
  },
  "Request Data": {
    name: "Request Data",
    submenus: ["KCU", "Nasional", "Project"]
  },
  "Problem": {
    name: "Problem",
    submenus: ["Tarif", "SLA", "Biaya", "Routing"]
  },
  "Produksi Master Data": {
    name: "Produksi Master Data",
    submenus: ["Cabang", "Nasional"]
  },
  "Validasi": {
    name: "Validasi",
    submenus: ["Tarif Otomatis", "Biaya Validasi"]
  }
};

export const JNE_RED = "#EE2E24";
export const JNE_BLUE = "#002F6C";

export const LOGO_URL = "https://lh3.googleusercontent.com/d/19L5QBkcuSDrfWX_uqZGVUkpAlriZijp1";

// Google Apps Script Configuration (Backup/Alternative)
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby0EwNykAaEfujJ3OK7glHks5OtNpZfEV6XcsDKtv1G5qcLdQglmUFzd4yiaZsRkBkg/exec";

// JSONBin.io Configuration (Primary)
export const JSONBIN_BIN_ID = "692843aa43b1c97be9c875fd";
export const JSONBIN_API_KEY = "$2a$10$LGur5G.UJ.Zqbg.83y6MrO/GqNujJc/zDfMiAx6keBe5gGyUhbSim";
export const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

// Default users configuration
export const AUTHORIZED_USERS: User[] = [
  { email: "Ahmad.fauzan@jne.co.id", name: "Ahmad Fauzan", role: "Admin", password: "000000" },
  { email: "agus.permana@jne.co.id", name: "Agus Permana", role: "User", password: "000000" },
  { email: "rita.sumardi@jne.co.id", name: "Rita Sumardi", role: "User", password: "000000" },
  { email: "adm.ppdd@jne.co.id", name: "Admin PPDD", role: "User", password: "000000" },
  { email: "davis.gunawan@jne.co.id", name: "Davis Gunawan", role: "Admin", password: "000000" }
];