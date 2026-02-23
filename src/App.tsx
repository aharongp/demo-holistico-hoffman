import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout/Layout';
import { LoginForm } from './components/Auth/LoginForm';
import { SignupForm } from './components/Auth/SignupForm';

// Dashboard Components
import { AdminDashboard } from './pages/Dashboard/AdminDashboard';
import { TherapistDashboard } from './pages/Dashboard/TherapistDashboard';
import { PatientDashboard } from './pages/Dashboard/PatientDashboard';

// Page Components
import { UserManagement } from './pages/Users/UserManagement';
import { PatientManagement } from './pages/Patients/PatientManagement';
import { PatientDetail } from './pages/Patients/PatientDetail';
import { PatientPunctuality } from './pages/Patients/PatientPunctuality';
import { InstrumentManagement } from './pages/Instruments/InstrumentManagement';
import { InstrumentDetail } from './pages/Instruments/InstrumentDetail';
import { ProgramManagement } from './pages/Programs/ProgramManagement';
import { ProgramDetail } from './pages/Programs/ProgramDetail';
import { PatientActivities } from './pages/Activities/PatientActivities';
import { EvolutionTracking } from './pages/Evolution/EvolutionTracking';
import { ReportsManagement } from './pages/Reports/ReportsManagement';
import { MedicalHistory } from './pages/MedicalHistory/MedicalHistory';
import { ConsultationDetail } from './pages/MedicalHistory/ConsultationDetail';
import { UserProfile } from './pages/Profile/UserProfile';
import { InstrumentResults } from './pages/Results/InstrumentResults';

const DashboardRouter: React.FC = () => {
  const { user, getDashboardPath } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPath(user.role)} replace />;
};

const AppContent: React.FC = () => {
  const { user, isLoading, getDashboardPath } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<Layout><DashboardRouter /></Layout>} />
      <Route path="/dashboard/admin" element={<Layout><AdminDashboard /></Layout>} />
      <Route path="/dashboard/doctor" element={<Layout><TherapistDashboard /></Layout>} />
      <Route path="/dashboard/patient" element={<Layout><PatientDashboard /></Layout>} />
      <Route path="/users" element={<Layout><UserManagement /></Layout>} />
      <Route path="/patients" element={<Layout><PatientManagement /></Layout>} />
      <Route path="/punctuality" element={<Layout><PatientPunctuality /></Layout>} />
      <Route path="/patients/:patientId" element={<Layout><PatientDetail /></Layout>} />
      <Route path="/instruments" element={<Layout><InstrumentManagement /></Layout>} />
      <Route path="/instruments/:instrumentId" element={<Layout><InstrumentDetail /></Layout>} />
      <Route path="/programs" element={<Layout><ProgramManagement /></Layout>} />
      <Route path="/programs/:programId" element={<Layout><ProgramDetail /></Layout>} />
      <Route path="/activities" element={<Layout><PatientActivities /></Layout>} />
      <Route path="/evolution" element={<Layout><EvolutionTracking /></Layout>} />
      <Route path="/reports" element={<Layout><ReportsManagement /></Layout>} />
      <Route path="/results" element={<Layout><InstrumentResults /></Layout>} />
      <Route path="/medical-history" element={<Layout><MedicalHistory /></Layout>} />
      <Route
        path="/medical-history/consultations/:consultationId"
        element={<Layout><ConsultationDetail /></Layout>}
      />
      <Route path="/profile" element={<Layout><UserProfile /></Layout>} />
      <Route path="/" element={<Navigate to={getDashboardPath(user.role)} replace />} />
      <Route path="*" element={<Navigate to={getDashboardPath(user.role)} replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <AppContent />
          <Analytics />
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;