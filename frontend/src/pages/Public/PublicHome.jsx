import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, MapPin, Building, Ruler, Calendar, Star, IndianRupee, ShieldCheck, Zap, Video, Home, ArrowRight, User, X, CheckCircle, ChevronRight, Lock, KeyRound, ArrowLeft, Send, Filter, SlidersHorizontal } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import Pagination from '../../components/Pagination';
import { Link } from 'react-router-dom';
import LeafletMapPreview from '../../components/LeafletMapPreview';
import { Image as ImageIcon, ChevronLeft, Navigation } from 'lucide-react';

export default function PublicHome() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsProperty, setDetailsProperty] = useState(null);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);

  const [customerToken, setCustomerToken] = useState(localStorage.getItem('customerToken'));
  const [customerInfo, setCustomerInfo] = useState(JSON.parse(localStorage.getItem('customerInfo') || 'null'));

  // Form State
  const [modalMode, setModalMode] = useState('login'); // 'login' or 'signup'
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', preferredLocation: '', propertyType: '', password: '' });
  
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', onConfirm: null });

  const showAlert = (title, message) => {
    setConfirmConfig({ isOpen: true, title, message, type: 'alert', onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false })) });
  };
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  // Pagination & Filter State
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState(''); 
  
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  const [tempType, setTempType] = useState('ALL');
  const [tempSortBy, setTempSortBy] = useState('');

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('size', 6);
      if (search) params.append('search', search);
      if (filterType !== 'ALL') params.append('type', filterType);
      if (filterMinPrice) params.append('minPrice', filterMinPrice);
      if (filterMaxPrice) params.append('maxPrice', filterMaxPrice);
      if (sortBy) params.append('sort', sortBy);

      const res = await api.get('/public/properties', { params });
      if (res.data && res.data.content) {
         setProperties(res.data.content);
         setTotalPages(res.data.totalPages);
      } else {
         setProperties(Array.isArray(res.data) ? res.data : []);
         setTotalPages(1);
      }
    } catch (err) {
      console.error("Failed to fetch properties:", err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [currentPage, search, filterType, filterMinPrice, filterMaxPrice, sortBy]);

  const handleInterest = async (prop) => {
    setSelectedProperty(prop);
    setFormData(prev => ({ 
        ...prev, 
        preferredLocation: prop.title, 
        propertyType: prop.type,
        name: customerInfo?.name || prev.name,
        email: customerInfo?.email || prev.email,
        phone: customerInfo?.phone || prev.phone
    }));
    
    if (customerToken) {
      try {
         await api.post('/public/express-interest', {
            preferredLocation: prop.title,
            propertyType: prop.type,
            propertyIds: [prop.id]
         }, { headers: { Authorization: `Bearer ${customerToken}` } });
         showAlert("Success", "Interest recorded successfully! Our agent will contact you soon.");
      } catch(err) {
         if (err.response?.status === 401 || err.response?.status === 403 || err.response?.data === 'Invalid OTP or Token') {
            localStorage.removeItem('customerToken');
            localStorage.removeItem('customerInfo');
            setCustomerToken(null);
            setCustomerInfo(null);
            setShowModal(true);
         } else {
            showAlert("Error", "Error: " + (err.response?.data || "Something went wrong"));
         }
      }
    } else {
      setShowModal(true);
      setModalMode('login'); // default to login when they click express interest
      setLoginMethod('password'); // default to password login
      setOtpSent(false);
      setMessage('');
      setOtpCooldown(0);
      setIsSendingOtp(false);
      setFormData(prev => ({...prev, password: ''}));
    }
  };

  const handleSendOtp = async () => {
    if (otpCooldown > 0 || isSendingOtp) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      setMessage('Error: Please enter a valid email address first.');
      return;
    }

    if (modalMode === 'signup') {
      if (!formData.password || formData.password.length < 8 || !/[a-zA-Z]/.test(formData.password) || !/[0-9]/.test(formData.password)) {
        setMessage('Error: Password must be at least 8 characters long and contain both letters and numbers.');
        return;
      }
    }

    setIsSendingOtp(true);
    try {
      setMessage('Sending...');
      await api.post('/public/send-otp', { email: formData.email, phone: formData.phone, type: modalMode });
      setOtpSent(true);
      setMessage('OTP sent to your email!');
      setOtpCooldown(120);
    } catch (err) {
      if (err.response?.data === 'PHONE_EMAIL_MISMATCH') {
        setMessage('Error: Phone number already in use with a different email address.');
      } else if (err.response?.data === 'EMAIL_EXISTS') {
        setMessage('Error: Email ID already exists, please login.');
      } else if (err.response?.data === 'USER_NOT_FOUND') {
        setMessage('Error: Account not found, please sign up.');
      } else {
        setMessage('Failed to send OTP. Please check backend.');
        setOtpCooldown(10);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setMessage('Verifying login...');
      const loginRes = await api.post(`/public/customer/verify-login`, {
         ...formData,
         otp
      });
      
      const token = loginRes.data.token;
      const cust = loginRes.data.customer;
      localStorage.setItem('customerToken', token);
      localStorage.setItem('customerInfo', JSON.stringify(cust));
      setCustomerToken(token);
      setCustomerInfo(cust);

      if (selectedProperty) {
        setMessage('Login successful. Recording interest...');
        await api.post(`/public/express-interest`, {
          ...formData,
          propertyIds: [selectedProperty.id]
        }, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Interest recorded successfully!');
      } else {
        setMessage('Login successful!');
      }
      setTimeout(() => setShowModal(false), 2000);
    } catch (err) {
      const errorMsg = err.response?.data || 'Invalid OTP or server error.';
      if (typeof errorMsg === 'string') {
        setMessage(`Error: ${errorMsg}`);
      } else {
        setMessage('Error: Invalid OTP or server issue.');
      }
    }
  };

  const handlePasswordLogin = async () => {
    if (!formData.email || !formData.password) {
      setMessage('Error: Email and password are required.');
      return;
    }

    try {
      setMessage('Logging in...');
      const loginRes = await api.post(`/public/customer/login-password`, {
         email: formData.email,
         password: formData.password
      });
      
      const token = loginRes.data.token;
      const cust = loginRes.data.customer;
      localStorage.setItem('customerToken', token);
      localStorage.setItem('customerInfo', JSON.stringify(cust));
      setCustomerToken(token);
      setCustomerInfo(cust);

      if (selectedProperty) {
        setMessage('Login successful. Recording interest...');
        await api.post(`/public/express-interest`, {
          ...formData,
          propertyIds: [selectedProperty.id]
        }, { headers: { Authorization: `Bearer ${token}` } });
        setMessage('Interest recorded successfully!');
      } else {
        setMessage('Login successful!');
      }
      setTimeout(() => setShowModal(false), 2000);
    } catch (err) {
      if (err.response?.data === 'USER_NOT_FOUND') {
        setMessage('Error: Account not found, please sign up.');
      } else if (err.response?.data === 'INVALID_PASSWORD') {
        setMessage('Error: Invalid password.');
      } else {
        setMessage('Error: Login failed.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm h-16 flex items-center justify-between px-8">
        <h1 className="text-2xl font-bold text-primary-600 flex items-center">
          <Home className="mr-2" /> EstateSync
        </h1>
        <div className="flex items-center space-x-6">
          {customerToken && customerInfo ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Hi, {customerInfo.name || customerInfo.email}</span>
              <button onClick={() => { localStorage.removeItem('customerToken'); localStorage.removeItem('customerInfo'); setCustomerToken(null); setCustomerInfo(null); }} className="text-sm text-gray-500 hover:text-red-600 transition">Logout</button>
            </div>
          ) : (
            <button onClick={() => { setShowModal(true); setModalMode('login'); setLoginMethod('password'); setSelectedProperty(null); setOtpSent(false); setMessage(''); setFormData(prev => ({...prev, password: ''})); }} className="text-sm text-gray-600 hover:text-primary-600 font-medium transition">Customer Login</button>
          )}
          <Link to="/login" className="text-gray-600 hover:text-primary-600 font-medium border-l pl-6 border-gray-200">Employee Portal</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Find Your Dream Property
          </h2>
          <p className="mt-4 text-xl text-gray-500">
            Browse our exclusive selection of premium real estate.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 space-y-4 sm:space-y-0">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by title or location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition shadow-sm text-gray-700 font-medium"
            />
          </div>
          <button 
            onClick={() => {
              setTempType(filterType);
              setTempMinPrice(filterMinPrice);
              setTempMaxPrice(filterMaxPrice);
              setTempSortBy(sortBy);
              setShowFilterModal(true);
            }}
            className="flex items-center px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-primary-600 transition shadow-sm w-full sm:w-auto justify-center"
          >
            <Filter size={18} className="mr-2" /> Filters & Sort
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading properties...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((prop) => (
              <div 
                key={prop.id} 
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow flex flex-col cursor-pointer group"
                onClick={() => { setDetailsProperty(prop); setCurrentImageIdx(0); setShowDetailsModal(true); }}
              >
                <div className="h-48 w-full bg-gray-200 relative shrink-0 overflow-hidden">
                  {prop.imageUrls && prop.imageUrls.length > 0 ? (
                    <img src={prop.imageUrls[0]} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <Home size={32} className="mb-2" />
                      <span className="text-sm font-medium">No Image Provided</span>
                    </div>
                  )}
                  {prop.status === 'SOLD' && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-10 pointer-events-none">
                      <div className="border-4 border-red-500 text-red-500 text-4xl font-black px-6 py-2 -rotate-12 tracking-widest uppercase bg-white bg-opacity-90 shadow-2xl rounded-sm">
                        SOLD
                      </div>
                    </div>
                  )}
                  {prop.imageUrls && prop.imageUrls.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none font-medium backdrop-blur-sm">
                      {prop.imageUrls.length} Photos
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{prop.title}</h3>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-primary-50 text-primary-700 mr-2 border border-primary-100">
                      {prop.type}
                    </span>
                    <span className="flex items-center"><MapPin size={14} className="mr-1"/> {prop.region?.name || 'Unassigned Region'}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-2 leading-relaxed">{prop.description}</p>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center text-gray-900 font-extrabold text-xl">
                      <span className="text-primary-600 mr-1">₹</span>
                      {prop.price.toLocaleString()}
                    </div>
                    <span className="text-sm font-medium text-primary-600 group-hover:text-primary-700">View Details ➔</span>
                  </div>
                </div>
              </div>
            ))}
            </div>
            
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Property Details Modal */}
      {showDetailsModal && detailsProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-40 p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-6xl w-full flex flex-col md:flex-row h-[90vh] overflow-hidden shadow-2xl animate-fade-in relative">
            
            <button onClick={() => setShowDetailsModal(false)} className="absolute top-4 right-4 bg-black bg-opacity-50 hover:bg-opacity-80 text-white rounded-full p-2 z-20 transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            {/* Left Side: Images */}
            <div className="w-full md:w-1/2 h-64 md:h-full bg-gray-900 relative group shrink-0 flex items-center justify-center">
              {detailsProperty.imageUrls && detailsProperty.imageUrls.length > 0 ? (
                <>
                  <img 
                    src={detailsProperty.imageUrls[currentImageIdx]} 
                    alt={`${detailsProperty.title} - ${currentImageIdx}`} 
                    className="w-full h-full object-contain" 
                  />
                  {detailsProperty.imageUrls.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIdx(prev => prev === 0 ? detailsProperty.imageUrls.length - 1 : prev - 1); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-80 text-white rounded-full p-2 transition opacity-0 group-hover:opacity-100"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIdx(prev => prev === detailsProperty.imageUrls.length - 1 ? 0 : prev + 1); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-80 text-white rounded-full p-2 transition opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight size={24} />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm">
                        {currentImageIdx + 1} / {detailsProperty.imageUrls.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <Home size={48} className="mb-2" />
                </div>
              )}
            </div>

            {/* Right Side: Details */}
            <div className="w-full md:w-1/2 flex flex-col h-full bg-white relative">
              <div className="overflow-y-auto flex-1 p-6 md:p-8">
                <div className="mb-6 pr-8">
                  <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3 leading-tight">{detailsProperty.title}</h2>
                  <div className="flex items-center flex-wrap gap-3 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-bold bg-primary-50 text-primary-700 border border-primary-200">
                      {detailsProperty.type}
                    </span>
                    <span className="text-gray-600 font-medium flex items-center bg-gray-100 px-3 py-1 rounded-md text-sm">
                      <MapPin size={16} className="mr-1.5"/> {detailsProperty.region?.name || 'Unassigned Region'}
                    </span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 inline-block">
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Asking Price</p>
                    <div className="text-3xl font-black text-primary-700">₹{detailsProperty.price.toLocaleString()}</div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                      <Home size={18} />
                    </span>
                    About this property
                  </h3>
                  <p className="text-gray-600 text-base leading-relaxed whitespace-pre-line bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6">{detailsProperty.description}</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-white border border-gray-100 rounded-xl p-5 shadow-sm mb-6">
                    {detailsProperty.squareFootage != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Total Floor Area (sqft)</p><p className="font-semibold">{detailsProperty.squareFootage}</p></div>
                    )}
                    {detailsProperty.parkingSpaces != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Parking Spaces</p><p className="font-semibold">{detailsProperty.parkingSpaces}</p></div>
                    )}
                    {detailsProperty.buildDate && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Build Year</p><p className="font-semibold">{detailsProperty.buildDate}</p></div>
                    )}
                    {detailsProperty.powerBackupType && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Power Backup</p><p className="font-semibold">{detailsProperty.powerBackupType}</p></div>
                    )}
                    {detailsProperty.numberOfLifts != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Lifts</p><p className="font-semibold">{detailsProperty.numberOfLifts}</p></div>
                    )}
                    {detailsProperty.defectLiabilityPeriod && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Defect Liability</p><p className="font-semibold">{detailsProperty.defectLiabilityPeriod}</p></div>
                    )}
                    {detailsProperty.waterStorageCapacityLiters != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Water Storage</p><p className="font-semibold">{detailsProperty.waterStorageCapacityLiters} L</p></div>
                    )}
                    {detailsProperty.parkingAreaCapacity != null && (detailsProperty.type === 'COMMERCIAL' || detailsProperty.type === 'Commercial') && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Parking Capacity</p><p className="font-semibold">{detailsProperty.parkingAreaCapacity}</p></div>
                    )}
                    {detailsProperty.numberOfBalconies != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Balconies</p><p className="font-semibold">{detailsProperty.numberOfBalconies}</p></div>
                    )}
                    {detailsProperty.poolAccessType && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Pool Access</p><p className="font-semibold">{detailsProperty.poolAccessType}</p></div>
                    )}
                    {detailsProperty.poolSizeSqft != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Pool Size (sqft)</p><p className="font-semibold">{detailsProperty.poolSizeSqft}</p></div>
                    )}
                    {detailsProperty.terraceAccessType && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Terrace Access</p><p className="font-semibold">{detailsProperty.terraceAccessType}</p></div>
                    )}
                    {detailsProperty.terraceAreaSqft != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Terrace Area (sqft)</p><p className="font-semibold">{detailsProperty.terraceAreaSqft}</p></div>
                    )}
                    {detailsProperty.garageOutletAccessType && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Garage Outlet</p><p className="font-semibold">{detailsProperty.garageOutletAccessType}</p></div>
                    )}
                    {detailsProperty.garageOutletCapacityVa != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Garage Outlet VA</p><p className="font-semibold">{detailsProperty.garageOutletCapacityVa} VA</p></div>
                    )}
                    
                    {/* Residential specifics */}
                    {detailsProperty.numberOfBedrooms != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Bedrooms</p><p className="font-semibold">{detailsProperty.numberOfBedrooms}</p></div>
                    )}
                    {detailsProperty.numberOfBathrooms != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Bathrooms</p><p className="font-semibold">{detailsProperty.numberOfBathrooms}</p></div>
                    )}
                    {detailsProperty.furnishingStatus && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Furnishing</p><p className="font-semibold text-sm">{detailsProperty.furnishingStatus.replace('_', ' ')}</p></div>
                    )}
                    {detailsProperty.petPolicy && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Pet Policy</p><p className="font-semibold text-sm">{detailsProperty.petPolicy.replace('_', ' ')}</p></div>
                    )}
                    {detailsProperty.kitchenType && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Kitchen Type</p><p className="font-semibold text-sm">{detailsProperty.kitchenType.replace('_', ' ')}</p></div>
                    )}
                    {detailsProperty.numberOfKitchens != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Kitchens</p><p className="font-semibold">{detailsProperty.numberOfKitchens}</p></div>
                    )}
                    
                    {/* Commercial specifics */}
                    {detailsProperty.zoningType && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Zoning</p><p className="font-semibold">{detailsProperty.zoningType.replace('_', ' ')}</p></div>
                    )}
                    {detailsProperty.hvacSystemType && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">HVAC</p><p className="font-semibold">{detailsProperty.hvacSystemType}</p></div>
                    )}
                    {detailsProperty.maxFloorLoadKgPerSqm != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Max Floor Load</p><p className="font-semibold">{detailsProperty.maxFloorLoadKgPerSqm} kg/sqm</p></div>
                    )}
                    {detailsProperty.cafeteriaAccessType && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Cafeteria Access</p><p className="font-semibold">{detailsProperty.cafeteriaAccessType.replace('_', ' ')}</p></div>
                    )}
                    {detailsProperty.cafeteriaSizeSqft != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Cafeteria Size</p><p className="font-semibold">{detailsProperty.cafeteriaSizeSqft} sqft</p></div>
                    )}
                    {detailsProperty.loadingDockCount != null && (
                      <div><p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Loading Docks</p><p className="font-semibold">{detailsProperty.loadingDockCount}</p></div>
                    )}

                    <div className="col-span-full grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${detailsProperty.fireSafetyCompliance ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm font-medium text-gray-700">Fire Safety {detailsProperty.fireSafetyComplianceDate && `(${detailsProperty.fireSafetyComplianceDate})`}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${detailsProperty.pestControlDone ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm font-medium text-gray-700">Pest Control {detailsProperty.lastPestControlDate && `(${detailsProperty.lastPestControlDate})`}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${detailsProperty.hasPipedGas ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm font-medium text-gray-700">Piped Gas</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${detailsProperty.hasCctvSurveillance ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <span className="text-sm font-medium text-gray-700">CCTV Surveillance</span>
                      </div>
                      {detailsProperty.hasMaidsRoom && (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium text-gray-700">Maid's Room</span>
                        </div>
                      )}
                      {detailsProperty.hasIntercom && (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium text-gray-700">Intercom</span>
                        </div>
                      )}
                      {detailsProperty.hasFreightElevator && (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium text-gray-700">Freight Elevator</span>
                        </div>
                      )}
                      {detailsProperty.hasWatchmanRoom && (
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium text-gray-700">Watchman Room</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {detailsProperty.lat && detailsProperty.lng && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <span className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mr-3">
                          <MapPin size={18} />
                        </span>
                        Location
                      </h3>
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${detailsProperty.lat},${detailsProperty.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                      >
                        <Navigation size={16} className="mr-1.5" />
                        View Directions
                      </a>
                    </div>
                    <div className="h-64 w-full bg-gray-200 rounded-xl overflow-hidden border border-gray-200 shadow-inner">
                      <LeafletMapPreview lat={detailsProperty.lat} lng={detailsProperty.lng} title={detailsProperty.title} />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-5 md:p-6 border-t border-gray-100 bg-white shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)] shrink-0 z-10">
                {detailsProperty.status === 'SOLD' ? (
                  <button 
                    disabled
                    className="w-full bg-gray-300 text-gray-600 font-bold py-3.5 px-10 rounded-xl cursor-not-allowed shadow-inner text-lg flex items-center justify-center"
                  >
                    This property has been sold
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleInterest(detailsProperty);
                    }}
                    className="w-full bg-dark-900 hover:bg-black text-white font-bold py-3.5 px-10 rounded-xl transition shadow-lg hover:shadow-xl text-lg flex items-center justify-center"
                  >
                    Express Interest ➔
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTP Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{selectedProperty ? 'Login / Sign Up to Express Interest' : 'Customer Access'}</h3>
            {selectedProperty && <p className="text-sm text-gray-500 mb-4">You are interested in: {selectedProperty?.title}</p>}
            
            {!otpSent && (
              <div className="flex mb-6 border-b">
                <button 
                  className={`flex-1 py-2 font-medium ${modalMode === 'login' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => { setModalMode('login'); setMessage(''); setOtpSent(false); }}
                >
                  Login
                </button>
                <button 
                  className={`flex-1 py-2 font-medium ${modalMode === 'signup' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                  onClick={() => { setModalMode('signup'); setMessage(''); setOtpSent(false); }}
                >
                  Sign Up
                </button>
              </div>
            )}

            <div className="space-y-4">
              {modalMode === 'login' && !otpSent && (
                <div className="flex mb-4 bg-gray-100 p-1 rounded-lg">
                  <button 
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md ${loginMethod === 'password' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                    onClick={() => { setLoginMethod('password'); setMessage(''); }}
                  >
                    Use Password
                  </button>
                  <button 
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md ${loginMethod === 'otp' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                    onClick={() => { setLoginMethod('otp'); setMessage(''); }}
                  >
                    Use OTP
                  </button>
                </div>
              )}

              {modalMode === 'signup' && (
                <>
                  <input type="text" placeholder="Full Name" className="w-full border rounded-lg p-2" onChange={e => setFormData({...formData, name: e.target.value})} disabled={otpSent} />
                  <input type="tel" placeholder="Phone Number" className="w-full border rounded-lg p-2" onChange={e => setFormData({...formData, phone: e.target.value})} disabled={otpSent} />
                  <input type="password" placeholder="Create Password (min 8 chars, 1 letter, 1 number)" className="w-full border rounded-lg p-2" onChange={e => setFormData({...formData, password: e.target.value})} disabled={otpSent} />
                </>
              )}
              
              <div className="flex space-x-2">
                <input type="email" placeholder="Email Address" className="w-full border rounded-lg p-2" onChange={e => setFormData({...formData, email: e.target.value})} disabled={otpSent} />
                {(modalMode === 'signup' || (modalMode === 'login' && loginMethod === 'otp')) && (
                  <button onClick={handleSendOtp} disabled={otpCooldown > 0 || isSendingOtp || otpSent} className="bg-primary-600 text-white px-4 rounded-lg whitespace-nowrap disabled:opacity-50 hover:bg-primary-700">
                    {isSendingOtp ? 'Sending...' : (otpCooldown > 0 ? `Wait ${otpCooldown}s` : (otpSent ? 'OTP Sent' : 'Send OTP'))}
                  </button>
                )}
              </div>

              {modalMode === 'login' && loginMethod === 'password' && (
                <>
                  <input type="password" placeholder="Enter Password" value={formData.password} className="w-full border rounded-lg p-2" onChange={e => setFormData({...formData, password: e.target.value})} />
                  <button onClick={handlePasswordLogin} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 rounded-lg mt-2">Login</button>
                </>
              )}
              
              {otpSent && (
                <div className="animate-fade-in">
                  <input type="text" placeholder="Enter 6-digit OTP" className="w-full border rounded-lg p-2 mb-4 text-center tracking-widest font-mono text-lg" onChange={e => setOtp(e.target.value)} />
                  <button onClick={handleSubmit} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 rounded-lg">Verify & Submit</button>
                </div>
              )}
              {message && <p className="text-center text-sm font-medium text-primary-600">{message}</p>}
            </div>
            
            <button onClick={() => setShowModal(false)} className="mt-6 w-full text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
          </div>
        </div>
      )}
      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center text-gray-900"><SlidersHorizontal className="mr-2 text-primary-600" /> Filters & Sort</h3>
              <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                <select 
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 font-medium"
                  value={tempType} onChange={e => setTempType(e.target.value)}
                >
                  <option value="ALL">All Types</option>
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="LAND">Land</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                  <span>Price Range</span>
                  <span className="text-primary-600 font-bold">
                    {tempMaxPrice ? `Up to ₹${parseInt(tempMaxPrice).toLocaleString()}` : 'Any'}
                  </span>
                </label>
                
                <input 
                  type="range" 
                  min="0" 
                  max="50000000" 
                  step="500000"
                  value={tempMaxPrice || 50000000}
                  onChange={e => setTempMaxPrice(e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600 mb-4"
                />

                <div className="flex space-x-4">
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 mb-1 block">Min Price (₹)</span>
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 font-medium"
                      value={tempMinPrice} onChange={e => setTempMinPrice(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-gray-500 mb-1 block">Max Price (₹)</span>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 font-medium"
                      value={tempMaxPrice} onChange={e => setTempMaxPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select 
                  className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-gray-700 font-medium"
                  value={tempSortBy} onChange={e => setTempSortBy(e.target.value)}
                >
                  <option value="">Default (Newest First)</option>
                  <option value="price,asc">Price: Low to High</option>
                  <option value="price,desc">Price: High to Low</option>
                  <option value="title,asc">Name: A to Z</option>
                  <option value="title,desc">Name: Z to A</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button 
                  onClick={() => {
                    setTempType('ALL'); setTempMinPrice(''); setTempMaxPrice(''); setTempSortBy('');
                  }}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => {
                    setFilterType(tempType);
                    setFilterMinPrice(tempMinPrice);
                    setFilterMaxPrice(tempMaxPrice);
                    setSortBy(tempSortBy);
                    setCurrentPage(0);
                    setShowFilterModal(false);
                  }}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium shadow-sm transition"
                >
                  Apply Filters
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
