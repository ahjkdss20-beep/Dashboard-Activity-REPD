import { Job, User } from '../types';
import { GOOGLE_SCRIPT_URL } from '../constants';

interface AppData {
  jobs: Job[];
  users: User[];
}

export const driveApi = {
  /**
   * Fetch data from Google Drive (via Apps Script)
   */
  async getData(): Promise<AppData | null> {
    try {
      // Add timestamp to prevent caching issues
      const url = `${GOOGLE_SCRIPT_URL}?action=read&t=${new Date().getTime()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow', 
        credentials: 'omit' // Vital for avoiding CORS errors with GAS Web App
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.status === 'error') {
        console.error('Script Error:', data.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching data from Drive:', error);
      throw error;
    }
  },

  /**
   * Save data to Google Drive (via Apps Script)
   */
  async saveData(data: AppData): Promise<boolean> {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        credentials: 'omit',
        redirect: 'follow',
        // Text/plain prevents preflight OPTIONS request
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', 
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
         throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      return result.status === 'success';
    } catch (error) {
      console.error('Error saving data to Drive:', error);
      return false;
    }
  }
};