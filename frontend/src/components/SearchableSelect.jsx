import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export default function SearchableSelect({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select...", 
  className = "",
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  // Find the selected option's label
  const selectedOption = options.find(opt => String(opt.value) === String(value));
  
  useEffect(() => {
    // If closed, reset search to the selected label (if any)
    if (!isOpen) {
      setSearch(selectedOption ? selectedOption.label : '');
    }
  }, [isOpen, selectedOption]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label && opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div 
        className={`flex items-center w-full border border-gray-300 rounded-lg px-3 py-2 bg-white ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'cursor-text focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 hover:border-gray-400'} transition-colors`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        {/* We use an input so the user can type to search */}
        <input
          type="text"
          className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
          placeholder={placeholder}
          value={isOpen ? search : (selectedOption ? selectedOption.label : '')}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={(e) => {
            setIsOpen(true);
            setSearch(''); // Clear search on focus for easy typing
            e.target.select();
          }}
          disabled={disabled}
        />
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${String(value) === String(opt.value) ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
              >
                {opt.display || opt.label}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center flex flex-col items-center">
              <Search size={16} className="text-gray-300 mb-1" />
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
