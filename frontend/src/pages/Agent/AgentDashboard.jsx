import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Phone, MapPin, Building, Calendar, MoreVertical, MessageSquare, Clock, Search } from 'lucide-react';
import OpportunityWorkspaceModal from './OpportunityWorkspaceModal';
import Pagination from '../../components/Pagination';
import { useLocation } from 'react-router-dom';
import VisitsTab from '../../components/VisitsTab';

export default function AgentDashboard() {
  const location = useLocation();
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('updatedAt,desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOpportunities();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery, statusFilter, sortOrder]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage, size: 10, sort: sortOrder });
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/agent/opportunities?${params.toString()}`);
      setOpportunities(res.data.content || (Array.isArray(res.data) ? res.data : []));
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch opportunities", err);
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

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6">
      {location.pathname.includes('/agent/visits') ? (
        <VisitsTab role="AGENT" />
      ) : (
        <>
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Leads</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and track your assigned properties</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="Search leads or properties..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow text-sm"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
              />
            </div>
            <select 
              className="py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-gray-700 bg-white"
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
            </select>
            <select 
              className="py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-gray-700 bg-white"
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setCurrentPage(0); }}
            >
              <option value="updatedAt,desc">Recently Updated</option>
              <option value="createdAt,desc">Newest First</option>
              <option value="createdAt,asc">Oldest First</option>
            </select>
          </div>
        </div>

      <div className="flex-1 overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading your leads...</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm border-b border-gray-200">
                <tr className="text-gray-500 text-xs uppercase tracking-wider">
                  <th className="py-4 px-6 font-medium">Customer</th>
                  <th className="py-4 px-6 font-medium">Property Interest</th>
                  <th className="py-4 px-6 font-medium">Status</th>
                  <th className="py-4 px-6 font-medium">Added On</th>
                  <th className="py-4 px-6 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {opportunities.map(opp => (
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
                      {opp.lead?.referredFrom && <div className="text-[10px] text-gray-400 mt-1 font-medium">from {opp.lead.referredFrom}</div>}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{opp.property?.title}</h3>
                      </div>
                      <p className="text-primary-600 font-bold mb-3">₹{opp.property?.price?.toLocaleString()}</p>
                      <div className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1">
                        {opp.property?.type || 'Property'}
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
                    <td className="py-4 px-6 text-right">
                      <button className="text-primary-600 font-medium hover:text-primary-800 flex items-center justify-end w-full group-hover:underline">
                        <MessageSquare size={16} className="mr-2" /> Workspace
                      </button>
                    </td>
                  </tr>
                ))}
                {opportunities.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center">
                        <Building size={48} className="text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-600">No leads found</p>
                        <p className="text-sm">You haven't been assigned any leads yet, or none match your search.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 mt-auto">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {selectedOpp && (
        <OpportunityWorkspaceModal 
          opportunity={selectedOpp} 
          onClose={() => setSelectedOpp(null)}
          onActivityLogged={async () => {
            await fetchOpportunities();
            // Refetch current page and find the updated opp to update the modal
            try {
              const params = new URLSearchParams({ page: currentPage, size: 10, sort: sortOrder });
              if (searchQuery) params.append('search', searchQuery);
              if (statusFilter) params.append('status', statusFilter);
              const res = await api.get(`/agent/opportunities?${params.toString()}`);
              const rawData = res.data.content || (Array.isArray(res.data) ? res.data : []);
              const updatedOpp = rawData.find(o => o.id === selectedOpp.id);
              if (updatedOpp) {
                setSelectedOpp(updatedOpp);
              }
            } catch (e) {
              console.error(e);
            }
          }}
        />
      )}
      </>
      )}
    </div>
  );
}
