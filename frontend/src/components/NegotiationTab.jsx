import React, { useState } from 'react';
import { IndianRupee, Send } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from './ConfirmModal';

const NegotiationTab = ({ opportunity, onOfferAdded }) => {
  const [clientOffer, setClientOffer] = useState('');
  const [agentCounter, setAgentCounter] = useState('');
  const [conditions, setConditions] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });

  const showAlert = (title, message) => {
    setConfirmConfig({ isOpen: true, title, message, type: 'alert', onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false })) });
  };

  const handleSubmit = async () => {
    if (!clientOffer || !validityDate) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/agent/opportunities/${opportunity.id}/negotiation`, {
        clientOfferAmount: parseFloat(clientOffer),
        agentCounterOffer: agentCounter ? parseFloat(agentCounter) : null,
        conditions: conditions || null,
        validityDate: new Date(validityDate).toISOString()
      });
      onOfferAdded(res.data);
      setClientOffer('');
      setAgentCounter('');
      setConditions('');
      setValidityDate('');
    } catch (e) {
      console.error(e);
      showAlert('Error', e.response?.data || 'Failed to add offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Client Offer (₹)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IndianRupee size={14} className="text-gray-400" />
            </div>
            <input 
              type="number" 
              value={clientOffer}
              onChange={(e) => setClientOffer(e.target.value)}
              placeholder="e.g. 5000000"
              className="w-full border border-gray-300 rounded-lg pl-8 p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Agent Counter (₹) <span className="text-gray-400 font-normal">(Optional)</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IndianRupee size={14} className="text-gray-400" />
            </div>
            <input 
              type="number" 
              value={agentCounter}
              onChange={(e) => setAgentCounter(e.target.value)}
              placeholder="e.g. 5200000"
              className="w-full border border-gray-300 rounded-lg pl-8 p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50 hover:bg-white transition-colors"
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Validity Date</label>
          <input 
            type="date"
            value={validityDate}
            onChange={(e) => setValidityDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50 hover:bg-white transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Conditions <span className="text-gray-400 font-normal">(Optional)</span></label>
        <textarea 
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          placeholder="Any specific conditions or notes for this offer..."
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none min-h-[60px] resize-none bg-gray-50 hover:bg-white transition-colors"
        />
      </div>

      <div className="flex justify-end mt-4">
        <button 
          onClick={handleSubmit}
          disabled={submitting || !clientOffer || !validityDate}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
        >
          <Send size={14} className="mr-2" />
          {submitting ? 'Submitting...' : 'Submit Offer'}
        </button>
      </div>

      {opportunity.negotiationOffers && opportunity.negotiationOffers.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Negotiation History</h4>
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:to-transparent">
            {[...opportunity.negotiationOffers].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((offer, idx) => (
              <div key={offer.id} className="relative flex items-start group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-primary-100 text-primary-600 shrink-0 shadow-sm relative z-10 font-bold text-xs">
                  #{opportunity.negotiationOffers.length - idx}
                </div>
                <div className="ml-4 w-full bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-gray-500 uppercase">Offer Submitted</span>
                    <time className="text-xs text-gray-400 font-medium">{new Date(offer.createdAt).toLocaleString()}</time>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500 text-xs">Client Offer:</span> <span className="font-bold">₹{offer.clientOfferAmount?.toLocaleString()}</span></div>
                    {offer.agentCounterOffer && <div><span className="text-gray-500 text-xs">Counter:</span> <span className="font-bold text-primary-600">₹{offer.agentCounterOffer?.toLocaleString()}</span></div>}
                    <div className="col-span-2"><span className="text-gray-500 text-xs">Valid till:</span> {new Date(offer.validityDate).toLocaleDateString()}</div>
                    {offer.conditions && <div className="col-span-2"><span className="text-gray-500 text-xs">Conditions:</span> {offer.conditions}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
};

export default NegotiationTab;
