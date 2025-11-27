import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout } from './components/Layout';
import { DashboardSummary } from './components/DashboardSummary';
import { JobManager } from './components/JobManager';
import { Login } from './components/Login';
import { Job, User } from './types';
import { AUTHORIZED_USERS } from './constants';
import { api } from './services/api';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('jne_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [users, setUsers] = useState<User[]>(AUTHORIZED_USERS);
  
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

  const saveToCloud = async (newJobs: Job[], newUsers: User[]) => {
    setIsSaving(true);
    // Optimistic update
    setJobs(newJobs);
    setUsers(newUsers);

    try {
        const success = await api.saveData({
            jobs: newJobs,
            users: newUsers
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

  const handleLogin = (user: User) => {
    // Get the freshest user data
    const freshUserData = users.find(u => u.email === user.email) || user;
    setCurrentUser(freshUserData);
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
    
    saveToCloud(jobs, updatedUserList);
    setCurrentUser(updatedUser);
    return true;
  };

  const handleNavigate = (cat: string | null, sub: string | null) => {
    setActiveCategory(cat);
    setActiveSubCategory(sub);
  };

  const handleAddJob = (job: Job) => {
    const newJobs = [job, ...jobs];
    saveToCloud(newJobs, users);
  };

  const handleUpdateJob = (id: string, updates: Partial<Job>) => {
    const newJobs = jobs.map(j => j.id === id ? { ...j, ...updates } : j);
    saveToCloud(newJobs, users);
  };

  const handleDeleteJob = (id: string) => {
    if (confirm("Apakah anda yakin ingin menghapus data ini?")) {
      const newJobs = jobs.filter(j => j.id !== id);
      saveToCloud(newJobs, users);
    }
  };

  const handleBulkAdd = (addedJobs: Job[]) => {
    const newJobs = [...addedJobs, ...jobs];
    saveToCloud(newJobs, users);
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
    return <Login onLogin={handleLogin} users={users} />;
  }

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

      {!activeCategory ? (
        <DashboardSummary 
            jobs={visibleJobs} 
            onBulkAddJobs={handleBulkAdd}
            onUpdateJob={handleUpdateJob}
            isLoading={isLoading}
            isSaving={isSaving}
            lastUpdated={lastUpdated}
            connectionError={connectionError}
        />
      ) : (
        activeSubCategory && (
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
        )
      )}
    </Layout>
  );
}

export default App;