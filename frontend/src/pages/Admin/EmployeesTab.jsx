import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Edit, Trash2, Plus, UserX } from 'lucide-react';

export default function EmployeesTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  // Using raw password field, handled by backend BCrypt
  const [formData, setFormData] = useState({ name: '', email: '', role: 'AGENT', passwordHash: '', isActive: true, region: null });
  const [regions, setRegions] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchRegions();
  }, []);

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
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/admin/users/${editingId}`, formData);
      } else {
        await api.post('/admin/users', formData);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      console.error("Save failed", err);
    }
  };

  const handleDeactivate = async (id) => {
    if (window.confirm("Are you sure you want to deactivate this employee?")) {
      try {
        await api.delete(`/admin/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert("Failed to deactivate. Employee might have active leads.");
      }
    }
  };

  const handleGeneratePassword = async (id) => {
    if (window.confirm("Generate a new password and email it to this employee?")) {
      try {
        await api.post(`/admin/users/${id}/reset-password`);
        alert("New password generated and emailed successfully.");
      } catch (err) {
        alert("Failed to generate password.");
      }
    }
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
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900">Manage Employees</h2>
        <button onClick={() => openModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition">
          <Plus size={16} className="mr-2" /> Add Employee
        </button>
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
    </div>
  );
}
