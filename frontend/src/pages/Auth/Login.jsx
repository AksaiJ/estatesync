import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building } from 'lucide-react';

import api from '../../services/api';

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    setIsSendingOtp(true);
    setError('');
    setMessage('Sending OTP...');
    try {
      await api.post('/auth/send-otp', { email });
      setOtpSent(true);
      setMessage('OTP sent to your email.');
    } catch (err) {
      setError(err.response?.data || 'Failed to send OTP. Account might not exist.');
      setMessage('');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    let role;
    if (loginMethod === 'password') {
      role = await login(email, password);
    } else {
      role = await loginWithOtp(email, otp);
    }

    if (role) {
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'MANAGER') navigate('/manager');
      else navigate('/agent');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-primary-100 rounded-full text-primary-600 mb-4">
            <Building size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">EstateSync Portal</h2>
          <p className="text-gray-500 mt-2">Sign in to manage your leads</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">{error}</div>}
        {message && <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 text-sm">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 border focus:ring-primary-500 focus:border-primary-500 outline-none"
              required 
            />
          </div>

          <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md ${loginMethod === 'password' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              onClick={() => { setLoginMethod('password'); setError(''); setMessage(''); }}
            >
              Use Password
            </button>
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-md ${loginMethod === 'otp' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              onClick={() => { setLoginMethod('otp'); setError(''); setMessage(''); }}
            >
              Use OTP
            </button>
          </div>

          {loginMethod === 'password' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 border focus:ring-primary-500 focus:border-primary-500 outline-none"
                required={loginMethod === 'password'} 
              />
            </div>
          )}

          {loginMethod === 'otp' && (
            <div>
              {!otpSent ? (
                <button 
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className="w-full bg-blue-50 text-blue-600 font-medium py-2.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition disabled:opacity-50"
                >
                  {isSendingOtp ? 'Sending...' : 'Send OTP'}
                </button>
              ) : (
                <div className="animate-fade-in">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-digit OTP</label>
                  <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full border-gray-300 rounded-lg p-2.5 bg-gray-50 border focus:ring-primary-500 focus:border-primary-500 outline-none tracking-widest font-mono text-center mb-4"
                    required={loginMethod === 'otp'} 
                  />
                </div>
              )}
            </div>
          )}

          {(loginMethod === 'password' || (loginMethod === 'otp' && otpSent)) && (
            <button 
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition"
            >
              Sign In
            </button>
          )}
        </form>

        <div className="mt-6 text-center border-t border-gray-100 pt-6">
          <button 
            onClick={() => navigate('/')} 
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-600 transition"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Public Homepage
          </button>
        </div>
      </div>
    </div>
  );
}
