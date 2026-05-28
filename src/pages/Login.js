import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState('individual');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const getUsername = (email) => {
    if (typeof email !== 'string') return '';
    const atIndex = email.indexOf('@');
    return atIndex !== -1 ? email.slice(0, atIndex) : email;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('https://my-node-backend-gold.vercel.app/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, accountType: userType }),
      });

      const result = await res.json();
      console.log('Login response:', result);

      if (!res.ok) {
        throw new Error(result.message || 'Login failed');
      }

      const user = result.user;
      if (!user || !user.email || !user.accountType) {
        throw new Error('Invalid user data received from server.');
      }

      const username = getUsername(user.email);
      const serverType = user.accountType.toLowerCase();
      const selectedType = userType.toLowerCase();

      if (serverType !== selectedType) {
        if (serverType === 'individual') {
          alert('You are registered as an Individual. Please select Individual to login.');
        } else if (serverType === 'family') {
          alert('You are registered as a Family user. Please select Family to login.');
        } else {
          alert('Unknown account type.');
        }
        return;
      }

      // Navigate based on user type
      if (serverType === 'individual') {
        alert(`Welcome ${username}, you are logging in as Individual.`);
        navigate('/dashboard', { state: { username ,email:user.email } });
      } else if (serverType === 'family') {
        const isAdmin = user.admin === true || user.admin === 'true';
       if (isAdmin) {
          alert(`Welcome ${username}, you are logging in as Family Admin.`);

          // ✅ Save to localStorage
          localStorage.setItem("userEmail", user.email);
          localStorage.setItem("familyName", user.familyName);

          navigate('/dashboard-family', {
            state: {
              username: user.username,
              email: user.email,
              familyName: user.familyAccountName,
              admin: true,
            },
          });
        } else {
          alert(`Welcome ${username}, you are logging in as Family Member.`);
          localStorage.setItem("userEmail", user.email);
          localStorage.setItem("familyName", user.familyAccountName);
          navigate('/dashboard-family', {
            state: {
              username,
              email: user.email,
              familyName: user.familyAccountName,
              admin: false,
            },
          });
        }
      } else {
        throw new Error('Unknown account type.');
      }

    } catch (err) {
      console.error('Login Error:', err);
      setError(err.message);
    }
  };

  // --- LOGIC ENDS HERE, ONLY STYLING CHANGES BELOW ---

  return (
    // Background Container with Ambient Glow
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphism Card */}
      <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-2">
            Welcome Back
          </h2>
          <p className="text-slate-500 text-sm">
            Sign in to access your dashboard
          </p>
        </div>

        {email && (
          <div className="mb-6 bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl flex flex-col items-center">
             <span className="text-xs text-purple-400 uppercase tracking-wider font-semibold">Current User</span>
             <p className="text-slate-200 font-medium">{getUsername(email)}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center justify-center">
            <p className="text-red-400 text-sm font-medium">{error}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleLogin}>
          
          {/* Email Input */}
          <div className="space-y-2">
            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3.5 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 placeholder:text-slate-600"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3.5 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 placeholder:text-slate-600"
            />
          </div>

          {/* Radio Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <label 
              className={`cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition-all duration-200 ${
                userType === 'individual' 
                  ? 'bg-purple-600/10 border-purple-500 text-purple-400' 
                  : 'bg-slate-950/30 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                value="individual"
                checked={userType === 'individual'}
                onChange={() => setUserType('individual')}
                className="hidden" // Hiding the default radio, styling the label container instead
              />
              <span className="font-medium text-sm">Individual</span>
            </label>

            <label 
              className={`cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition-all duration-200 ${
                userType === 'family' 
                  ? 'bg-purple-600/10 border-purple-500 text-purple-400' 
                  : 'bg-slate-950/30 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <input
                type="radio"
                value="family"
                checked={userType === 'family'}
                onChange={() => setUserType('family')}
                className="hidden"
              />
              <span className="font-medium text-sm">Family</span>
            </label>
          </div>

          {/* Login Button */}
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Login
          </button>

          {/* Register Link */}
          <p className="text-center text-slate-500 text-sm mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold hover:underline transition-colors">
              Create Account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;