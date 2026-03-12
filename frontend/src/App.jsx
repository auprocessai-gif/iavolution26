import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CourseCatalog from './pages/CourseCatalog';
import CoursePlayer from './pages/CoursePlayer';
import Profile from './pages/Profile';
import UserManagement from './pages/admin/UserManagement';
import EnrollmentManagement from './pages/admin/EnrollmentManagement';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseList from './pages/admin/CourseList';
import CourseCreation from './pages/admin/CourseCreation';
import CourseBuilder from './pages/admin/CourseBuilder';
import Gradebook from './pages/admin/Gradebook';
import Analytics from './pages/admin/Analytics';
import SessionTracker from './components/SessionTracker';

function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <NotificationProvider>
          <Router>
            <SessionTracker />
            <Routes>
              {/* Rutas Públicas */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

              {/* Protected Student Routes */} {/* Changed comment */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/courses" element={<CourseCatalog />} />
                <Route path="/courses/:id" element={<CoursePlayer />} />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Admin/Teacher Protected Routes */}
              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/courses" element={<CourseList />} />
                  <Route path="/admin/courses/new" element={<CourseCreation />} />
                  <Route path="/admin/courses/:id" element={<CourseBuilder />} />
                  <Route path="/admin/grades" element={<Gradebook />} />
                  <Route path="/admin/analytics" element={<Analytics />} />
                  <Route path="/admin/users" element={<UserManagement />} />
                  <Route path="/admin/enrollments" element={<EnrollmentManagement />} />
                </Route>
              </Route>

              {/* Redirección por defecto */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </ModalProvider>
    </AuthProvider>
  );
}

export default App;
