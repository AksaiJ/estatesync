import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Search, X, History } from 'lucide-react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';
import OpportunityWorkspaceModal from '../Agent/OpportunityWorkspaceModal';
import Pagination from '../../components/Pagination';

export default function LeadsTab() {
  const [leads, setLeads] = useState([]);
  const [rawLeads, setRawLeads] = useState([]);
  const [regions, setRegions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [managers, setManagers] = useState([]);
  const [allSystemProperties, setAllSystemProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedOppForWorkspace, setSelectedOppForWorkspace] = useState(null);
  const [formData, setFormData] = useState({ 
    isNew: false,
    id: null,
    status: 'NEW',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    regionId: '',
    agentId: '',
    managerId: '',
    properties: []
  });

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  useEffect(() => {
    fetchConstants();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, statusFilter, regionFilter, managerFilter, agentFilter]);

  const fetchConstants = async () => {
    try {
      const [regionsRes, usersRes, propsRes] = await Promise.all([
        api.get('/admin/regions'),
        api.get('/admin/users?size=1000'), // Quick hack for static lists, assuming less than 1000 users. Ideally an autocomplete or specific endpoint.
        api.get('/admin/properties?size=1000') 
      ]);
      setRegions(regionsRes.data);
      const allUsers = usersRes.data.content || usersRes.data; // Fallback in case it's a list or a page
      const allProps = propsRes.data.content || propsRes.data;
      setAgents(allUsers.filter(u => u.role === 'AGENT'));
      setManagers(allUsers.filter(u => u.role === 'MANAGER'));
      setAllSystemProperties(allProps);
    } catch (err) {
      console.error("Failed to fetch constants", err);
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage, size: 10 });
      if (statusFilter) params.append('status', statusFilter);
      if (regionFilter) params.append('regionId', regionFilter);
      if (managerFilter) params.append('managerId', managerFilter);
      if (agentFilter) params.append('agentId', agentFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await api.get(`/admin/leads?${params.toString()}`);
      
      const rawLeadsContent = res.data.content || (Array.isArray(res.data) ? res.data : []);
      const displayLeads = rawLeadsContent.map(lead => {
        // Map opportunities to the old interested properties structure
        const mappedProperties = (lead.opportunities || []).map(o => ({
          ...(o.property || {}),
          dateOfInterest: o.createdAt,
          sourceOpportunityId: o.id,
          fullOpportunity: {
            ...o,
            lead: { id: lead.id, customer: lead.customer, manager: lead.manager, region: lead.region }
          }
        }));
        
        // Find the first assigned agent, if any
        const firstAgent = lead.opportunities && lead.opportunities.length > 0 
          ? lead.opportunities.find(o => o.agent)?.agent 
          : null;

        return {
          id: lead.id,
          createdAt: lead.createdAt,
          customer: lead.customer,
          region: lead.region,
          agent: firstAgent,
          manager: lead.manager,
          status: lead.status,
          interestedPropertiesWithDates: mappedProperties
        };
      });

      setRawLeads(rawLeadsContent);
      setLeads(displayLeads);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch leads", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: formData.status,
        customer: {
          name: formData.customerName,
          email: formData.customerEmail,
          phone: formData.customerPhone
        },
        region: formData.regionId ? { id: formData.regionId } : null,
        agent: formData.agentId ? { id: formData.agentId } : null,
        manager: formData.managerId ? { id: formData.managerId } : null,
        interestedProperties: formData.properties.map(p => ({ id: p.id }))
      };

      if (formData.isNew) {
        await api.post('/admin/leads', payload);
      } else if (formData.id) {
        await api.put(`/admin/leads/${formData.id}`, payload);
      }
      setShowModal(false);
      fetchLeads();
    } catch (err) {
      console.error("Save failed", err);
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

  const handleDelete = (id) => {
    showConfirm("Confirm Delete", "Are you sure you want to delete this lead?", async () => {
      try {
        await api.delete(`/admin/leads/${id}`);
        fetchLeads();
      } catch (err) {
        showAlert("Error", "Failed to delete leads.");
      }
    });
  };

  const openModal = (displayLead) => {
    if (displayLead) {
      setFormData({ 
        isNew: false,
        id: displayLead.id, 
        status: displayLead.status,
        customerName: displayLead.customer?.name || '',
        customerEmail: displayLead.customer?.email || '',
        customerPhone: displayLead.customer?.phone || '',
        regionId: displayLead.region?.id || '',
        agentId: displayLead.agent?.id || '',
        managerId: displayLead.manager?.id || '',
        properties: [...displayLead.interestedPropertiesWithDates]
      });
    } else {
      setFormData({ 
        isNew: true,
        id: null, 
        status: 'NEW',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        regionId: '',
        agentId: '',
        managerId: '',
        properties: []
      });
    }
    setShowModal(true);
  };

  const addProperty = (e) => {
    const propId = parseInt(e.target.value);
    if (!propId) return;
    const propObj = allSystemProperties.find(p => p.id === propId);
    if (propObj && !formData.properties.find(p => p.id === propId)) {
      setFormData({
        ...formData,
        properties: [...formData.properties, { ...propObj, sourceLeadId: null, dateOfInterest: new Date().toISOString() }]
      });
    }
    e.target.value = "";
  };

  const removeProperty = (propId) => {
    setFormData({
      ...formData,
      properties: formData.properties.filter(p => p.id !== propId)
    });
  };

  const copyToClipboard = (text) => {
    if (text) {
      navigator.clipboard.writeText(text);
      showAlert('Success', `Copied location ID: ${text}`);
    } else {
      showAlert('Error', "Location ID not available.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 space-y-4 md:space-y-0">
        <h2 className="text-xl font-bold text-gray-900">Manage Leads</h2>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search leads..." 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500 w-full sm:w-48"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
          />
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
            <option value="NEGOTIATION">NEGOTIATION</option>
            <option value="CLOSED">CLOSED</option>
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
            value={managerFilter}
            onChange={(e) => { setManagerFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Managers</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500"
            value={agentFilter}
            onChange={(e) => { setAgentFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Agents</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button onClick={() => openModal()} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition flex items-center whitespace-nowrap">
            <Plus size={16} className="mr-2" /> Add Lead
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Properties</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Info</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? <tr><td colSpan="6" className="text-center py-4">Loading...</td></tr> : 
             leads.map(l => (
              <tr key={l.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="max-w-[80px] truncate" title={l.id}>#{l.id}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {l.customer?.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {l.interestedPropertiesWithDates && l.interestedPropertiesWithDates.length > 0 ? (
                    <div className="flex flex-col gap-2 max-w-[250px]">
                      {l.interestedPropertiesWithDates.map(p => (
                        <div key={p.id} className="flex flex-col p-2 bg-gray-50 border border-gray-200 rounded">
                          <span className="text-xs font-medium text-gray-900 truncate" title={p.title}>
                            {p.title} {p.region?.name ? <span className="text-gray-500 font-normal">({p.region.name})</span> : ''}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-1 flex justify-between items-center">
                            <span>Added: {p.dateOfInterest ? new Date(p.dateOfInterest).toLocaleDateString() : 'N/A'}</span>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => copyToClipboard(p.id)} 
                                className="text-blue-500 hover:text-blue-700 hover:underline"
                                title="Copy Location ID"
                              >
                                Copy ID
                              </button>
                              <button 
                                onClick={() => setSelectedOppForWorkspace(p.fullOpportunity)} 
                                className="text-primary-600 hover:text-primary-800 hover:underline flex items-center"
                                title="View Workspace & Schedule Visit"
                              >
                                <History size={12} className="mr-1" /> Workspace
                              </button>
                            </div>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">None</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{l.customer?.phone}</div>
                  <div className="text-xs">{l.customer?.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="font-medium text-gray-900">{l.region?.name || 'No Region'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="font-medium text-gray-900">{l.manager?.name || 'Unassigned'}</div>
                  {l.manager?.region && <div className="text-xs text-gray-400">From: {l.manager.region.name}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="text-gray-900">{l.agent?.name || 'Unassigned'}</div>
                  {l.agent?.region && <div className="text-xs text-gray-400">From: {l.agent.region.name}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${l.status === 'NEW' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <button onClick={() => openModal(l)} className="text-blue-600 hover:text-blue-900"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(l.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
            {!loading && leads.length === 0 && (
              <tr><td colSpan="6" className="text-center py-4 text-gray-500">No leads found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-gray-100">
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-bold mb-4">{formData.isNew ? 'Add New Lead' : 'Edit Lead Details'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <input type="text" className="w-full border rounded p-2" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                  <input type="tel" className="w-full border rounded p-2" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
                  <input type="email" className="w-full border rounded p-2" value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region *</label>
                  <select className="w-full border rounded p-2" required value={formData.regionId} onChange={e => setFormData({...formData, regionId: e.target.value})}>
                    <option value="" disabled>-- Select Region --</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Agent</label>
                  <select className="w-full border rounded p-2" value={formData.agentId} onChange={e => setFormData({...formData, agentId: e.target.value})}>
                    <option value="">-- Unassigned --</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name} {a.region ? `(${a.region.name})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Manager</label>
                  <select className="w-full border rounded p-2" value={formData.managerId} onChange={e => setFormData({...formData, managerId: e.target.value})}>
                    <option value="">-- Unassigned --</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name} {m.region ? `(${m.region.name})` : ''}</option>)}
                  </select>
                </div>
                <div className="col-span-2 mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Status *</label>
                  <select className="w-full border rounded p-2 bg-gray-50 font-semibold" required value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="NEW">NEW</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROPOSAL_SENT">PROPOSAL_SENT</option>
                    <option value="NEGOTIATION">NEGOTIATION</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Interested Properties</label>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border">
                  {formData.properties.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-white p-2 border rounded text-sm shadow-sm">
                      <span className="truncate pr-2">{p.title}</span>
                      <button type="button" onClick={() => removeProperty(p.id)} className="text-red-500 hover:text-red-700 font-bold px-2"><X size={16} /></button>
                    </div>
                  ))}
                  {formData.properties.length === 0 && <span className="text-gray-400 text-sm">No properties selected.</span>}
                </div>
                <select className="w-full border rounded p-2" onChange={addProperty} defaultValue="">
                  <option value="" disabled>+ Add Property...</option>
                  {allSystemProperties
                    .filter(p => !formData.properties.find(existing => existing.id === p.id))
                    .filter(p => !formData.regionId || p.region?.id == formData.regionId)
                    .map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedOppForWorkspace && (
        <OpportunityWorkspaceModal 
          opportunity={selectedOppForWorkspace}
          role="ADMIN"
          onClose={() => setSelectedOppForWorkspace(null)}
          onActivityLogged={fetchLeads}
        />
      )}

      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
