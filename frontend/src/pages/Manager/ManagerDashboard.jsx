import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { Users, CheckCircle, Search, Filter, Activity, TrendingUp, History, Plus, X, ChevronDown, ChevronRight, Building, Calendar } from 'lucide-react';
import VisitsTab from '../../components/VisitsTab';
import OpportunityWorkspaceModal from '../Agent/OpportunityWorkspaceModal';
import AgentAuthorizations from './AgentAuthorizations';
import ManagerPropertiesTab from './ManagerPropertiesTab';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import SearchableSelect from '../../components/SearchableSelect';

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
                    location.pathname.includes('/manager/authorizations') ? 'authorizations' :
                    location.pathname.includes('/manager/properties') ? 'properties' : 'leads';

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

  // Create Lead Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [regions, setRegions] = useState([]);
  const [allSystemProperties, setAllSystemProperties] = useState([]);
  const [createFormData, setCreateFormData] = useState({
    customerName: '', customerPhone: '', customerEmail: '',
    regionId: '', properties: []
  });

  // Add Opportunity Modal
  const [showAddOppModal, setShowAddOppModal] = useState(false);
  const [addOppData, setAddOppData] = useState({ leadId: '', propertyId: '', agentId: '' });

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
      const [agentsRes, kpisRes, regionsRes, propsRes] = await Promise.all([
        api.get('/manager/agents'),
        api.get('/manager/kpis'),
        api.get('/public/regions'),
        api.get('/public/properties?size=1000')
      ]);
      setAgents(agentsRes.data);
      setKpis(kpisRes.data);
      setRegions(regionsRes.data);
      setAllSystemProperties(propsRes.data.content || propsRes.data);
    } catch (err) {
      console.error("Failed to fetch constants", err);
    }
  };

  const handleCreateSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        customer: { name: createFormData.customerName, phone: createFormData.customerPhone, email: createFormData.customerEmail },
        region: createFormData.regionId ? { id: createFormData.regionId } : null,
        interestedProperties: createFormData.properties.map(p => ({ id: p.id }))
      };
      await api.post('/manager/leads', payload);
      setShowCreateModal(false);
      setCreateFormData({ customerName: '', customerPhone: '', customerEmail: '', regionId: '', properties: [] });
      fetchLeads();
      showAlert("Success", "Lead created successfully!");
    } catch (err) {
      showAlert("Error", "Failed to create lead: " + (err.response?.data || err.message));
    }
  };

  const addProperty = (val) => {
    const propId = Number(val);
    const prop = allSystemProperties.find(p => p.id === propId);
    if (prop && !createFormData.properties.find(p => p.id === propId)) {
      setCreateFormData({ ...createFormData, properties: [...createFormData.properties, prop] });
    }
  };

  const removeProperty = (id) => {
    setCreateFormData({ ...createFormData, properties: createFormData.properties.filter(p => p.id !== id) });
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

  const confirmAssignment = (opportunityId, agentId) => {
    if (!agentId) return;
    const agent = agents.find(a => a.id === Number(agentId));
    const agentName = agent ? agent.name : 'this agent';
    
    setConfirmConfig({
      isOpen: true,
      title: 'Confirm Assignment',
      message: `Are you sure you want to assign ${agentName} to this opportunity?`,
      type: 'confirm',
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        assignAgent(opportunityId, agentId);
      }
    });
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
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center"><Users className="mr-2 text-primary-600"/> Parent Leads</h2>
                <div className="text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md font-medium mt-1">
                  Click any row to expand and assign Opportunities
                </div>
              </div>
              <button onClick={() => setShowCreateModal(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition flex items-center whitespace-nowrap">
                <Plus size={16} className="mr-2" /> Add Lead
              </button>
              <button onClick={() => setShowAddOppModal(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition flex items-center whitespace-nowrap ml-3">
                <Plus size={16} className="mr-2" /> Add Opportunity
              </button>
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
                            {lead.referredFrom && <div className="text-[10px] text-gray-400 mt-1 font-medium">from {lead.referredFrom}</div>}
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
                                          <SearchableSelect 
                                            className="flex-1 shadow-sm"
                                            value={opp.agent ? opp.agent.id : ""}
                                            onChange={(val) => confirmAssignment(opp.id, val)}
                                            options={agents.map(a => ({ 
                                                value: a.id, 
                                                label: a.name,
                                                display: (
                                                  <div className="flex items-center w-full">
                                                    <span className="w-10 text-gray-400 text-xs font-mono shrink-0">#{a.id}</span>
                                                    <span className="flex-1 font-medium text-gray-900 truncate px-2">{a.name}</span>
                                                    <span className="text-gray-500 text-xs text-right whitespace-nowrap shrink-0">{a.region?.name || 'No Region'}</span>
                                                  </div>
                                                )
                                              }))}
                                            placeholder="Assign Agent..."
                                          />
                                          
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
          onActivityLogged={() => fetchLeads()}
        />
      )}

      {showAddOppModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-visible flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Add New Opportunity</h3>
              <button onClick={() => setShowAddOppModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <span className="text-2xl leading-none">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-visible flex-1">
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!addOppData.leadId || !addOppData.propertyId) {
                  showAlert("Error", "Please select both a Lead and a Property.");
                  return;
                }
                try {
                  await api.post('/manager/opportunities', addOppData);
                  setShowAddOppModal(false);
                  setAddOppData({ leadId: '', propertyId: '', agentId: '' });
                  fetchLeads();
                } catch(err) {
                  console.error(err);
                  showAlert("Error", "Failed to create opportunity");
                }
              }}>
                <div className="mb-4 relative z-50">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select Lead *</label>
                  <SearchableSelect
                    className="w-full"
                    value={addOppData.leadId}
                    onChange={(val) => setAddOppData({...addOppData, leadId: val})}
                    placeholder="-- Select Lead --"
                    options={leads.map(l => ({
                      value: l.id,
                      label: `${l.customer?.name} - ${l.customer?.phone} (ID: ${l.id})`,
                      display: (
                        <div className="flex flex-col w-full">
                          <span className="font-medium text-gray-900">{l.customer?.name}</span>
                          <span className="text-gray-500 text-xs">{l.customer?.phone} | {l.customer?.email}</span>
                        </div>
                      )
                    }))}
                  />
                </div>

                <div className="mb-4 relative z-40">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Select Property *</label>
                  <SearchableSelect
                    className="w-full"
                    value={addOppData.propertyId}
                    onChange={(val) => setAddOppData({...addOppData, propertyId: val})}
                    placeholder="-- Select Property --"
                    options={allSystemProperties.map(p => ({
                      value: p.id,
                      label: `${p.title} (ID: ${p.id})`,
                      display: (
                        <div className="flex flex-col w-full">
                          <span className="font-medium text-gray-900">{p.title}</span>
                          <span className="text-gray-500 text-xs">{p.region?.name} | {p.type} | ₹{p.price?.toLocaleString()}</span>
                        </div>
                      )
                    }))}
                  />
                </div>

                <div className="mb-6 relative z-30">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assign Agent (Optional)</label>
                  <SearchableSelect
                    className="w-full"
                    value={addOppData.agentId}
                    onChange={(val) => setAddOppData({...addOppData, agentId: val})}
                    placeholder="-- Select Agent --"
                    options={agents.map(a => ({
                      value: a.id,
                      label: a.name,
                      display: (
                        <div className="flex flex-col w-full">
                          <span className="font-medium text-gray-900">{a.name}</span>
                          <span className="text-gray-500 text-xs">{a.email}</span>
                        </div>
                      )
                    }))}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowAddOppModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Create Opportunity
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <VisitsTab role="MANAGER" />
      )}
      {activeTab === 'authorizations' && (
        <AgentAuthorizations />
      )}
      {activeTab === 'properties' && (
        <ManagerPropertiesTab />
      )}

      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add New Lead</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <input type="text" className="w-full border rounded p-2" value={createFormData.customerName} onChange={e => setCreateFormData({...createFormData, customerName: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone *</label>
                  <input type="tel" className="w-full border rounded p-2" value={createFormData.customerPhone} onChange={e => setCreateFormData({...createFormData, customerPhone: e.target.value})} required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email *</label>
                  <input type="email" className="w-full border rounded p-2" value={createFormData.customerEmail} onChange={e => setCreateFormData({...createFormData, customerEmail: e.target.value})} required />
                </div>
              </div>

              <div className="pt-2 border-t relative z-20">
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <SearchableSelect 
                  className="w-full"
                  value={createFormData.regionId}
                  onChange={(val) => setCreateFormData({...createFormData, regionId: val})}
                  options={regions.map(r => ({ value: r.id, label: r.name }))}
                  placeholder="-- Optional: Select Region --"
                />
              </div>

              <div className="pt-2 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Interested Properties</label>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border">
                  {createFormData.properties.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-white p-2 border rounded text-sm shadow-sm">
                      <span className="truncate pr-2">{p.title}</span>
                      <button type="button" onClick={() => removeProperty(p.id)} className="text-red-500 hover:text-red-700 font-bold px-2"><X size={16} /></button>
                    </div>
                  ))}
                  {createFormData.properties.length === 0 && <span className="text-gray-400 text-sm">No properties selected.</span>}
                </div>
                <SearchableSelect 
                  className="w-full relative z-10"
                  value=""
                  onChange={(val) => addProperty(val)}
                  options={allSystemProperties
                    .filter(p => !createFormData.properties.find(existing => existing.id === p.id))
                    .filter(p => !createFormData.regionId || p.region?.id == createFormData.regionId)
                    .map(p => ({ value: p.id, label: p.title }))}
                  placeholder="+ Add Property..."
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 font-medium">Create Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
