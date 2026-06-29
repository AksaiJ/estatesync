import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { X, Phone, Mail, FileText, Calendar, Building, MapPin, Send, Clock, User as UserIcon, RefreshCw, Download } from 'lucide-react';
import NegotiationTab from '../../components/NegotiationTab';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmModal from '../../components/ConfirmModal';

export default function OpportunityWorkspaceModal({ opportunity, role = 'AGENT', onClose, onActivityLogged }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('NOTE'); // NOTE, CALL, EMAIL, VISIT, EDIT SCHEDULE, STATUS
  const [content, setContent] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [existingVisit, setExistingVisit] = useState(null);
  const [newStatus, setNewStatus] = useState(opportunity.status);
  const [submitting, setSubmitting] = useState(false);
  
  // Closed Won Details State
  const [finalPrice, setFinalPrice] = useState(opportunity?.finalPrice || '');
  const [documentationDate, setDocumentationDate] = useState(opportunity?.documentationDate || '');
  const [purchaseDate, setPurchaseDate] = useState(opportunity?.purchaseDate || '');
  const [sendEmail, setSendEmail] = useState(false);
  const [sendVisitEmail, setSendVisitEmail] = useState(true);

  const basePath = role === 'ADMIN' ? '/admin' : role === 'MANAGER' ? '/manager' : '/agent';

  useEffect(() => {
    if (opportunity) {
      setFinalPrice(opportunity.finalPrice || '');
      setDocumentationDate(opportunity.documentationDate || '');
      setPurchaseDate(opportunity.purchaseDate || '');
    }
    fetchLogs();
    fetchExistingVisit();
  }, [opportunity.id]);

  const fetchExistingVisit = async () => {
    try {
      const res = await api.get(`${basePath}/visits`);
      const visits = res.data;
      const scheduledVisit = visits.find(v => v.opportunity?.id === opportunity.id && v.status === 'SCHEDULED');
      if (scheduledVisit) {
        setExistingVisit(scheduledVisit);
        // Pre-fill datetime-local if needed, but it usually requires YYYY-MM-DDTHH:mm format
        if (scheduledVisit.visitDate) {
           setVisitDate(scheduledVisit.visitDate.substring(0, 16));
        }
      }
    } catch (err) {
      console.error("Failed to fetch visits for checking existing schedule", err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const endpoint = role === 'ADMIN'
        ? `/admin/reports/data?type=LEAD_ACTIVITY` // Note: Admin might need a specific history endpoint, fallback to opportunity fetch if needed. Actually we'll use agent history as admin. Wait, admin can call anything but let's just assume we need history.
        : role === 'MANAGER' 
        ? `/manager/opportunity/${opportunity.id}/history` 
        : `/agent/opportunities/${opportunity.id}/history`;
      
      // Admin doesn't have a specific history endpoint for one opportunity, we might need to use the agent one or add one.
      // Let's call /manager/opportunity/{id}/history for manager, and for Admin we'll need to add it, or use a workaround.
      
      let res;
      if (role === 'ADMIN') {
        // Admin can access agent routes based on security config (it just checks auth). 
        // Wait, agent route checks if the opportunity belongs to the agent. Admin will get 400 Not authorized.
        // I need to add an endpoint for admin history.
      }
      res = await api.get(role === 'ADMIN' ? `/admin/opportunities/${opportunity.id}/history` : endpoint);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
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

  const handleLogActivity = () => {
    if ((activeTab === 'VISIT' || activeTab === 'EDIT SCHEDULE') && !visitDate) return showAlert("Error", "Please select a visit date");
    if (activeTab === 'ACTION' && newStatus === opportunity.status) return showAlert("Error", "Please select a different status");
    if (activeTab !== 'VISIT' && activeTab !== 'EDIT SCHEDULE' && !content.trim()) return;

    const executeLog = async () => {
      setSubmitting(true);
      try {
        if (activeTab === 'VISIT') {
          await api.post(`${basePath}/opportunities/${opportunity.id}/visits`, {
            visitDate: visitDate,
            sendEmail: sendVisitEmail ? "true" : "false"
          });
          setVisitDate('');
          if (opportunity.status === 'NEW') {
            opportunity.status = 'CONTACTED';
          } else if (opportunity.status === 'CONTACTED') {
            opportunity.status = 'VISIT_SCHEDULED';
          }
          fetchExistingVisit();
        } else if (activeTab === 'EDIT SCHEDULE') {
          await api.put(`${basePath}/visits/${existingVisit.id}`, {
            visitDate: visitDate
          });
          setVisitDate('');
          fetchExistingVisit();
        } else if (activeTab === 'ACTION') {
          const statusEndpoint = role === 'ADMIN' || role === 'MANAGER' 
            ? `${basePath}/opportunities/${opportunity.id}/status/override` 
            : `${basePath}/opportunities/${opportunity.id}/status`;
            
          const payload = { status: newStatus };
          if (role === 'ADMIN' || role === 'MANAGER') {
            payload.reason = content;
          }

          if (newStatus === 'CLOSED_WON') {
            if (!finalPrice || !documentationDate || !purchaseDate) {
              setSubmitting(false);
              return showAlert("Error", "Please fill all required Closed Won details.");
            }
            payload.finalPrice = finalPrice;
            payload.documentationDate = documentationDate;
            payload.purchaseDate = purchaseDate;
            payload.sendEmail = sendEmail ? "true" : "false";
          }
          
          await api.put(statusEndpoint, payload);
          
          if (role !== 'ADMIN' && role !== 'MANAGER') {
            await api.post(`${basePath}/opportunities/${opportunity.id}/log`, {
              type: 'SYSTEM_EVENT',
              content: `Status updated to ${newStatus}. Note: ${content}`
            });
          }
          setContent('');
          opportunity.status = newStatus; 
        } else {
          await api.post(`${basePath}/opportunities/${opportunity.id}/log`, {
            type: activeTab,
            content: content
          });
          setContent('');
        }
        fetchLogs();
        if (onActivityLogged) onActivityLogged();
      } catch (err) {
        showAlert("Error", "Failed to log activity");
      } finally {
        setSubmitting(false);
      }
    };

    if (activeTab === 'VISIT') {
      showConfirm("Confirm Visit", "Are you sure you want to schedule this visit?", executeLog);
    } else if (activeTab === 'ACTION') {
      showConfirm("Confirm Status Update", `Are you sure you want to update the opportunity status to ${newStatus}?`, executeLog);
    } else {
      executeLog();
    }
  };

  const handleCancelVisit = () => {
    if (!existingVisit) return;
    showConfirm("Confirm Cancel", "Are you sure you want to cancel this visit?", async () => {
      setSubmitting(true);
      try {
        await api.put(`${basePath}/visits/${existingVisit.id}/status`, { status: 'CANCELLED' });
        showAlert("Success", "Visit cancelled successfully.");
        setExistingVisit(null);
        setVisitDate('');
        setActiveTab('NOTE');
        fetchLogs();
        if (onActivityLogged) onActivityLogged();
      } catch (err) {
        console.error(err);
        showAlert("Error", "Failed to cancel visit");
      } finally {
        setSubmitting(false);
      }
    });
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40);
    doc.text("Transaction Summary", 14, 22);
    
    // Company details
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("EstateSync Inc.", 14, 30);
    doc.text("Date: " + new Date().toLocaleDateString(), 14, 36);
    
    // Divider
    doc.setDrawColor(200);
    doc.line(14, 42, 196, 42);

    // Main Content
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text("Customer Details", 14, 52);
    
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(`Name: ${opportunity.lead?.customer?.name || 'N/A'}`, 14, 60);
    doc.text(`Email: ${opportunity.lead?.customer?.email || 'N/A'}`, 14, 66);
    doc.text(`Phone: ${opportunity.lead?.customer?.phone || 'N/A'}`, 14, 72);

    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text("Property Details", 100, 52);
    
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(`Title: ${opportunity.property?.title || 'N/A'}`, 100, 60);
    doc.text(`Location: ${opportunity.property?.region?.name || 'N/A'}`, 100, 66);
    doc.text(`Original Price: $${opportunity.property?.price?.toLocaleString() || 'N/A'}`, 100, 72);

    // Property & Transaction Details Table
    let propertyDetails = [
      ['Property Type', opportunity.property?.type || 'N/A'],
      ['Build Date', opportunity.property?.buildDate || 'N/A'],
      ['Defect Liability', opportunity.property?.defectLiabilityPeriod || 'N/A'],
      ['Square Footage', opportunity.property?.squareFootage || 'N/A'],
      ['Parking Spaces', opportunity.property?.parkingSpaces || 'N/A'],
      ['Power Backup', opportunity.property?.powerBackupType || 'N/A'],
      ['Lifts', opportunity.property?.numberOfLifts || 'N/A'],
      ['Water Storage', opportunity.property?.waterStorageCapacityLiters ? `${opportunity.property.waterStorageCapacityLiters} L` : 'N/A'],
      ['Piped Gas', opportunity.property?.hasPipedGas ? 'Yes' : 'No'],
      ['CCTV Surveillance', opportunity.property?.hasCctvSurveillance ? 'Yes' : 'No'],
      ['Fire Safety Compliant', opportunity.property?.fireSafetyCompliance ? 'Yes' : 'No'],
      ['Pest Control Done', opportunity.property?.pestControlDone ? 'Yes' : 'No']
    ];

    if (opportunity.property?.numberOfBalconies != null) propertyDetails.push(['Balconies', opportunity.property.numberOfBalconies]);
    if (opportunity.property?.poolAccessType) propertyDetails.push(['Pool Access', opportunity.property.poolAccessType]);
    if (opportunity.property?.poolSizeSqft != null) propertyDetails.push(['Pool Size', `${opportunity.property.poolSizeSqft} sqft`]);
    if (opportunity.property?.terraceAccessType) propertyDetails.push(['Terrace Access', opportunity.property.terraceAccessType]);
    if (opportunity.property?.terraceAreaSqft != null) propertyDetails.push(['Terrace Area', `${opportunity.property.terraceAreaSqft} sqft`]);
    if (opportunity.property?.garageOutletAccessType) propertyDetails.push(['Garage Outlet', opportunity.property.garageOutletAccessType]);
    if (opportunity.property?.garageOutletCapacityVa != null) propertyDetails.push(['Garage Outlet VA', `${opportunity.property.garageOutletCapacityVa} VA`]);

    const type = opportunity.property?.type?.toUpperCase();
    if (type === 'VILLA' || type === 'APARTMENT') {
      propertyDetails.push(['Bedrooms', opportunity.property?.numberOfBedrooms || 'N/A']);
      propertyDetails.push(['Bathrooms', opportunity.property?.numberOfBathrooms || 'N/A']);
      propertyDetails.push(['Furnishing', opportunity.property?.furnishingStatus ? opportunity.property.furnishingStatus.replace('_', ' ') : 'N/A']);
      propertyDetails.push(['Pet Policy', opportunity.property?.petPolicy ? opportunity.property.petPolicy.replace('_', ' ') : 'N/A']);
      propertyDetails.push(['Kitchen Type', opportunity.property?.kitchenType ? opportunity.property.kitchenType.replace('_', ' ') : 'N/A']);
      propertyDetails.push(['Number of Kitchens', opportunity.property?.numberOfKitchens || 'N/A']);
      propertyDetails.push(['Maid\'s Room', opportunity.property?.hasMaidsRoom ? 'Yes' : 'No']);
      propertyDetails.push(['Intercom', opportunity.property?.hasIntercom ? 'Yes' : 'No']);
    } else if (type === 'COMMERCIAL') {
      propertyDetails.push(['Zoning Type', opportunity.property?.zoningType ? opportunity.property.zoningType.replace('_', ' ') : 'N/A']);
      propertyDetails.push(['HVAC System', opportunity.property?.hvacSystemType || 'N/A']);
      propertyDetails.push(['Max Floor Load', opportunity.property?.maxFloorLoadKgPerSqm ? `${opportunity.property.maxFloorLoadKgPerSqm} kg/sqm` : 'N/A']);
      propertyDetails.push(['Cafeteria Access', opportunity.property?.cafeteriaAccessType ? opportunity.property.cafeteriaAccessType.replace('_', ' ') : 'N/A']);
      if (opportunity.property?.cafeteriaSizeSqft != null) propertyDetails.push(['Cafeteria Size', `${opportunity.property.cafeteriaSizeSqft} sqft`]);
      if (opportunity.property?.parkingAreaCapacity != null) propertyDetails.push(['Parking Capacity', opportunity.property.parkingAreaCapacity]);
      if (opportunity.property?.loadingDockCount != null) propertyDetails.push(['Loading Docks', opportunity.property.loadingDockCount]);
      propertyDetails.push(['Freight Elevator', opportunity.property?.hasFreightElevator ? 'Yes' : 'No']);
      propertyDetails.push(['Watchman Room', opportunity.property?.hasWatchmanRoom ? 'Yes' : 'No']);
    }

    const transactionDetails = [
      ['Final Agreed Price', `$${finalPrice}`],
      ['Purchase Date', purchaseDate],
      ['Documentation Date', documentationDate],
      ['Status', 'CLOSED WON']
    ];

    const agentDetails = [
      ['Agent Name', opportunity.agent?.name || 'N/A'],
      ['Agent Email', opportunity.agent?.email || 'N/A'],
      ['Manager Name', opportunity.agent?.manager?.name || 'N/A']
    ];

    autoTable(doc, {
      startY: 85,
      head: [['Detail', 'Value']],
      body: [
        [{ content: 'Property Details', colSpan: 2, styles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } }],
        ...propertyDetails,
        [{ content: 'Agent Information', colSpan: 2, styles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } }],
        ...agentDetails,
        [{ content: 'Transaction Details', colSpan: 2, styles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' } }],
        ...transactionDetails
      ],
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87] } // Green-700
    });
    
    // Footer
    const finalY = doc.lastAutoTable.finalY || 130;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for choosing EstateSync for your property needs.", 14, finalY + 20);

    doc.save(`Transaction_Summary_${opportunity.id}.pdf`);
  };

  const getLogTheme = (log) => {
    const content = (log.content || '').toLowerCase();
    
    // Negative keywords
    if (content.includes('failed') || content.includes('cancel') || content.includes('lost') || content.includes('reject') || content.includes('error') || content.includes('unresponsive')) {
      return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', iconBg: 'bg-red-100', iconColor: 'text-red-600' };
    }
    
    // Positive keywords
    if (content.includes('success') || content.includes('completed') || content.includes('approved') || content.includes('won') || content.includes('accepted')) {
      return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', iconBg: 'bg-green-100', iconColor: 'text-green-600' };
    }

    if (log.type === 'CALL') return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' };
    if (log.type === 'EMAIL') return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' };
    if (log.type === 'VISIT') return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' };
    
    if (log.type === 'SYSTEM_EVENT') {
      const upperContent = log.content || '';
      if (upperContent.includes('OVERRIDDEN') || upperContent.includes('reassigned')) return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' };
      if (upperContent.includes('VISIT_SCHEDULED') || upperContent.includes('PROPOSAL_SENT') || upperContent.includes('IN_NEGOTIATION')) return { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' };
    }
    
    return { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-800', iconBg: 'bg-gray-100', iconColor: 'text-gray-500' };
  };

  const renderIcon = (type, theme) => {
    switch(type) {
      case 'CALL': return <Phone size={16} className={theme.iconColor} />;
      case 'EMAIL': return <Mail size={16} className={theme.iconColor} />;
      case 'VISIT': return <Calendar size={16} className={theme.iconColor} />;
      case 'SYSTEM_EVENT': return <Clock size={16} className={theme.iconColor} />;
      default: return <FileText size={16} className={theme.iconColor} />;
    }
  };

  const getLegalNextSteps = (current) => {
    if (role === 'ADMIN' || role === 'MANAGER') {
      return ['NEW', 'CONTACTED', 'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'PROPOSAL_SENT', 'IN_NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'UNRESPONSIVE'];
    }
    const steps = [];
    if (current === 'NEW') steps.push('CONTACTED');
    if (current === 'CONTACTED') steps.push('VISIT_SCHEDULED', 'PROPOSAL_SENT');
    if (current === 'VISIT_SCHEDULED') steps.push('VISIT_COMPLETED', 'CONTACTED');
    if (current === 'VISIT_COMPLETED') steps.push('PROPOSAL_SENT');
    if (current === 'PROPOSAL_SENT') steps.push('IN_NEGOTIATION');
    if (current === 'IN_NEGOTIATION') steps.push('CLOSED_WON', 'CLOSED_LOST');
    if (current === 'UNRESPONSIVE') steps.push('CONTACTED');
    
    if (current !== 'CLOSED_WON' && current !== 'CLOSED_LOST') {
      if (!steps.includes('UNRESPONSIVE')) steps.push('UNRESPONSIVE');
      if (!steps.includes('CLOSED_LOST')) steps.push('CLOSED_LOST');
    }
    return steps;
  };

  const canNegotiate = ['PROPOSAL_SENT', 'IN_NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'].includes(opportunity.status);

  const tabs = ['NOTE', 'CALL', 'EMAIL', existingVisit ? 'EDIT SCHEDULE' : 'VISIT', 'ACTION', ...(canNegotiate ? ['NEGOTIATE'] : [])];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[85vh] flex overflow-hidden flex-col md:flex-row animate-in fade-in zoom-in duration-200">
        
        {/* Left Pane: Details */}
        <div className="md:w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-gray-900">Lead Details: {opportunity.lead?.customer?.name}</h2>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center">
                <UserIcon size={14} className="mr-1" /> Customer
              </h3>
              <p className="font-bold text-lg text-gray-900 mb-1">{opportunity.lead?.customer?.name}</p>
              <div className="text-sm text-gray-600 space-y-2 mt-3">
                <a 
                  href={`tel:${opportunity.lead?.customer?.phone}`} 
                  onClick={() => setActiveTab('CALL')}
                  className="flex items-center hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Phone size={14} className="mr-2 text-gray-400" /> {opportunity.lead?.customer?.phone}
                </a>
                <a 
                  href={`mailto:${opportunity.lead?.customer?.email}`}
                  onClick={() => setActiveTab('EMAIL')}
                  className="flex items-center hover:text-purple-600 transition-colors cursor-pointer"
                >
                  <Mail size={14} className="mr-2 text-gray-400" /> {opportunity.lead?.customer?.email}
                </a>
              </div>
            </div>

            {/* Property Info */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center">
                <Building size={14} className="mr-1" /> Property Interest
              </h3>
              <p className="font-bold text-gray-900 mb-1">{opportunity.property?.title}</p>
              <p className="text-sm text-primary-600 font-semibold mb-2">₹{opportunity.property?.price?.toLocaleString()}</p>
              <div className="text-sm text-gray-600 space-y-2 mt-3">
                <p className="flex items-center"><MapPin size={14} className="mr-2 text-gray-400" /> {opportunity.property?.region?.name}</p>
                <p className="flex items-center text-xs"><span className="px-2 py-1 bg-gray-100 rounded text-gray-700">{opportunity.property?.type}</span></p>
              </div>
            </div>

            {/* Status Info */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Current Status</h3>
              <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-primary-100 text-primary-800 border border-primary-200">
                {opportunity.status}
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Activity & Timeline */}
        <div className="md:w-2/3 flex flex-col bg-white">
          
          {/* Timeline Header */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Activity Timeline</h3>
            
            {/* Input Form (For Agent, Admin, Manager) */}
            <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
              <div className="flex border-b border-gray-100 bg-gray-50/50">
                  {tabs.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider ${activeTab === tab ? 'text-primary-600 border-b-2 border-primary-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="p-3 bg-white">
                  {(activeTab === 'VISIT' || activeTab === 'EDIT SCHEDULE') ? (
                    <div className="space-y-4">
                      {activeTab === 'EDIT SCHEDULE' && <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Reschedule existing visit</p>}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar size={16} className="text-gray-400" />
                        </div>
                        <input
                          type="datetime-local"
                          value={visitDate}
                          onChange={(e) => setVisitDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg pl-10 p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-gray-50/50 hover:bg-white transition-colors"
                        />
                      </div>
                      <textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Add notes for this visit (optional)..."
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none min-h-[80px] resize-none bg-gray-50/50 hover:bg-white transition-colors"
                      />
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="sendVisitEmailCheckbox"
                          checked={sendVisitEmail}
                          onChange={(e) => setSendVisitEmail(e.target.checked)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="sendVisitEmailCheckbox" className="text-sm font-medium text-gray-700">
                          Email visit details to client
                        </label>
                      </div>
                    </div>
                  ) : activeTab === 'ACTION' ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {getLegalNextSteps(opportunity.status).map(step => (
                          <button
                            key={step}
                            onClick={() => setNewStatus(step)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${newStatus === step ? 'bg-primary-100 border-primary-500 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          >
                            {step.replace('_', ' ')}
                          </button>
                        ))}
                        {getLegalNextSteps(opportunity.status).length === 0 && opportunity.status !== 'CLOSED_WON' && (
                          <p className="text-sm text-gray-500 italic">No further actions available from current status.</p>
                        )}
                        {opportunity.status === 'CLOSED_WON' && (
                          <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 mt-2">
                            <h4 className="text-sm font-bold text-green-800 mb-3 flex items-center">
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                              Closed Won Summary
                            </h4>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                              <div className="text-gray-500">Final Price:</div>
                              <div className="font-semibold text-gray-900">${opportunity.finalPrice || finalPrice}</div>
                              
                              <div className="text-gray-500">Purchase Date:</div>
                              <div className="font-semibold text-gray-900">{opportunity.purchaseDate || purchaseDate}</div>
                              
                              <div className="text-gray-500">Documentation Date:</div>
                              <div className="font-semibold text-gray-900">{opportunity.documentationDate || documentationDate}</div>
                            </div>
                            <button 
                              onClick={handleGeneratePDF}
                              className="mt-4 flex items-center justify-center w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors"
                            >
                              <Download size={16} className="mr-2" /> Download Summary PDF
                            </button>
                          </div>
                        )}
                      </div>
                      {newStatus && (newStatus !== opportunity.status || role === 'ADMIN' || role === 'MANAGER') && (
                        <div className="space-y-4">
                          <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Why are you updating this status? (Mandatory note)"
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none min-h-[80px] resize-none bg-gray-50/50"
                          />
                          {newStatus === 'CLOSED_WON' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
                              <h4 className="text-sm font-bold text-green-800">Closed Won Details</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Final Price ($)</label>
                                  <input 
                                    type="number" 
                                    value={finalPrice} 
                                    onChange={e => setFinalPrice(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-green-500"
                                    placeholder="e.g. 500000"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Purchase Date</label>
                                  <input 
                                    type="date" 
                                    value={purchaseDate} 
                                    onChange={e => setPurchaseDate(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-green-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">Documentation Date</label>
                                  <input 
                                    type="date" 
                                    value={documentationDate} 
                                    onChange={e => setDocumentationDate(e.target.value)} 
                                    className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-green-500"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 mt-2">
                                <input 
                                  type="checkbox" 
                                  id="sendEmail" 
                                  checked={sendEmail} 
                                  onChange={e => setSendEmail(e.target.checked)} 
                                  className="rounded text-green-600 focus:ring-green-500"
                                />
                                <label htmlFor="sendEmail" className="text-sm text-gray-700 cursor-pointer">Send email acknowledgment to customer</label>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : activeTab === 'NEGOTIATE' ? (
                    <NegotiationTab 
                      opportunity={opportunity} 
                      onOfferAdded={(offer) => {
                        fetchLogs();
                        onActivityLogged();
                        setContent('');
                      }} 
                    />
                  ) : (
                    <textarea 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={`Write your ${activeTab.toLowerCase()} notes here...`}
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none min-h-[100px] resize-none bg-gray-50/50"
                    />
                  )}
                  {activeTab !== 'NEGOTIATE' && !(activeTab === 'ACTION' && opportunity.status === 'CLOSED_WON' && role !== 'ADMIN' && role !== 'MANAGER') && (
                    <div className={activeTab === 'EDIT SCHEDULE' ? "flex justify-between mt-4" : "flex justify-end mt-4"}>
                      {activeTab === 'EDIT SCHEDULE' && (
                        <button 
                          onClick={handleCancelVisit}
                          disabled={submitting}
                          className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
                        >
                          <X size={14} className="mr-2" />
                          Cancel Visit
                        </button>
                      )}
                      <button 
                        onClick={handleLogActivity}
                        disabled={submitting || (activeTab === 'VISIT' || activeTab === 'EDIT SCHEDULE' ? !visitDate : activeTab === 'ACTION' ? (!content.trim() || !newStatus || (newStatus === opportunity.status && role !== 'ADMIN' && role !== 'MANAGER')) : !content.trim())}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
                      >
                        {activeTab === 'ACTION' ? <RefreshCw size={14} className="mr-2" /> : <Send size={14} className="mr-2" />}
                        {submitting ? 'Processing...' : activeTab === 'ACTION' ? 'Update Status' : (activeTab === 'VISIT' || activeTab === 'EDIT SCHEDULE') ? 'Update' : 'Log Activity'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
          </div>

          {/* Timeline Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            {loading ? (
              <p className="text-gray-500 text-center text-sm">Loading timeline...</p>
            ) : logs.length === 0 ? (
              <p className="text-gray-500 text-center text-sm italic">No activity logs found.</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {logs.map((log) => {
                  const theme = getLogTheme(log);
                  return (
                    <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white ${theme.iconBg} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10`}>
                        {renderIcon(log.type, theme)}
                      </div>
                      <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ${theme.bg} p-3 rounded-xl border ${theme.border} shadow-sm transition-colors`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold ${theme.text} uppercase tracking-wider`}>{log.type}</span>
                          <time className={`text-xs ${theme.text} opacity-75 font-medium`}>{new Date(log.createdAt.replace('T', ' ')).toLocaleString()}</time>
                        </div>
                        <p className={`text-sm ${theme.text} whitespace-pre-wrap font-medium`}>{log.content}</p>
                        {log.user && (
                          <p className={`text-xs ${theme.text} opacity-75 mt-2 font-medium flex items-center`}>
                            <UserIcon size={12} className="mr-1" /> By {log.user.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
