import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Search, MapPin, User, CheckCircle, Clock, XCircle, Phone, Edit, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VisitsTab({ role = 'ADMIN' }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [editFormData, setEditFormData] = useState({ visitDate: '', status: '' });

  useEffect(() => {
    fetchVisits();
  }, [role]);

  const fetchVisits = async () => {
    setLoading(true);
    try {
      const endpoint = role === 'ADMIN' ? '/admin/visits' : '/manager/visits';
      const res = await api.get(endpoint);
      setVisits(res.data);
    } catch (err) {
      console.error("Failed to fetch visits", err);
    } finally {
      setLoading(false);
    }
  };

  const updateVisitStatus = async (visitId, newStatus) => {
    try {
      const endpoint = role === 'ADMIN' ? `/admin/visits/${visitId}/status` : `/manager/visits/${visitId}/status`;
      await api.put(endpoint, { status: newStatus });
      toast.success('Visit status updated');
      fetchVisits();
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (visit) => {
    setEditingVisit(visit);
    // Format date for datetime-local input: YYYY-MM-DDTHH:mm
    const d = new Date(visit.visitDate);
    // Adjust for timezone offset
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d - tzOffset)).toISOString().slice(0, 16);
    
    setEditFormData({
      visitDate: localISOTime,
      status: visit.status
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = role === 'ADMIN' ? `/admin/visits/${editingVisit.id}` : `/manager/visits/${editingVisit.id}`;
      // convert back to ISO string if needed, but backend expects LocalDateTime parsable string
      // The browser's datetime-local gives YYYY-MM-DDTHH:mm, which Java LocalDateTime.parse() accepts natively!
      await api.put(endpoint, { 
        visitDate: editFormData.visitDate,
        status: editFormData.status
      });
      toast.success('Visit rescheduled successfully');
      setShowEditModal(false);
      fetchVisits();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SCHEDULED': return <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center w-fit"><Clock size={12} className="mr-1"/> Scheduled</span>;
      case 'COMPLETED': return <span className="bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center w-fit"><CheckCircle size={12} className="mr-1"/> Completed</span>;
      case 'CANCELLED': return <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center w-fit"><XCircle size={12} className="mr-1"/> Cancelled</span>;
      default: return null;
    }
  };

  const filteredVisits = visits.filter(visit => {
    const opp = visit.opportunity;
    const matchesSearch = 
      opp?.lead?.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp?.property?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp?.agent?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter ? visit.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="text-gray-500 py-8">Loading visits...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-900 flex items-center"><Calendar className="mr-2 text-primary-600"/> Visit Schedules</h2>
        
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
            <input 
              type="text" 
              placeholder="Search customer, property, or agent..." 
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full md:w-64 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <th className="py-3 px-6 font-medium">Date & Time</th>
              <th className="py-3 px-6 font-medium">Customer</th>
              <th className="py-3 px-6 font-medium">Property</th>
              <th className="py-3 px-6 font-medium">Agent</th>
              <th className="py-3 px-6 font-medium">Status</th>
              <th className="py-3 px-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredVisits.map((visit) => {
              const opp = visit.opportunity;
              return (
                <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-gray-900">{new Date(visit.visitDate).toLocaleDateString()}</div>
                    <div className="text-sm text-gray-500">{new Date(visit.visitDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-gray-900 flex items-center"><User size={14} className="mr-1 text-gray-400"/> {opp?.lead?.customer?.name}</div>
                    <div className="text-sm text-gray-500 flex items-center mt-1"><Phone size={12} className="mr-1 text-gray-400"/> {opp?.lead?.customer?.phone}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900 flex items-center"><MapPin size={14} className="mr-1 text-gray-400"/> {opp?.property?.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{opp?.property?.region?.name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm font-medium text-gray-900">{opp?.agent?.name || 'Unassigned'}</div>
                  </td>
                  <td className="py-4 px-6">
                    {getStatusBadge(visit.status)}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    {role === 'ADMIN' && visit.status !== 'CANCELLED' && visit.status !== 'COMPLETED' && (
                      <button 
                        onClick={() => openEditModal(visit)}
                        className="text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded transition-colors inline-flex items-center"
                      >
                        <Edit size={12} className="mr-1" /> Edit
                      </button>
                    )}
                    {visit.status === 'SCHEDULED' && (
                      <>
                        <button 
                          onClick={() => updateVisitStatus(visit.id, 'COMPLETED')}
                          className="text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded transition-colors"
                        >
                          Complete
                        </button>
                        <button 
                          onClick={() => updateVisitStatus(visit.id, 'CANCELLED')}
                          className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredVisits.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-12 text-gray-500">
                  <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p>No visits found matching your criteria.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Visit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Reschedule Visit</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visit Date & Time</label>
                  <input 
                    type="datetime-local" 
                    required
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"
                    value={editFormData.visitDate}
                    onChange={e => setEditFormData({...editFormData, visitDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-500"
                    value={editFormData.status}
                    onChange={e => setEditFormData({...editFormData, status: e.target.value})}
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
