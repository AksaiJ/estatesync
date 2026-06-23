import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit, Trash2, MapPin, Map as MapIcon, Image as ImageIcon, Eye, EyeOff, CheckCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationPickerMap({ lat, lng, onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  
  const position = lat && lng && !isNaN(lat) && !isNaN(lng) ? [parseFloat(lat), parseFloat(lng)] : null;
  return position ? <Marker position={position} /> : null;
}

export default function PropertiesTab() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', description: '', price: '', type: '', lat: '', lng: '', region: null, 
    imageUrls: ['', '', '', '', ''],
    status: 'AVAILABLE', buildDate: '', fireSafetyCompliance: false, pestControlDone: false,
    squareFootage: '', parkingSpaces: '',
    powerBackupType: '', fireSafetyComplianceDate: '', lastPestControlDate: '', 
    numberOfLifts: '', waterStorageCapacityLiters: '', parkingAreaCapacity: '', 
    numberOfBalconies: '', poolAccessType: '', poolSizeSqft: '', terraceAccessType: '', 
    terraceAreaSqft: '', garageOutletAccessType: '', garageOutletCapacityVa: '',
    numberOfBedrooms: '', numberOfBathrooms: '', furnishingStatus: '', petPolicy: '', hasMaidsRoom: false,
    zoningType: '', cafeteriaAccessType: '', cafeteriaSizeSqft: '', hvacSystemType: '', 
    maxFloorLoadKgPerSqm: '', loadingDockCount: '', hasFreightElevator: false,
    hasPipedGas: false, hasCctvSurveillance: false, kitchenType: '', numberOfKitchens: '', hasIntercom: false, hasWatchmanRoom: false, defectLiabilityPeriod: ''
  });
  const [regions, setRegions] = useState([]);
  const [mapVisible, setMapVisible] = useState({});
  const [galleryModalImages, setGalleryModalImages] = useState(null);
  const [galleryModalIndex, setGalleryModalIndex] = useState(0);
  const [activeModalTab, setActiveModalTab] = useState('BASIC'); // BASIC, DETAILS, SPECIFICS, IMAGES
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Pagination & Filters
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [minPriceFilter, setMinPriceFilter] = useState('');
  const [maxPriceFilter, setMaxPriceFilter] = useState('');

  const toggleMap = (id) => {
    setMapVisible(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openGallery = (images) => {
    if (images && images.length > 0) {
      setGalleryModalImages(images);
      setGalleryModalIndex(0);
    }
  };

  const closeGallery = () => {
    setGalleryModalImages(null);
  };

  const nextImage = () => setGalleryModalIndex((prev) => (prev + 1) % galleryModalImages.length);
  const prevImage = () => setGalleryModalIndex((prev) => (prev - 1 + galleryModalImages.length) % galleryModalImages.length);

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProperties();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, searchTerm, typeFilter, regionFilter, minPriceFilter, maxPriceFilter]);

  const fetchRegions = async () => {
    try {
      const res = await api.get('/admin/regions');
      setRegions(res.data);
    } catch (err) {
      console.error("Failed to fetch regions", err);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: currentPage, size: 9 });
      if (typeFilter) params.append('type', typeFilter);
      if (regionFilter) params.append('regionId', regionFilter);
      if (minPriceFilter) params.append('minPrice', minPriceFilter);
      if (maxPriceFilter) params.append('maxPrice', maxPriceFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await api.get(`/admin/properties?${params.toString()}`);
      // Fallback for when backend hasn't updated to Page<Property> yet
      setProperties(res.data.content || (Array.isArray(res.data) ? res.data : []));
      setTotalPages(res.data.totalPages || 1);
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

  const handleSave = (e) => {
    e.preventDefault();
    showConfirm("Confirm Save", "Are you sure you want to save this property?", async () => {
      const cleanData = { ...formData };
      for (const key in cleanData) {
        if (cleanData[key] === '') cleanData[key] = null;
      }
      if (cleanData.region && !cleanData.region.id) {
        cleanData.region = null;
      }
      
      const isRes = cleanData.type === 'VILLA' || cleanData.type === 'APARTMENT' || cleanData.type === 'Villa' || cleanData.type === 'Apartment';
      if (isRes) {
        delete cleanData.zoningType;
        delete cleanData.cafeteriaAccessType;
        delete cleanData.cafeteriaSizeSqft;
        delete cleanData.hvacSystemType;
        delete cleanData.maxFloorLoadKgPerSqm;
        delete cleanData.loadingDockCount;
        delete cleanData.hasFreightElevator;
        delete cleanData.hasWatchmanRoom;
      } else {
        delete cleanData.numberOfBedrooms;
        delete cleanData.numberOfBathrooms;
        delete cleanData.furnishingStatus;
        delete cleanData.petPolicy;
        delete cleanData.hasMaidsRoom;
        delete cleanData.kitchenType;
        delete cleanData.numberOfKitchens;
        delete cleanData.hasIntercom;
      }
      
      try {
        if (editingId) {
          await api.put(`/admin/properties/${editingId}`, cleanData);
        } else {
          await api.post('/admin/properties', cleanData);
        }
        setShowModal(false);
        fetchProperties();
      } catch (err) {
        showAlert("Error", "Failed to save property");
      }
    });
  };

  const handleDelete = (id) => {
    showConfirm("Confirm Delete", "Are you sure you want to delete this property?", async () => {
      try {
        await api.delete(`/admin/properties/${id}`);
        fetchProperties();
      } catch (err) {
        showAlert("Error", "Failed to delete property");
      }
    });
  };

  const handleToggleStatus = (prop, newStatus) => {
    showConfirm("Change Status", `Are you sure you want to change the status to ${newStatus}?`, async () => {
      try {
        const updatedProp = { ...prop, status: newStatus };
        await api.put(`/admin/properties/${prop.id}`, updatedProp);
        fetchProperties();
      } catch (err) {
        showAlert("Error", "Failed to update status");
      }
    });
  };

  const openModal = (prop = null) => {
    setActiveModalTab('BASIC');
    if (prop) {
      setEditingId(prop.id);
      
      const filledImageUrls = [...(prop.imageUrls || [])];
      while (filledImageUrls.length < 5) filledImageUrls.push('');
      
      setFormData({ 
        ...prop, 
        imageUrls: filledImageUrls,
        region: prop.region ? { id: prop.region.id } : null 
      });
    } else {
      setEditingId(null);
      setFormData({ 
        title: '', description: '', price: '', type: 'APARTMENT', lat: '', lng: '', region: null, 
        imageUrls: ['', '', '', '', ''],
        status: 'AVAILABLE', buildDate: '', fireSafetyCompliance: false, pestControlDone: false,
        squareFootage: '', parkingSpaces: '',
        powerBackupType: '', fireSafetyComplianceDate: '', lastPestControlDate: '', 
        numberOfLifts: '', waterStorageCapacityLiters: '', parkingAreaCapacity: '', 
        numberOfBalconies: '', poolAccessType: '', poolSizeSqft: '', terraceAccessType: '', 
        terraceAreaSqft: '', garageOutletAccessType: '', garageOutletCapacityVa: '',
        numberOfBedrooms: '', numberOfBathrooms: '', furnishingStatus: '', petPolicy: '', hasMaidsRoom: false,
        zoningType: '', cafeteriaAccessType: '', cafeteriaSizeSqft: '', hvacSystemType: '', 
        maxFloorLoadKgPerSqm: '', loadingDockCount: '', hasFreightElevator: false,
        hasPipedGas: false, hasCctvSurveillance: false, kitchenType: '', numberOfKitchens: '', hasIntercom: false, hasWatchmanRoom: false, defectLiabilityPeriod: ''
      });
    }
    setShowModal(true);
  };

  const handleImageUrlChange = (index, value) => {
    const newUrls = [...formData.imageUrls];
    newUrls[index] = value;
    setFormData({ ...formData, imageUrls: newUrls });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 space-y-4 md:space-y-0">
        <h2 className="text-xl font-bold text-gray-900">Manage Properties</h2>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search properties..." 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500 w-full sm:w-48"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
          />
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Types</option>
            <option value="Villa">Villa</option>
            <option value="Apartment">Apartment</option>
            <option value="Commercial">Commercial</option>
          </select>
          <select 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500"
            value={regionFilter}
            onChange={(e) => { setRegionFilter(e.target.value); setCurrentPage(0); }}
          >
            <option value="">All Regions</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input 
            type="number" 
            placeholder="Min Price" 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500 w-24"
            value={minPriceFilter}
            onChange={(e) => { setMinPriceFilter(e.target.value); setCurrentPage(0); }}
          />
          <input 
            type="number" 
            placeholder="Max Price" 
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-primary-500 w-24"
            value={maxPriceFilter}
            onChange={(e) => { setMaxPriceFilter(e.target.value); setCurrentPage(0); }}
          />
          <button onClick={() => openModal()} className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition whitespace-nowrap">
            <Plus size={16} className="mr-2" /> Add Property
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading properties...</div>
      ) : (
        <>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 bg-gray-50">
            {properties.map(p => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition duration-200 flex flex-col">
                
                <div className="h-48 w-full bg-gray-200 relative shrink-0">
                  {p.imageUrls && p.imageUrls.length > 0 && p.imageUrls[0] ? (
                    <img src={p.imageUrls[0]} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-sm font-medium">No Image Provided</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-gray-50 flex items-center justify-between border-b border-gray-100 px-5">
                  <button onClick={() => toggleMap(p.id)} className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-800 transition">
                    <MapPin size={16} className="mr-1" />
                    {mapVisible[p.id] ? 'Hide Map' : 'View Map'}
                  </button>
                  {p.imageUrls && p.imageUrls.length > 1 && (
                    <button onClick={() => openGallery(p.imageUrls)} className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-800 transition">
                      <ImageIcon size={16} className="mr-1" />
                      View Gallery
                    </button>
                  )}
                </div>

                {mapVisible[p.id] && p.lat && p.lng && (
                  <div className="h-48 w-full bg-gray-200 relative shrink-0 border-b border-gray-200">
                    <iframe 
                      title={`map-${p.id}`}
                      width="100%" 
                      height="100%" 
                      frameBorder="0" 
                      src={`https://maps.google.com/maps?q=${p.lat},${p.lng}&hl=en&z=14&output=embed`}
                      className="block"
                    ></iframe>
                  </div>
                )}

                <div className="p-5 flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1 pr-2" title={p.title}>{p.title}</h3>
                    <div className="flex space-x-2 shrink-0">
                      {p.status === 'AVAILABLE' && (
                        <button onClick={() => handleToggleStatus(p, 'DELISTED')} title="Delist Property" className="text-orange-600 hover:text-orange-800 bg-orange-50 hover:bg-orange-100 p-1.5 rounded transition"><EyeOff size={16}/></button>
                      )}
                      {p.status === 'DELISTED' && (
                        <button onClick={() => handleToggleStatus(p, 'AVAILABLE')} title="List Property" className="text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 p-1.5 rounded transition"><Eye size={16}/></button>
                      )}
                      {p.status === 'SOLD' && (
                        <button onClick={() => handleToggleStatus(p, 'AVAILABLE')} title="Mark as Available" className="text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-200 p-1.5 rounded transition"><CheckCircle size={16} className="text-green-600" /></button>
                      )}
                      <button onClick={() => openModal(p)} className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded transition"><Edit size={16}/></button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded transition"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4 h-10" title={p.description}>
                    {p.description || <span className="italic text-gray-400">No description provided.</span>}
                  </p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {p.type}
                      </span>
                      {p.status && p.status !== 'AVAILABLE' && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.status === 'SOLD' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-orange-100 text-orange-800 border border-orange-200'}`}>
                          {p.status}
                        </span>
                      )}
                    </div>
                    <span className="text-xl font-extrabold text-gray-900">₹{p.price?.toLocaleString() || 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4 mt-2">
                    <span className="flex items-center font-medium">
                      <MapPin size={16} className="mr-1.5 text-gray-400" />
                      {p.region?.name || 'Unassigned Region'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {properties.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-lg font-medium text-gray-900 mb-1">No properties found</p>
                <p>Click "Add Property" to create your first listing.</p>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-100">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingId ? 'Edit Property' : 'Add Property'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex space-x-2 border-b border-gray-200 mb-6 overflow-x-auto pb-1 shrink-0">
              {['BASIC', 'DETAILS', 'SPECIFICS', 'IMAGES'].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveModalTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors whitespace-nowrap ${activeModalTab === tab ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
                >
                  {tab.charAt(0) + tab.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {activeModalTab === 'BASIC' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Title</label>
                    <input type="text" placeholder="Title" required className="w-full border rounded p-2" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                    <textarea placeholder="Description" className="w-full border rounded p-2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Price (₹)</label>
                    <input type="number" placeholder="Price" required className="w-full border rounded p-2" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                  </div>
                  <div className="flex space-x-4">
                    <div className="w-1/2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Property Type</label>
                      <select className="w-full border rounded p-2" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                        <option value="">Select Type</option>
                        <option value="Villa">Villa</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>
                    <div className="w-1/2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Region</label>
                      <select className="w-full border rounded p-2" value={formData.region?.id || ''} onChange={e => setFormData({...formData, region: { id: e.target.value }})}>
                        <option value="">Select Region</option>
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-4 items-end">
                    <div className="w-1/3">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Latitude</label>
                      <input type="text" placeholder="Latitude" className="w-full border rounded p-2" value={formData.lat || ''} onChange={e => setFormData({...formData, lat: e.target.value})} />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Longitude</label>
                      <input type="text" placeholder="Longitude" className="w-full border rounded p-2" value={formData.lng || ''} onChange={e => setFormData({...formData, lng: e.target.value})} />
                    </div>
                    <div className="w-1/3">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
                      <select className="w-full border rounded p-2" value={formData.status || 'AVAILABLE'} onChange={e => setFormData({...formData, status: e.target.value})}>
                        <option value="AVAILABLE">Available</option>
                        <option value="DELISTED">Delisted</option>
                        <option value="SOLD">Sold</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <button 
                      type="button" 
                      onClick={() => setShowLocationPicker(!showLocationPicker)}
                      className="text-sm flex items-center space-x-1 text-primary-600 hover:text-primary-800"
                    >
                      <MapPin size={16} />
                      <span>{showLocationPicker ? 'Hide Map Picker' : 'Select Location on Map'}</span>
                    </button>
                    {showLocationPicker && (
                      <div className="mt-2 h-[300px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
                        <MapContainer 
                          center={formData.lat && formData.lng ? [parseFloat(formData.lat), parseFloat(formData.lng)] : [19.0760, 72.8777]} 
                          zoom={formData.lat && formData.lng ? 15 : 5} 
                          className="h-full w-full"
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                          />
                          <LocationPickerMap 
                            lat={formData.lat} 
                            lng={formData.lng} 
                            onLocationSelect={(lat, lng) => setFormData({...formData, lat: lat.toFixed(6), lng: lng.toFixed(6)})} 
                          />
                        </MapContainer>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeModalTab === 'DETAILS' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Square Footage</label>
                      <input type="number" placeholder="Square Footage" className="w-full border rounded p-2" value={formData.squareFootage || ''} onChange={e => setFormData({...formData, squareFootage: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Parking Spaces</label>
                      <input type="number" placeholder="Parking Spaces" className="w-full border rounded p-2" value={formData.parkingSpaces || ''} onChange={e => setFormData({...formData, parkingSpaces: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Build/Construction Date</label>
                      <input type="date" className="w-full border rounded p-2" value={formData.buildDate || ''} onChange={e => setFormData({...formData, buildDate: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Power Backup Type</label>
                      <input type="text" placeholder="e.g. Partial, Full" className="w-full border rounded p-2" value={formData.powerBackupType || ''} onChange={e => setFormData({...formData, powerBackupType: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Number of Lifts</label>
                      <input type="number" placeholder="Lifts" className="w-full border rounded p-2" value={formData.numberOfLifts || ''} onChange={e => setFormData({...formData, numberOfLifts: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Water Storage (Liters)</label>
                      <input type="number" placeholder="Liters" className="w-full border rounded p-2" value={formData.waterStorageCapacityLiters || ''} onChange={e => setFormData({...formData, waterStorageCapacityLiters: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Defect Liability Period</label>
                      <input type="text" placeholder="e.g. 5 Years" className="w-full border rounded p-2" value={formData.defectLiabilityPeriod || ''} onChange={e => setFormData({...formData, defectLiabilityPeriod: e.target.value})} />
                    </div>
                    <div className="flex flex-col justify-end">
                      <label className="flex items-center space-x-2 text-sm text-gray-700 py-2">
                        <input type="checkbox" checked={formData.hasPipedGas || false} onChange={e => setFormData({...formData, hasPipedGas: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                        <span>Has Piped Gas</span>
                      </label>
                    </div>
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center space-x-2 text-sm text-gray-700 py-2">
                        <input type="checkbox" checked={formData.hasCctvSurveillance || false} onChange={e => setFormData({...formData, hasCctvSurveillance: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                        <span>Has CCTV Surveillance</span>
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 items-start pt-2 border-t border-gray-100">
                    <div>
                      <label className="flex items-center space-x-2 text-sm text-gray-700 mb-2">
                        <input type="checkbox" checked={formData.fireSafetyCompliance || false} onChange={e => setFormData({...formData, fireSafetyCompliance: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                        <span>Fire Safety Compliant</span>
                      </label>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Compliance Cert. Date</label>
                      <input type="date" className="w-full border rounded p-2 disabled:bg-gray-100 disabled:opacity-50" value={formData.fireSafetyComplianceDate || ''} onChange={e => setFormData({...formData, fireSafetyComplianceDate: e.target.value})} disabled={!formData.fireSafetyCompliance} />
                    </div>
                    <div>
                      <label className="flex items-center space-x-2 text-sm text-gray-700 mb-2">
                        <input type="checkbox" checked={formData.pestControlDone || false} onChange={e => setFormData({...formData, pestControlDone: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                        <span>Pest Control Done</span>
                      </label>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Last Pest Control Date</label>
                      <input type="date" className="w-full border rounded p-2 disabled:bg-gray-100 disabled:opacity-50" value={formData.lastPestControlDate || ''} onChange={e => setFormData({...formData, lastPestControlDate: e.target.value})} disabled={!formData.pestControlDone} />
                    </div>
                  </div>
                </div>
              )}

              {activeModalTab === 'SPECIFICS' && (
                <div className="space-y-4">
                  {(!formData.type || formData.type === '') && (
                    <p className="text-gray-500 italic text-sm">Please select a property type in the Basic tab first.</p>
                  )}
                  {(formData.type === 'VILLA' || formData.type === 'APARTMENT' || formData.type === 'Villa' || formData.type === 'Apartment') && (
                    <div className="border-t pt-4 mt-4 border-gray-100">
                      <h4 className="font-bold text-gray-700 mb-4">Residential Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bedrooms</label>
                          <input type="number" placeholder="Bedrooms" className="w-full border rounded p-2" value={formData.numberOfBedrooms || ''} onChange={e => setFormData({...formData, numberOfBedrooms: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bathrooms</label>
                          <input type="number" step="0.5" placeholder="Bathrooms" className="w-full border rounded p-2" value={formData.numberOfBathrooms || ''} onChange={e => setFormData({...formData, numberOfBathrooms: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Furnishing Status</label>
                          <select className="w-full border rounded p-2" value={formData.furnishingStatus || ''} onChange={e => setFormData({...formData, furnishingStatus: e.target.value})}>
                            <option value="">Furnishing Status</option>
                            <option value="FULLY_FURNISHED">Fully Furnished</option>
                            <option value="SEMI_FURNISHED">Semi Furnished</option>
                            <option value="UNFURNISHED">Unfurnished</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Pet Policy</label>
                          <select className="w-full border rounded p-2" value={formData.petPolicy || ''} onChange={e => setFormData({...formData, petPolicy: e.target.value})}>
                            <option value="">Pet Policy</option>
                            <option value="ALLOWED">Allowed</option>
                            <option value="RESTRICTED_SIZE">Restricted Size</option>
                            <option value="PROHIBITED">Prohibited</option>
                          </select>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center space-x-2 text-sm text-gray-700 py-2">
                            <input type="checkbox" checked={formData.hasMaidsRoom || false} onChange={e => setFormData({...formData, hasMaidsRoom: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                            <span>Has Maid's Room</span>
                          </label>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center space-x-2 text-sm text-gray-700 py-2">
                            <input type="checkbox" checked={formData.hasIntercom || false} onChange={e => setFormData({...formData, hasIntercom: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                            <span>Has Intercom</span>
                          </label>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Number of Kitchens</label>
                          <input type="number" placeholder="Number of Kitchens" className="w-full border rounded p-2" value={formData.numberOfKitchens || ''} onChange={e => setFormData({...formData, numberOfKitchens: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Kitchen Type</label>
                          <select className="w-full border rounded p-2" value={formData.kitchenType || ''} onChange={e => setFormData({...formData, kitchenType: e.target.value})}>
                            <option value="">Kitchen Type</option>
                            <option value="MODULAR">Modular</option>
                            <option value="SEMI_MODULAR">Semi-Modular</option>
                            <option value="STANDARD">Standard</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {(formData.type === 'COMMERCIAL' || formData.type === 'Commercial') && (
                    <div className="border-t pt-4 mt-4 border-gray-100">
                      <h4 className="font-bold text-gray-700 mb-4">Commercial Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Zoning Type</label>
                          <select className="w-full border rounded p-2" value={formData.zoningType || ''} onChange={e => setFormData({...formData, zoningType: e.target.value})}>
                            <option value="">Zoning Type</option>
                            <option value="RETAIL">Retail</option>
                            <option value="OFFICE">Office</option>
                            <option value="INDUSTRIAL">Industrial</option>
                            <option value="MIXED_USE">Mixed Use</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">HVAC System</label>
                          <select className="w-full border rounded p-2" value={formData.hvacSystemType || ''} onChange={e => setFormData({...formData, hvacSystemType: e.target.value})}>
                            <option value="">HVAC System</option>
                            <option value="CENTRALIZED">Centralized</option>
                            <option value="DECENTRALIZED">Decentralized</option>
                            <option value="NONE">None</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Max Floor Load (kg/sqm)</label>
                          <input type="number" placeholder="Max Floor Load" className="w-full border rounded p-2" value={formData.maxFloorLoadKgPerSqm || ''} onChange={e => setFormData({...formData, maxFloorLoadKgPerSqm: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Loading Docks</label>
                          <input type="number" placeholder="Loading Docks" className="w-full border rounded p-2" value={formData.loadingDockCount || ''} onChange={e => setFormData({...formData, loadingDockCount: e.target.value})} />
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center space-x-2 text-sm text-gray-700 py-2">
                            <input type="checkbox" checked={formData.hasFreightElevator || false} onChange={e => setFormData({...formData, hasFreightElevator: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                            <span>Has Freight Elevator</span>
                          </label>
                        </div>
                        <div className="flex flex-col justify-end">
                          <label className="flex items-center space-x-2 text-sm text-gray-700 py-2">
                            <input type="checkbox" checked={formData.hasWatchmanRoom || false} onChange={e => setFormData({...formData, hasWatchmanRoom: e.target.checked})} className="rounded text-primary-600 focus:ring-primary-500" />
                            <span>Has Watchman Room</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeModalTab === 'IMAGES' && (
                <div className="space-y-4">
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Property Images (Up to 5 URLs)</label>
                    <div className="space-y-2">
                      {[0, 1, 2, 3, 4].map(idx => (
                        <input 
                          key={idx}
                          type="url" 
                          placeholder={`Image URL ${idx + 1}`} 
                          className="w-full border rounded p-2 text-sm" 
                          value={formData.imageUrls[idx]} 
                          onChange={e => handleImageUrlChange(idx, e.target.value)} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Modal */}
      {galleryModalImages && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4 sm:p-8 backdrop-blur-sm">
          <button onClick={closeGallery} className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-40 text-white rounded-full w-12 h-12 flex items-center justify-center z-10 transition text-2xl">
            &#x2715;
          </button>
          
          <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center bg-black bg-opacity-50 rounded-2xl p-4 shadow-2xl overflow-hidden">
            {galleryModalImages.length > 1 && (
              <button onClick={prevImage} className="absolute left-4 bg-black bg-opacity-60 hover:bg-opacity-90 text-white w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full transition z-20 backdrop-blur-md text-2xl sm:text-3xl pb-1 shadow-lg">
                &#x276E;
              </button>
            )}
            
            <img 
              src={galleryModalImages[galleryModalIndex]} 
              alt={`Gallery Image ${galleryModalIndex + 1}`} 
              className="w-full h-full object-contain animate-fade-in"
            />

            {galleryModalImages.length > 1 && (
              <button onClick={nextImage} className="absolute right-4 bg-black bg-opacity-60 hover:bg-opacity-90 text-white w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full transition z-20 backdrop-blur-md text-2xl sm:text-3xl pb-1 shadow-lg">
                &#x276F;
              </button>
            )}
            
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 backdrop-blur-md text-white px-5 py-2 rounded-full text-sm font-bold tracking-widest">
              {galleryModalIndex + 1} / {galleryModalImages.length}
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
