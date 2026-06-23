import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { User, MapPin, Building, ShieldCheck, Search, Users, CheckCircle, Activity, X } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

export default function AgentAuthorizations() {
  const [agents, setAgents] = useState([]);
  const [regionalProperties, setRegionalProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentProperties, setAgentProperties] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, propsRes] = await Promise.all([
        api.get('/manager/agents'),
        api.get('/manager/properties')
      ]);
      setAgents(agentsRes.data);
      setRegionalProperties(propsRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
    }
  };

  const openAgentProperties = async (agent) => {
    setSelectedAgent(agent);
    setShowModal(true);
    setAgentProperties(new Set());
    try {
      const res = await api.get(`/manager/agents/${agent.id}/properties`);
      const authIds = new Set(res.data.map(p => p.id));
      setAgentProperties(authIds);
    } catch (err) {
      console.error("Failed to fetch agent properties");
    }
  };

  const toggleAgentProperty = (propertyId) => {
    const newProps = new Set(agentProperties);
    if (newProps.has(propertyId)) newProps.delete(propertyId);
    else newProps.add(propertyId);
    setAgentProperties(newProps);
  };

  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });

  const showAlert = (title, message) => {
    setConfirmConfig({ isOpen: true, title, message, type: 'alert', onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false })) });
  };

  const saveAgentProperties = async () => {
    if (!selectedAgent) return;
    setSaving(true);
    try {
      await api.put(`/manager/agents/${selectedAgent.id}/properties`, Array.from(agentProperties));
      setShowModal(false);
    } catch (err) {
      showAlert("Error", "Failed to save agent properties");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading agents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Activity className="mr-2 text-primary-600"/> Agent Property Authorizations
        </h2>
        <p className="text-sm text-gray-500 mb-6">Manage which properties each agent is authorized to sell.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map(agent => (
            <div key={agent.id} className="p-5 rounded-xl border border-gray-100 bg-gray-50 flex flex-col space-y-4 hover:border-primary-200 transition-colors shadow-sm">
              <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                <div>
                  <span className="font-bold text-gray-900 block">{agent.name}</span>
                  <span className="text-xs text-gray-500">{agent.email}</span>
                </div>
                <span className="bg-white px-2 py-1 rounded-full border border-gray-200 text-xs font-bold text-primary-700 shadow-sm flex items-center">
                  <CheckCircle size={12} className="mr-1" /> Active
                </span>
              </div>
              
              <button 
                onClick={() => openAgentProperties(agent)}
                className="mt-auto w-full text-sm font-semibold text-primary-600 bg-primary-50 py-2 rounded-lg hover:bg-primary-100 transition-colors"
              >
                Manage Authorizations
              </button>
            </div>
          ))}
          {agents.length === 0 && <p className="text-gray-500 text-sm py-4 col-span-full">No agents available in your region.</p>}
        </div>
      </div>

      {/* Agent Properties Modal */}
      {showModal && selectedAgent && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 relative flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors">
              <X size={20}/>
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Authorized Properties</h2>
            <p className="text-sm text-gray-500 mb-6">Select the properties that <span className="font-bold text-gray-900">{selectedAgent.name}</span> is authorized to sell.</p>
            
            <div className="flex-1 max-h-[60vh] overflow-y-auto pr-2 space-y-2 mb-6">
              {regionalProperties.map(property => {
                const isAuthorized = agentProperties.has(property.id);
                return (
                  <div 
                    key={property.id} 
                    onClick={() => toggleAgentProperty(property.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isAuthorized ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{property.title}</div>
                      <div className="text-xs text-gray-500">{property.type} • ${property.price?.toLocaleString()}</div>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${isAuthorized ? 'bg-primary-600 text-white' : 'border-2 border-gray-300'}`}>
                      {isAuthorized && <CheckCircle size={14} />}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button 
              onClick={saveAgentProperties}
              disabled={saving}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Authorization'}
            </button>
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
