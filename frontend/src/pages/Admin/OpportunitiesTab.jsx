import React, { useState, useEffect } from 'react';
import { Target, Search, Filter, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import { Phone, MapPin, Building, Calendar, MessageSquare, Clock, User } from 'lucide-react';
import OpportunityWorkspaceModal from '../Agent/OpportunityWorkspaceModal';
import Pagination from '../../components/Pagination';

export default function OpportunitiesTab() {
  const [opportunities, setOpportunities] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [editOpp, setEditOpp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });

  const showAlert = (title, message) => {
    setConfirmConfig({ isOpen: true, title, message, type: 'alert', onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false })) });
  };

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery, statusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage, size: 10 });
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const [oppsRes, usersRes] = await Promise.all([
        api.get(`/admin/opportunities?${params.toString()}`),
        api.get('/admin/users?size=1000')
      ]);
      
      const rawOpps = oppsRes.data.content || (Array.isArray(oppsRes.data) ? oppsRes.data : []);
      setOpportunities(rawOpps);
      setTotalPages(oppsRes.data.totalPages || 1);

      const allUsers = usersRes.data.content || (Array.isArray(usersRes.data) ? usersRes.data : []);
      setAgents(allUsers.filter(u => u.role === 'AGENT'));
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-800';
      case 'CONTACTED': return 'bg-purple-100 text-purple-800';
      case 'VISIT_SCHEDULED': return 'bg-yellow-100 text-yellow-800';
      case 'VISIT_COMPLETED': return 'bg-indigo-100 text-indigo-800';
      case 'PROPOSAL_SENT': return 'bg-orange-100 text-orange-800';
      case 'IN_NEGOTIATION': return 'bg-pink-100 text-pink-800';
      case 'CLOSED_WON': return 'bg-green-100 text-green-800';
      case 'CLOSED_LOST': return 'bg-red-100 text-red-800';
      case 'UNRESPONSIVE': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOpps = opportunities;

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading opportunities...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Opportunities Directory</h2>
          <p className="text-gray-500 text-sm mt-1">View and edit all opportunities globally.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
            <input 
              type="text" 
              placeholder="Search by customer, property, or agent..." 
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
            />
          </div>
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="VISIT_SCHEDULED">Visit Scheduled</option>
            <option value="VISIT_COMPLETED">Visit Completed</option>
            <option value="PROPOSAL_SENT">Proposal Sent</option>
            <option value="IN_NEGOTIATION">In Negotiation</option>
            <option value="CLOSED_WON">Closed Won</option>
            <option value="CLOSED_LOST">Closed Lost</option>
            <option value="UNRESPONSIVE">Unresponsive</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm border-b border-gray-200">
              <tr className="text-gray-500 text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Customer</th>
                <th className="py-4 px-6 font-medium">Property Interest</th>
                <th className="py-4 px-6 font-medium">Agent</th>
                <th className="py-4 px-6 font-medium">Status</th>
                <th className="py-4 px-6 font-medium">Added On</th>
                <th className="py-4 px-6 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOpps.map(opp => (
                <tr 
                  key={opp.id} 
                  className="hover:bg-primary-50/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedOpp(opp)}
                >
                  <td className="py-4 px-6">
                    <div className="font-bold text-gray-900">{opp.lead?.customer?.name}</div>
                    <div className="text-sm text-gray-500 flex items-center mt-1">
                      <Phone size={12} className="mr-1" /> {opp.lead?.customer?.phone}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{opp.property?.title}</h3>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{opp.property?.region?.name}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      <User size={14} className="mr-2 text-gray-400" />
                      {opp.agent?.name || <span className="text-gray-400 italic">Unassigned</span>}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${getStatusColor(opp.status)}`}>
                      {opp.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock size={14} className="mr-2 text-gray-400" />
                      {new Date(opp.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right flex justify-end space-x-3">
                    <button 
                      className="text-primary-600 font-medium hover:text-primary-800 flex items-center group-hover:underline"
                      onClick={(e) => { e.stopPropagation(); setEditOpp(opp); }}
                    >
                      <User size={16} className="mr-1" /> Agent
                    </button>
                    <button className="text-primary-600 font-medium hover:text-primary-800 flex items-center group-hover:underline">
                      <MessageSquare size={16} className="mr-1" /> Workspace
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOpps.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center">
                      <Building size={48} className="text-gray-300 mb-4" />
                      <p className="text-lg font-medium text-gray-600">No opportunities found</p>
                      <p className="text-sm">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {selectedOpp && (
        <OpportunityWorkspaceModal 
          opportunity={selectedOpp} 
          role="ADMIN"
          onClose={() => setSelectedOpp(null)}
          onActivityLogged={async () => {
            try {
              await fetchData();
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}

    {editOpp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Edit Opportunity</h3>
              <button onClick={() => setEditOpp(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  value={editOpp.status}
                  onChange={(e) => setEditOpp({...editOpp, status: e.target.value})}
                >
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="VISIT_SCHEDULED">Visit Scheduled</option>
                  <option value="VISIT_COMPLETED">Visit Completed</option>
                  <option value="PROPOSAL_SENT">Proposal Sent</option>
                  <option value="IN_NEGOTIATION">In Negotiation</option>
                  <option value="CLOSED_WON">Closed Won</option>
                  <option value="CLOSED_LOST">Closed Lost</option>
                  <option value="UNRESPONSIVE">Unresponsive</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Assign to Agent</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  value={editOpp.agent?.id || ''}
                  onChange={(e) => setEditOpp({...editOpp, agent: { id: e.target.value }})}
                >
                  <option value="">Unassigned</option>
                  {agents.sort((a, b) => {
                    const aSame = a.region?.id === editOpp.property?.region?.id ? 1 : 0;
                    const bSame = b.region?.id === editOpp.property?.region?.id ? 1 : 0;
                    return bSame - aSame;
                  }).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} {a.region?.id === editOpp.property?.region?.id ? '★ (Same Region)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setEditOpp(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const oppBeforeEdit = opportunities.find(o => o.id === editOpp.id);
                      if (oppBeforeEdit?.agent?.id != editOpp.agent?.id) {
                        await api.put(`/admin/opportunities/${editOpp.id}/agent`, { agentId: editOpp.agent?.id || null });
                      }
                      
                      if (oppBeforeEdit?.status !== editOpp.status) {
                        await api.put(`/admin/opportunities/${editOpp.id}/status/override`, { 
                          status: editOpp.status,
                          reason: "Quick Status Edit by Admin"
                        });
                      }
                      
                      setEditOpp(null);
                      fetchData();
                    } catch(err) {
                      console.error(err);
                      showAlert("Error", "Failed to save changes");
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
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
