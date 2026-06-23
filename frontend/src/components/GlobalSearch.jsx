import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Search, Building2, Users, Briefcase, ChevronRight, X } from 'lucide-react';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/search?query=${query}`);
      setResults(res.data);
      setShowDropdown(true);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setShowDropdown(false);
  };

  const hasResults = results && (results.customers?.length > 0 || results.properties?.length > 0 || results.employees?.length > 0);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all shadow-sm"
          placeholder="Global Search (Customers, Properties, Employees)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length > 0) setShowDropdown(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setShowDropdown(true);
          }}
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600 focus:outline-none">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {showDropdown && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          ) : hasResults ? (
            <div className="py-2">
              {results.customers?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80 flex items-center">
                    <Users size={14} className="mr-2" /> Customers
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {results.customers.map(c => (
                      <li key={`cust-${c.id}`} className="px-4 py-3 hover:bg-primary-50 cursor-pointer transition-colors group">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-500">{c.email} • {c.phone}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500" />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {results.properties?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80 flex items-center">
                    <Building2 size={14} className="mr-2" /> Properties
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {results.properties.map(p => (
                      <li key={`prop-${p.id}`} className="px-4 py-3 hover:bg-primary-50 cursor-pointer transition-colors group">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.title}</p>
                            <p className="text-xs text-gray-500">${p.price?.toLocaleString()} • {p.type}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500" />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {results.employees?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50/80 flex items-center">
                    <Briefcase size={14} className="mr-2" /> Employees
                  </div>
                  <ul className="divide-y divide-gray-50">
                    {results.employees.map(e => (
                      <li key={`emp-${e.id}`} className="px-4 py-3 hover:bg-primary-50 cursor-pointer transition-colors group">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{e.name}</p>
                            <p className="text-xs text-gray-500">{e.role} • {e.email}</p>
                          </div>
                          <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500" />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
