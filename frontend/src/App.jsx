import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

// Pages
import PublicHome from './pages/Public/PublicHome';
import AdminDashboard from './pages/Admin/AdminDashboard';

import ManagerDashboard from './pages/Manager/ManagerDashboard';
import AgentDashboard from './pages/Agent/AgentDashboard';
import Login from './pages/Auth/Login';
import Layout from './layouts/Layout';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />

          
          <Route element={<Layout />}>
            <Route 
              path="/admin/*" 
              element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} 
            />
            <Route 
              path="/manager/*" 
              element={<ProtectedRoute allowedRoles={['MANAGER']}><ManagerDashboard /></ProtectedRoute>} 
            />
            <Route 
              path="/agent/*" 
              element={<ProtectedRoute allowedRoles={['AGENT']}><AgentDashboard /></ProtectedRoute>} 
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
