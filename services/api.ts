
import { Job, User, ValidationLog } from '../types';
import { JSONBIN_URL, JSONBIN_API_KEY } from '../constants';

interface AppData {
  jobs: Job[];
  users: User[];
  validationLogs: ValidationLog[];
}

interface JsonBinResponse {
  record: AppData;
  metadata: any;
}

export const api = {
  /**
   * Fetch data from JSONBin.io
   */
  async getData(): Promise<AppData | null> {
    try {
      const response = await fetch(JSONBIN_URL, {
        method: 'GET',
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data: JsonBinResponse = await response.json();
      
      // JSONBin v3 returns the actual data inside the "record" property
      const record = data.record || {} as Partial<AppData>;
      
      return {
        jobs: record.jobs || [],
        users: record.users || [],
        validationLogs: record.validationLogs || []
      };

    } catch (error) {
      console.error('Error fetching data from JSONBin:', error);
      throw error;
    }
  },

  /**
   * Save data to JSONBin.io
   */
  async saveData(data: AppData): Promise<boolean> {
    try {
      const response = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
         throw new Error(`Server returned ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Error saving data to JSONBin:', error);
      return false;
    }
  }
};
