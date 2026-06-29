import React, { useState } from 'react';
import { Download, FileText, Filter, Calendar } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportsTab() {
  const [reportType, setReportType] = useState('LEAD_ACTIVITY');
  const [dateRange, setDateRange] = useState('THIS_MONTH');
  const [loading, setLoading] = useState(false);

  const formatDataForReport = (type, rawData) => {
    switch (type) {
      case 'LEAD_ACTIVITY':
        return rawData.map(opp => ({
          ID: opp.id,
          Customer: opp.lead?.customer?.name || 'N/A',
          Property: opp.property?.title || 'N/A',
          Status: opp.status || 'N/A',
          Agent: opp.agent?.name || 'N/A'
        }));
      case 'AGENT_PERFORMANCE':
        return rawData.map(agent => ({
          ID: agent.id,
          Name: agent.name || 'N/A',
          Email: agent.email || 'N/A',
          Role: agent.role || 'N/A'
        }));
      case 'PROPERTY_STATUS':
        return rawData.map(prop => ({
          ID: prop.id,
          Title: prop.title || 'N/A',
          Type: prop.type || 'N/A',
          Price: prop.price || 'N/A',
          Status: prop.status || 'N/A'
        }));
      case 'VISIT_SCHEDULES':
        return rawData.map(visit => ({
          ID: visit.id,
          Date: visit.visitDate ? new Date(visit.visitDate).toLocaleString() : 'N/A',
          Customer: visit.opportunity?.lead?.customer?.name || 'N/A',
          Property: visit.opportunity?.property?.title || 'N/A',
          Status: visit.status || 'N/A'
        }));
      default:
        return rawData;
    }
  };

  const handleGenerateReport = async (format) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/reports/data?type=${reportType}&dateRange=${dateRange}`);
      const rawData = res.data || [];
      
      if (rawData.length === 0) {
        toast.error('No data found for the selected criteria');
        return;
      }

      const formattedData = formatDataForReport(reportType, rawData);
      const headers = Object.keys(formattedData[0]);

      if (format === 'CSV') {
        // Generate CSV
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const row of formattedData) {
          const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '""');
            return `"${escaped}"`;
          });
          csvRows.push(values.join(','));
        }
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${reportType.toLowerCase()}_report.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('CSV downloaded successfully');
      } else if (format === 'PDF') {
        // Generate PDF
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`EstateSync - ${reportType.replace('_', ' ')} Report`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        
        const tableColumn = headers;
        const tableRows = [];
        
        formattedData.forEach(row => {
          const rowData = headers.map(key => row[key]);
          tableRows.push(rowData);
        });

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 40,
          theme: 'striped',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [79, 70, 229] } // Primary color
        });
        
        doc.save(`${reportType.toLowerCase()}_report.pdf`);
        toast.success('PDF downloaded successfully');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <FileText className="mr-2 text-primary-600" /> Report Generation
        </h2>
        <p className="text-gray-500 text-sm mt-1">Generate and export detailed reports for system activity and performance metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
          <select 
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
          >
            <option value="LEAD_ACTIVITY">Lead Activity & Conversion</option>
            <option value="AGENT_PERFORMANCE">Agent Performance Metrics</option>
            <option value="PROPERTY_STATUS">Property Status & Inventory</option>
            <option value="VISIT_SCHEDULES">Site Visit Schedules</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50"
          >
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="THIS_YEAR">This Year</option>
            <option value="ALL_TIME">All Time</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button 
          disabled={loading}
          onClick={() => handleGenerateReport('CSV')}
          className="flex items-center justify-center w-full sm:w-auto bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition shadow-sm disabled:opacity-50"
        >
          <Download size={18} className="mr-2" />
          {loading ? 'Generating...' : 'Download CSV Report'}
        </button>
        <button 
          disabled={loading}
          onClick={() => handleGenerateReport('PDF')}
          className="flex items-center justify-center w-full sm:w-auto bg-white border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
        >
          <FileText size={18} className="mr-2" />
          {loading ? 'Generating...' : 'Export to PDF'}
        </button>
      </div>
    </div>
  );
}
