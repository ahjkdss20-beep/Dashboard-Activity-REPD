
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from './components/Layout';
import { DashboardSummary } from './components/DashboardSummary';
import { JobManager } from './components/JobManager';
import { Login } from './components/Login';
import { TarifValidator } from './components/TarifValidator';
import { Job, User, ValidationLog } from './types';
import { AUTHORIZED_USERS } from './constants';
import { api } from './services/api';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('jne_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>(AUTHORIZED_USERS);
  const [validationLogs, setValidationLogs] = useState<ValidationLog[]>([]);
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubCategory, setActiveSubCategory] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (isSaving) return;

    try {
      const data = await api.getData();
      if (data) {
        setConnectionError(false);
        
        if (data.jobs && Array.isArray(data.jobs)) {
            setJobs(data.jobs);
        }

        if (data.validationLogs && Array.isArray(data.validationLogs)) {
            setValidationLogs(data.validationLogs);
        }

        if (data.users && Array.isArray(data.users)) {
            // Merge authorized users (code) with passwords from cloud
            const mergedUsers = AUTHORIZED_USERS.map(defaultUser => {
                const cloudUser = data.users.find((u: User) => u.email === defaultUser.email);
                return {
                    ...defaultUser, 
                    password: cloudUser ? cloudUser.password : defaultUser.password
                };
            });
            setUsers(mergedUsers);
        }
        
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isSaving]);

  // Initial fetch and polling
  useEffect(() => {
    fetchData(); 
    const intervalId = setInterval(() => {
        fetchData();
    }, 5000); // Sync every 5 seconds
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const saveToCloud = async (newJobs: Job[], newUsers: User[], newLogs: ValidationLog[]) => {
    setIsSaving(true);
    // Optimistic update
    setJobs(newJobs);
    setUsers(newUsers);
    setValidationLogs(newLogs);

    try {
        const success = await api.saveData({
            jobs: newJobs,
            users: newUsers,
            validationLogs: newLogs
        });
        
        if (success) {
            setLastUpdated(new Date());
            setConnectionError(false);
        } else {
            setConnectionError(true);
            alert("Gagal menyimpan ke server. Data tersimpan sementara di aplikasi tetapi belum masuk ke Database Pusat.");
        }
    } catch (error) {
        console.error(error);
        setConnectionError(true);
    } finally {
        setIsSaving(false);
    }
  };

  // Persist current logged in user session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('jne_current_user', JSON.stringify(currentUser));
      // Update local current user instance if cloud data changes (e.g. password change)
      const freshUser = users.find(u => u.email === currentUser.email);
      if (freshUser && freshUser.password !== currentUser.password) {
        setCurrentUser(freshUser);
      }
    } else {
      localStorage.removeItem('jne_current_user');
    }
  }, [currentUser, users]);

  const createLog = (action: ValidationLog['action'], description: string, category?: string): ValidationLog => {
      return {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          user: currentUser?.name || 'Unknown',
          action,
          description,
          category
      };
  };

  const handleValidationLog = (log: ValidationLog) => {
      saveToCloud(jobs, users, [log, ...validationLogs]);
  };

  const handleLogin = (user: User) => {
    // Get the freshest user data
    const freshUserData = users.find(u => u.email === user.email) || user;
    setCurrentUser(freshUserData);
  };

  const handleResetPassword = async (email: string) => {
    const targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (targetUser) {
        const defaultPassword = "000000";
        const updatedUser = { ...targetUser, password: defaultPassword };
        const updatedUserList = users.map(u => u.email === targetUser.email ? updatedUser : u);
        
        // Log reset
        const newLog: ValidationLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            user: 'System',
            action: 'RESET_PASSWORD',
            description: `Reset password for user ${targetUser.email}`
        };
        const updatedLogs = [newLog, ...validationLogs];

        // Save directly to cloud
        await saveToCloud(jobs, updatedUserList, updatedLogs);
        return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveCategory(null);
    setActiveSubCategory(null);
  };

  const handleChangePassword = (oldPass: string, newPass: string) => {
    if (!currentUser) return false;
    const actualUser = users.find(u => u.email === currentUser.email) || currentUser;
    if (actualUser.password !== oldPass) return false;

    const updatedUser = { ...actualUser, password: newPass };
    const updatedUserList = users.map(u => u.email === actualUser.email ? updatedUser : u);
    
    saveToCloud(jobs, updatedUserList, validationLogs);
    setCurrentUser(updatedUser);
    return true;
  };

  const handleNavigate = (cat: string | null, sub: string | null) => {
    setActiveCategory(cat);
    setActiveSubCategory(sub);
  };

  const handleAddJob = (job: Job) => {
    const newJobs = [job, ...jobs];
    const newLog = createLog('CREATE', `Menambahkan pekerjaan baru: ${job.jobType} di ${job.branchDept}`, job.category);
    saveToCloud(newJobs, users, [newLog, ...validationLogs]);
  };

  const handleUpdateJob = (id: string, updates: Partial<Job>) => {
    const oldJob = jobs.find(j => j.id === id);
    const newJobs = jobs.map(j => j.id === id ? { ...j, ...updates } : j);
    
    // Create detailed log
    let desc = `Update data pekerjaan`;
    if (oldJob) {
        if (updates.status && updates.status !== oldJob.status) {
            desc = `Mengubah status: ${oldJob.jobType} (${oldJob.branchDept}) dari ${oldJob.status} menjadi ${updates.status}`;
        } else if (updates.deadline && updates.deadline !== oldJob.deadline) {
            desc = `Mengubah dateline: ${oldJob.jobType} (${oldJob.branchDept}) menjadi ${updates.deadline}`;
        } else {
             desc = `Mengedit detail pekerjaan: ${oldJob.jobType} (${oldJob.branchDept})`;
        }
    }

    const newLog = createLog('UPDATE', desc, oldJob?.category);
    saveToCloud(newJobs, users, [newLog, ...validationLogs]);
  };

  const handleDeleteJob = (id: string) => {
    if (confirm("Apakah anda yakin ingin menghapus data ini?")) {
      const jobToDelete = jobs.find(j => j.id === id);
      const newJobs = jobs.filter(j => j.id !== id);
      
      const newLog = createLog('DELETE', `Menghapus pekerjaan: ${jobToDelete?.jobType} (${jobToDelete?.branchDept})`, jobToDelete?.category);
      saveToCloud(newJobs, users, [newLog, ...validationLogs]);
    }
  };

  const handleBulkAdd = (addedJobs: Job[]) => {
    const newJobs = [...addedJobs, ...jobs];
    const newLog = createLog('BULK_IMPORT', `Import masal ${addedJobs.length} data pekerjaan`, addedJobs[0]?.category);
    saveToCloud(newJobs, users, [newLog, ...validationLogs]);
  };

  const visibleJobs = useMemo(() => {
    if (!currentUser) return [];
    const userRole = users.find(u => u.email === currentUser.email)?.role || currentUser.role;

    if (userRole === 'Admin') {
        return jobs;
    }

    return jobs.filter(job => 
        job.createdBy === currentUser.email || !job.createdBy
    );
  }, [jobs, currentUser, users]);

  if (!currentUser) {
    return (
        <Login 
            onLogin={handleLogin} 
            users={users} 
            onResetPassword={handleResetPassword}
        />
    );
  }

  const renderContent = () => {
      if (activeCategory === 'Validasi') {
          // Check for subcategory to decide validation type
          if (activeSubCategory === 'Biaya Validasi') {
             return <TarifValidator category="BIAYA" />;
          }
          // Default to Tarif if not Biaya or specifically Tarif
          return <TarifValidator category="TARIF" />;
      }
      
      if (!activeCategory) {
          return (
            <DashboardSummary 
                jobs={visibleJobs} 
                onBulkAddJobs={handleBulkAdd}
                onUpdateJob={handleUpdateJob}
                isLoading={isLoading}
                isSaving={isSaving}
                lastUpdated={lastUpdated}
                connectionError={connectionError}
            />
          );
      }

      if (activeSubCategory) {
          return (
            <JobManager 
                category={activeCategory}
                subCategory={activeSubCategory}
                jobs={visibleJobs}
                onAddJob={handleAddJob}
                onUpdateJob={handleUpdateJob}
                onDeleteJob={handleDeleteJob}
                onBulkAddJobs={handleBulkAdd}
                currentUser={currentUser}
            />
          );
      }

      return null;
  };

  return (
    <Layout 
      activeCategory={activeCategory} 
      activeSubCategory={activeSubCategory} 
      onNavigate={handleNavigate}
      user={currentUser}
      onLogout={handleLogout}
      onChangePassword={handleChangePassword}
    >
      {connectionError && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded relative animate-pulse">
          <strong className="font-bold">Mode Offline: </strong>
          <span className="block sm:inline">Gagal terhubung ke Database. Cek internet Anda.</span>
        </div>
      )}

      {renderContent()}

    </Layout>
  );
}

export default App;
