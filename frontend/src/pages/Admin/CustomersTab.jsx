import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Edit, Trash2, Plus } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

export default function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', preferredLocation: '', propertyType: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/admin/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error("Failed to fetch customers", err);
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
    showConfirm("Confirm Save", "Are you sure you want to save this customer?", async () => {
      try {
        if (editingId) {
          await api.put(`/admin/customers/${editingId}`, formData);
        } else {
          await api.post('/admin/customers', formData);
        }
        setShowModal(false);
        fetchCustomers();
      } catch (err) {
        showAlert("Error", "Save failed");
      }
    });
  };

  const handleDelete = (id) => {
    showConfirm("Confirm Delete", "Are you sure you want to delete this customer?", async () => {
      try {
        await api.delete(`/admin/customers/${id}`);
        fetchCustomers();
      } catch (err) {
        showAlert("Error", "Failed to delete customer. They might have active leads.");
      }
    });
  };

  const handleGeneratePassword = (id) => {
    showConfirm("Generate Password", "Generate a new password and email it to this customer?", async () => {
      try {
        await api.post(`/admin/customers/${id}/reset-password`);
        showAlert("Success", "New password generated and emailed successfully.");
      } catch (err) {
        showAlert("Error", "Failed to generate password.");
      }
    });
  };

  const openModal = (customer = null) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({...customer, password: ''});
    } else {
      setEditingId(null);
      setFormData({ name: '', email: '', phone: '', preferredLocation: '', propertyType: '', password: '' });
    }
    setShowModal(true);
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm)));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50 space-y-4 sm:space-y-0">
        <h2 className="text-xl font-bold text-gray-900">Manage Customers</h2>
        <div className="flex items-center space-x-4 w-full sm:w-auto">
          <input 
            type="text" 
            placeholder="Search customers..." 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500 w-full sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={() => openModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition whitespace-nowrap">
            <Plus size={16} className="mr-2" /> Add Customer
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Preferences</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr> : 
             filteredCustomers.map(c => (
              <tr key={c.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {c.email}<br/><span className="text-xs text-gray-400">{c.phone}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {c.preferredLocation} - {c.propertyType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {c.isEmailVerified ? <span className="text-green-600 font-bold">Yes</span> : <span className="text-gray-400">No</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button onClick={() => openModal(c)} className="text-blue-600 hover:text-blue-900"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Customer' : 'Add Customer'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input type="text" placeholder="Full Name" required className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="flex space-x-4">
                <input type="email" placeholder="Email Address" required className="w-full border rounded p-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input type="tel" placeholder="Phone Number" required className="w-full border rounded p-2" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <input type="text" placeholder="Preferred Location" className="w-full border rounded p-2" value={formData.preferredLocation || ''} onChange={e => setFormData({...formData, preferredLocation: e.target.value})} />
              <input type="text" placeholder="Property Type (e.g. Villa)" className="w-full border rounded p-2" value={formData.propertyType || ''} onChange={e => setFormData({...formData, propertyType: e.target.value})} />
              
              <div className="pt-4 border-t mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Set Password Manually (Optional)</label>
                <input type="text" placeholder="Leave blank to keep existing password" className="w-full border rounded p-2" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
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
