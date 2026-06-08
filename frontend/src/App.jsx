import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import FarmerPortal from './components/FarmerPortal';
import AdminPortal from './components/AdminPortal';

function LoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(searchParams.get('register') === 'true');
  
  // Login States
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  
  // Register States
  const [farmerName, setFarmerName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registeredId, setRegisteredId] = useState('');

  useEffect(() => {
    setIsRegister(searchParams.get('register') === 'true');
  }, [searchParams]);

  // If already logged in, redirect
  useEffect(() => {
    const token = localStorage.getItem('sb_auth_token');
    const userJson = localStorage.getItem('sb_user');
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/farmer');
        }
      } catch (e) {
        localStorage.clear();
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id: loginId, password })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        localStorage.setItem('sb_auth_token', data.token);
        localStorage.setItem('sb_user', JSON.stringify(data.user));
        
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/farmer');
        }
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection failed. Please ensure XAMPP is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setRegisteredId('');
    
    try {
      const response = await fetch('api/auth.php?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_name: farmerName,
          email,
          contact_number: contactNumber,
          password: regPassword
        })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess(data.message);
        setRegisteredId(data.farmer_id);
        // Reset inputs
        setFarmerName('');
        setEmail('');
        setContactNumber('');
        setRegPassword('');
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Connection failed. Please ensure XAMPP is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/20">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Sahasra Barath</span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800/60 text-red-200 text-sm rounded-2xl">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-950/50 border border-emerald-800/60 text-emerald-200 rounded-2xl">
            <p className="font-bold text-sm">{success}</p>
            {registeredId && (
              <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">Your Farmer ID</span>
                <span className="font-mono text-lg font-bold text-emerald-400">{registeredId}</span>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">Make sure to save your Farmer ID. Use it or your Email to log in.</p>
          </div>
        )}

        {!isRegister ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <h2 className="text-xl font-bold text-white mb-2">Portal Login</h2>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email or Farmer ID</label>
              <input 
                type="text" required placeholder="e.g. SB-123456 or name@domain.com"
                className="w-full bg-slate-950 text-white border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 outline-none transition"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" required placeholder="••••••••"
                className="w-full bg-slate-950 text-white border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 outline-none transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-2xl tracking-wide transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Enter Portal'}
            </button>

            <p className="text-center text-sm text-slate-400 mt-4">
              Need to register your land?{' '}
              <button 
                type="button" 
                onClick={() => setIsRegister(true)} 
                className="text-emerald-400 font-semibold hover:underline"
              >
                Create an Account
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5">
            <h2 className="text-xl font-bold text-white mb-2">Farmer Registration</h2>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <input 
                type="text" required placeholder="John Doe"
                className="w-full bg-slate-950 text-white border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 outline-none transition"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input 
                type="email" required placeholder="john@example.com"
                className="w-full bg-slate-950 text-white border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 outline-none transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contact Number</label>
              <input 
                type="text" required placeholder="e.g. +91 98765 43210"
                className="w-full bg-slate-950 text-white border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 outline-none transition"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input 
                type="password" required placeholder="••••••••"
                className="w-full bg-slate-950 text-white border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl px-4 py-3 outline-none transition"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-2xl tracking-wide transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Submit Registration'}
            </button>

            <p className="text-center text-sm text-slate-400 mt-4">
              Already registered?{' '}
              <button 
                type="button" 
                onClick={() => setIsRegister(false)} 
                className="text-emerald-400 font-semibold hover:underline"
              >
                Log In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// Simple Route Protection
function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('sb_auth_token');
  const userJson = localStorage.getItem('sb_user');
  
  if (!token || !userJson) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const user = JSON.parse(userJson);
    if (role && user.role !== role) {
      return <Navigate to="/login" replace />;
    }
    return children;
  } catch (e) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route 
          path="/farmer" 
          element={
            <ProtectedRoute role="farmer">
              <FarmerPortal />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute role="admin">
              <AdminPortal />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
}
