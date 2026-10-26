import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Public & Shared Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import EvidenceExplorer from './pages/EvidenceExplorer';
import KnowledgeGraph from './pages/KnowledgeGraph';
import About from './pages/About';

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorMedicationSafety from './pages/doctor/DoctorMedicationSafety';
import DoctorResults from './pages/doctor/DoctorResults';

// Researcher Pages
import ResearcherDashboard from './pages/researcher/ResearcherDashboard';
import ResearcherDrugRepurposing from './pages/researcher/ResearcherDrugRepurposing';
import ResearcherResults from './pages/researcher/ResearcherResults';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import PatientMedicationSafety from './pages/patient/PatientMedicationSafety';
import PatientResults from './pages/patient/PatientResults';

function AppContent() {
  const location = useLocation();
  // Hide global navbar on landing and auth pages for a clean, minimal look
  const hideNavbar = ['/', '/login', '/register', '/forgot-password'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface-ground)] text-[var(--color-text-primary)] font-sans antialiased">
      {!hideNavbar && <Navbar />}
      <div className="flex-1 flex flex-col">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/evidence" element={<EvidenceExplorer />} />
          <Route path="/knowledge-graph" element={<KnowledgeGraph />} />
          <Route path="/about" element={<About />} />

          {/* Doctor Protected Routes */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DashboardLayout role="doctor" />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/doctor/dashboard" replace />} />
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="medication-safety" element={<DoctorMedicationSafety />} />
            <Route path="results" element={<DoctorResults />} />
          </Route>

          {/* Researcher Protected Routes */}
          <Route
            path="/researcher"
            element={
              <ProtectedRoute allowedRoles={['researcher']}>
                <DashboardLayout role="researcher" />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/researcher/dashboard" replace />} />
            <Route path="dashboard" element={<ResearcherDashboard />} />
            <Route path="drug-repurposing" element={<ResearcherDrugRepurposing />} />
            <Route path="results" element={<ResearcherResults />} />
          </Route>

          {/* Patient Protected Routes */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <DashboardLayout role="patient" />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/patient/dashboard" replace />} />
            <Route path="dashboard" element={<PatientDashboard />} />
            <Route path="medication-safety" element={<PatientMedicationSafety />} />
            <Route path="results" element={<PatientResults />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
