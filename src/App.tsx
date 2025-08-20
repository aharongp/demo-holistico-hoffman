import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout/Layout';
import { LoginForm } from './components/Auth/LoginForm';

// Dashboard Components
import { AdminDashboard } from './pages/Dashboard/AdminDashboard';
import { TherapistDashboard } from './pages/Dashboard/TherapistDashboard';
import { PatientDashboard } from './pages/Dashboard/PatientDashboard';

// Page Components
import { UserManagement } from './pages/Users/UserManagement';
import { PatientManagement } from './pages/Patients/PatientManagement';
import { InstrumentManagement } from './pages/Instruments/InstrumentManagement';
import { ProgramManagement } from './pages/Programs/ProgramManagement';
import { PatientActivities } from './pages/Activities/PatientActivities';
import { EvolutionTracking } from './pages/Evolution/EvolutionTracking';
import { ReportsManagement } from './pages/Reports/ReportsManagement';
import { MedicalHistory } from './pages/MedicalHistory/MedicalHistory';

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  // Route to appropriate dashboard based on user role
  if (user.role === 'administrator') {
    return <AdminDashboard />;
  }

  if (['trainer', 'therapist', 'doctor', 'coach'].includes(user.role)) {
    return <TherapistDashboard />;
  }

  if (['patient', 'student'].includes(user.role)) {
    return <PatientDashboard />;
  }

  return <AdminDashboard />;
};

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<Layout><DashboardRouter /></Layout>} />
      <Route path="/users" element={<Layout><UserManagement /></Layout>} />
      <Route path="/patients" element={<Layout><PatientManagement /></Layout>} />
      <Route path="/instruments" element={<Layout><InstrumentManagement /></Layout>} />
      <Route path="/programs" element={<Layout><ProgramManagement /></Layout>} />
      <Route path="/activities" element={<Layout><PatientActivities /></Layout>} />
      <Route path="/evolution" element={<Layout><EvolutionTracking /></Layout>} />
      <Route path="/reports" element={<Layout><ReportsManagement /></Layout>} />
      <Route path="/medical-history" element={<Layout><MedicalHistory /></Layout>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <AppContent />
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;