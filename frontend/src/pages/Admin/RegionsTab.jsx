import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Edit, Trash2, Plus } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

export default function RegionsTab() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      const res = await api.get('/admin/regions');
      setRegions(res.data);
    } catch (err) {
      console.error("Failed to fetch regions", err);
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
    showConfirm("Confirm Save", "Are you sure you want to save this region?", async () => {
      try {
        if (editingId) {
          await api.put(`/admin/regions/${editingId}`, formData);
        } else {
          await api.post('/admin/regions', formData);
        }
        setShowModal(false);
        fetchRegions();
      } catch (err) {
        showAlert("Error", "Save failed");
      }
    });
  };

  const handleDelete = (id) => {
    showConfirm("Confirm Delete", "Are you sure you want to delete this region?", async () => {
      try {
        await api.delete(`/admin/regions/${id}`);
        fetchRegions();
      } catch (err) {
        showAlert("Error", "Failed to delete region. It might be assigned to properties or users.");
      }
    });
  };

  const openModal = (region = null) => {
    if (region) {
      setEditingId(region.id);
      setFormData({ name: region.name });
    } else {
      setEditingId(null);
      setFormData({ name: '' });
    }
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h2 className="text-xl font-bold text-gray-900">Manage Regions</h2>
        <button onClick={() => openModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition">
          <Plus size={16} className="mr-2" /> Add Region
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region Name</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? <tr><td colSpan="2" className="text-center py-4">Loading...</td></tr> : 
             regions.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button onClick={() => openModal(r)} className="text-blue-600 hover:text-blue-900"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Region' : 'Add Region'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input type="text" placeholder="Region Name (e.g. Mumbai)" required className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
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
