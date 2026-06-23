import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Users, Calendar, Settings, Activity, FileText } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    switch (user?.role) {
      case 'MANAGER':
        return [
          { label: 'Leads & Assignments', path: '/manager/leads', icon: <Users size={20} /> },
          { label: 'Visit Schedules', path: '/manager/visits', icon: <Calendar size={20} /> },
          { label: 'Agent Authorizations', path: '/manager/authorizations', icon: <Users size={20} /> }
        ];
      case 'AGENT':
        return [
          { label: 'Dashboard', path: '/agent', icon: <LayoutDashboard size={20} /> }
        ];
      case 'ADMIN':
        return [
          { label: 'Analytics', path: '/admin/analytics', icon: <Activity size={20} /> },
          { label: 'Manage System', path: '/admin/manage', icon: <Settings size={20} /> },
          { label: 'Reports', path: '/admin/reports', icon: <FileText size={20} /> }
        ];
      default:
        return [];
    }
  };

  const links = getNavLinks();

  return (
    <div className="h-screen overflow-hidden bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-dark-800 text-white flex flex-col h-full overflow-y-auto">
        <div className="p-6 text-2xl font-bold border-b border-gray-700 text-primary-500">
          EstateSync
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => {
            const isManagerDefault = user?.role === 'MANAGER' && location.pathname === '/manager' && link.path === '/manager/leads';
            const isActive = location.pathname.includes(link.path) || isManagerDefault;
            return (
              <Link 
                key={link.path}
                to={link.path} 
                className={`flex items-center space-x-3 p-3 rounded-lg transition ${isActive ? 'bg-primary-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="mb-4 px-3 text-sm text-gray-400">
            Logged in as:<br/>
            <strong className="text-white">{user?.name}</strong><br/>
            ({user?.role})
          </div>
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center justify-center w-full space-x-2 text-gray-300 hover:bg-gray-700 p-2 rounded-lg transition mb-2"
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center justify-center w-full space-x-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white p-2 rounded-lg transition"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm h-16 flex items-center px-8">
          <h1 className="text-xl font-semibold text-gray-800">
            {user?.role === 'ADMIN' ? 'Admin Portal' : 
             user?.role === 'MANAGER' ? 'Manager Portal' : 'Agent Portal'}
          </h1>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200 text-gray-800">
            <h3 className="text-xl font-bold mb-3">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 font-medium rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition shadow"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
