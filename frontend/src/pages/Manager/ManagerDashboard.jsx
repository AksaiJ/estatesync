import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { Users, CheckCircle, Search, Filter, Activity, TrendingUp, History, Plus, X, ChevronDown, ChevronRight, Building, Calendar } from 'lucide-react';
import VisitsTab from '../../components/VisitsTab';
import OpportunityWorkspaceModal from '../Agent/OpportunityWorkspaceModal';
import AgentAuthorizations from './AgentAuthorizations';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';

export default function ManagerDashboard() {
  const [leads, setLeads] = useState([]);
  const [agents, setAgents] = useState([]);
  const [kpis, setKpis] = useState({
    totalOpps: 0,
    unassignedOpps: 0,
    closedOpps: 0,
    conversionRate: 0,
    agentPerformance: []
  });
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const activeTab = location.pathname.includes('/manager/visits') ? 'visits' : 
                    location.pathname.includes('/manager/authorizations') ? 'authorizations' : 'leads';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Expanded rows
  const [expandedLeads, setExpandedLeads] = useState(new Set());

  // Workspace Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedOppForHistory, setSelectedOppForHistory] = useState(null);

  useEffect(() => {
    fetchConstants();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchQuery, statusFilter]);

  const fetchConstants = async () => {
    try {
      const [agentsRes, kpisRes] = await Promise.all([
        api.get('/manager/agents'),
        api.get('/manager/kpis')
      ]);
      setAgents(agentsRes.data);
      setKpis(kpisRes.data);
    } catch (err) {
      console.error("Failed to fetch constants", err);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage, size: 10 });
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);

      const leadsRes = await api.get(`/manager/leads?${params.toString()}`);
      setLeads(leadsRes.data.content || (Array.isArray(leadsRes.data) ? leadsRes.data : []));
      setTotalPages(leadsRes.data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch leads data", err);
    } finally {
      setLoading(false);
    }
  };

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });

  const showAlert = (title, message) => {
    setConfirmConfig({ isOpen: true, title, message, type: 'alert', onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false })) });
  };

  const assignAgent = async (opportunityId, agentId) => {
    if (!agentId) return;
    try {
      await api.post('/manager/assign-lead', { opportunityId, agentId: Number(agentId) });
      fetchLeads();
      // Re-fetch KPIs to reflect assignment changes
      api.get('/manager/kpis').then(res => setKpis(res.data)).catch(console.error);
    } catch (err) {
      showAlert("Error", "Failed to assign agent: " + (err.response?.data || err.message));
    }
  };

  const openHistory = (oppId) => {
    const lead = leads.find(l => l.opportunities?.some(o => o.id === oppId));
    if (lead) {
      const opp = lead.opportunities.find(o => o.id === oppId);
      setSelectedOppForHistory({ ...opp, lead });
      setShowHistoryModal(true);
    }
  };

  const toggleExpand = (leadId) => {
    const newExpanded = new Set(expandedLeads);
    if (newExpanded.has(leadId)) newExpanded.delete(leadId);
    else newExpanded.add(leadId);
    setExpandedLeads(newExpanded);
  };

  // Backend KPIs
  const { totalOpps, unassignedOpps, conversionRate, agentPerformance } = kpis;

  return (
    <div className="space-y-6">
      {activeTab === 'leads' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Activity size={24}/></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">{totalOpps}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><Users size={24}/></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Unassigned Opps</p>
                <p className="text-2xl font-bold text-gray-900">{unassignedOpps}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={24}/></div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Leads Table (100% width now) */}
        <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center"><Users className="mr-2 text-primary-600"/> Parent Leads</h2>
            <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md font-medium">
              Click any row to expand and assign Opportunities
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input 
                type="text" 
                placeholder="Search by customer name or phone..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-shadow"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
              />
            </div>
            <select 
              className="border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500 transition-shadow bg-white"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
            >
              <option value="">All Lead Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? <p className="text-gray-500 py-4">Loading leads...</p> : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-y border-gray-200">
                    <th className="py-3 px-4 font-medium w-10"></th>
                    <th className="py-3 px-4 font-medium">Customer</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium text-right">Opportunities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => {
                    const isExpanded = expandedLeads.has(lead.id);
                    const opps = lead.opportunities || [];
                    return (
                      <React.Fragment key={lead.id}>
                        <tr className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => toggleExpand(lead.id)}>
                          <td className="py-4 px-4 text-gray-400">
                            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-gray-900">{lead.customer?.name}</div>
                            <div className="text-sm text-gray-500">{lead.customer?.phone} • {lead.customer?.email}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${lead.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`inline-flex items-center text-sm font-semibold px-2.5 py-0.5 rounded-full ${opps.some(o => !o.agent) ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 'text-gray-700 bg-gray-100'}`}>
                              <Building size={14} className="mr-1 text-gray-400" /> {opps.length}
                            </span>
                          </td>
                        </tr>
                        
                        {/* Expanded Opportunities View */}
                        {isExpanded && (
                          <tr className="bg-gray-50/50">
                            <td colSpan="4" className="p-0 border-b border-gray-200">
                              <div className="pl-14 pr-4 py-4 bg-gradient-to-r from-gray-50 to-white shadow-inner border-l-4 border-l-primary-500">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Opportunities Assignment</h4>
                                {opps.length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">No properties assigned to this lead.</p>
                                ) : (
                                  <div className="space-y-3">
                                    {opps.map(opp => (
                                      <div key={opp.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="flex-1">
                                          <div className="font-semibold text-gray-900">{opp.property?.title}</div>
                                          <div className="text-xs text-gray-500 flex gap-2 mt-1">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{opp.property?.type}</span>
                                            <span className="font-medium text-primary-600">${opp.property?.price?.toLocaleString()}</span>
                                          </div>
                                        </div>
                                        
                                        <div className="w-32 mr-4">
                                           <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border 
                                              ${opp.status === 'CLOSED' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                              {opp.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-3 w-64">
                                          <select 
                                            className={`flex-1 border rounded p-1.5 text-sm outline-none shadow-sm ${!opp.agent ? 'border-yellow-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 bg-yellow-50' : 'border-gray-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 bg-white'}`}
                                            onChange={(e) => assignAgent(opp.id, e.target.value)}
                                            value={opp.agent ? opp.agent.id : ""}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <option value="" disabled>Assign Agent...</option>
                                            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                          </select>
                                          
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); openHistory(opp.id); }} 
                                            className="text-gray-400 hover:text-primary-600 p-1.5 rounded hover:bg-primary-50 transition-colors" 
                                            title="View Timeline & Workspace"
                                          >
                                            <History size={18} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-gray-500">No leads found matching your criteria.</td>
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
      </div>
      </>
      )}

      {/* Workspace Modal (Read-Only) */}
      {showHistoryModal && selectedOppForHistory && (
        <OpportunityWorkspaceModal 
          opportunity={selectedOppForHistory} 
          role="MANAGER" 
          onClose={() => { setShowHistoryModal(false); setSelectedOppForHistory(null); }} 
        />
      )}

      {activeTab === 'visits' && (
        <VisitsTab role="MANAGER" />
      )}
      {activeTab === 'authorizations' && (
        <AgentAuthorizations />
      )}

      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
