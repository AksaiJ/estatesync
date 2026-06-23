import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import AnalyticsTab from './AnalyticsTab';
import PropertiesTab from './PropertiesTab';
import EmployeesTab from './EmployeesTab';
import CustomersTab from './CustomersTab';
import RegionsTab from './RegionsTab';
import LeadsTab from './LeadsTab';
import OpportunitiesTab from './OpportunitiesTab';
import VisitsTab from '../../components/VisitsTab';
import ReportsTab from './ReportsTab';
import GlobalSearch from '../../components/GlobalSearch';
import { Building2, Users, Briefcase, Map, ClipboardList, PieChart, Calendar, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('regions');

  // Default redirect if strictly /admin
  if (location.pathname === '/admin' || location.pathname === '/admin/') {
    return <Navigate to="/admin/analytics" replace />;
  }

  const isAnalytics = location.pathname.includes('/analytics');
  const isReports = location.pathname.includes('/reports');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
        {!isAnalytics && !isReports && <GlobalSearch />}
      </div>

      {isAnalytics ? (
        <div className="mt-6">
          <AnalyticsTab />
        </div>
      ) : isReports ? (
        <div className="mt-6">
          <ReportsTab />
        </div>
      ) : (
        <>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('regions')}
                className={`${activeTab === 'regions' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Map className="mr-2" size={18} /> Regions
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`${activeTab === 'properties' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Building2 className="mr-2" size={18} /> Properties
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`${activeTab === 'employees' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Briefcase className="mr-2" size={18} /> Employees
              </button>
              <button
                onClick={() => setActiveTab('customers')}
                className={`${activeTab === 'customers' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Users className="mr-2" size={18} /> Customers
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`${activeTab === 'leads' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <ClipboardList className="mr-2" size={18} /> Leads
              </button>
              <button
                onClick={() => setActiveTab('opportunities')}
                className={`${activeTab === 'opportunities' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <ClipboardList className="mr-2" size={18} /> Opportunities
              </button>
              <button
                onClick={() => setActiveTab('visits')}
                className={`${activeTab === 'visits' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Calendar className="mr-2" size={18} /> Visits
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === 'regions' && <RegionsTab />}
            {activeTab === 'properties' && <PropertiesTab />}
            {activeTab === 'employees' && <EmployeesTab />}
            {activeTab === 'customers' && <CustomersTab />}
            {activeTab === 'leads' && <LeadsTab />}
            {activeTab === 'opportunities' && <OpportunitiesTab />}
            {activeTab === 'visits' && <VisitsTab role="ADMIN" />}
          </div>
        </>
      )}
    </div>
  );
}
