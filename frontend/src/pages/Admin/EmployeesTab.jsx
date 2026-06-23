import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Edit, UserX, Plus } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function EmployeesTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'AGENT', passwordHash: '', isActive: true, region: null });
  const [regions, setRegions] = useState([]);

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, roleFilter, regionFilter, statusFilter]);

  const fetchRegions = async () => {
    try {
      const res = await api.get('/admin/regions');
      setRegions(res.data);
    } catch (err) {
      console.error("Failed to fetch regions", err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage, size: 10 });
      if (roleFilter) params.append('role', roleFilter);
      if (regionFilter) params.append('regionId', regionFilter);
      if (statusFilter !== '') params.append('isActive', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await api.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.content || (Array.isArray(res.data) ? res.data : []));
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', type: 'confirm', onConfirm: null });

  const showAlert = (title, message) => {
    setConfirmConfig({ isOpen: true, title, message, type: 'alert', onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false })) });
  };

  const showConfirm = (title, message, onConfirmCallback) => {
    setConfirmConfig({
      isOpen: true, title, message, type: 'confirm',
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        onConfirmCallback();
      }
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    showConfirm("Confirm Save", "Are you sure you want to save this employee?", async () => {
      try {
        if (editingId) {
          await api.put(`/admin/users/${editingId}`, formData);
        } else {
          await api.post('/admin/users', formData);
        }
        setShowModal(false);
        fetchUsers();
      } catch (err) {
        showAlert("Error", "Save failed");
      }
    });
  };

  const handleDeactivate = (id) => {
    showConfirm("Confirm Deactivate", "Are you sure you want to deactivate this employee?", async () => {
      try {
        await api.delete(`/admin/users/${id}`);
        fetchUsers();
      } catch (err) {
        showAlert("Error", "Failed to deactivate. Employee might have active leads.");
      }
    });
  };

  const handleGeneratePassword = (id) => {
    showConfirm("Generate Password", "Generate a new password and email it to this employee?", async () => {
      try {
        await api.post(`/admin/users/${id}/reset-password`);
        showAlert("Success", "New password generated and emailed successfully.");
      } catch (err) {
        showAlert("Error", "Failed to generate password.");
      }
    });
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({...user, passwordHash: ''});
    } else {
      setEditingId(null);
      setFormData({ name: '', email: '', role: 'AGENT', passwordHash: '', isActive: true, region: null });
    }
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 space-y-4 md:space-y-0">
        <h2 className="text-xl font-bold text-gray-900">Manage Employees</h2>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search name/email..." 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500 w-full sm:w-48"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
          />
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Roles</option>
            <option value="AGENT">Agent</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500"
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Regions</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button onClick={() => openModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition whitespace-nowrap">
            <Plus size={16} className="mr-2" /> Add Employee
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr> : 
             users.length === 0 ? <tr><td colSpan="5" className="text-center py-4">No employees found.</td></tr> :
             users.map(u => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {u.name}<br/><span className="text-xs text-gray-400 font-normal">{u.region?.name || ''}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : u.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button onClick={() => openModal(u)} className="text-blue-600 hover:text-blue-900"><Edit size={16}/></button>
                  {u.role !== 'ADMIN' && u.isActive && (
                    <button onClick={() => handleDeactivate(u.id)} className="text-red-600 hover:text-red-900" title="Deactivate"><UserX size={16}/></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 border-t border-gray-100">
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input type="text" placeholder="Full Name" required className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="email" placeholder="Email Address" required className="w-full border rounded p-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <div className="flex space-x-4">
                <select className="w-full border rounded p-2" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                  <option value="AGENT">Agent</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                {formData.role !== 'ADMIN' && (
                  <select className="w-full border rounded p-2" value={formData.region?.id || ''} onChange={e => setFormData({...formData, region: { id: e.target.value }})}>
                    <option value="">Select Region</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
              </div>

              <div className="pt-4 border-t mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingId ? "Set Password Manually (Optional)" : "Set Password Manually"}
                </label>
                <input type="text" placeholder={editingId ? "Leave blank to keep existing password" : "Enter initial password"} required={!editingId} className="w-full border rounded p-2" value={formData.passwordHash} onChange={e => setFormData({...formData, passwordHash: e.target.value})} />
                {editingId && (
                  <button type="button" onClick={() => handleGeneratePassword(editingId)} className="mt-3 w-full bg-blue-50 text-blue-600 font-medium py-2 rounded border border-blue-100 hover:bg-blue-100 transition">
                    Generate & Email New Password
                  </button>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
