import React, { useState } from 'react';
import axios from 'axios';
// import './Register.css'; // Removed: Replaced with Tailwind

function Register() {
  const [accountType, setAccountType] = useState('');
  const [members, setMembers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    familyAccountName: '',
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddMember = () => {
    setMembers([...members, { name: '', email: '' }]);
  };

  const handleMemberChange = (index, field, value) => {
    const updatedMembers = [...members];
    updatedMembers[index][field] = value;
    setMembers(updatedMembers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = 'https://my-node-backend-gold.vercel.app//api/auth/register';

    if (!accountType) {
      alert('Please select an account type.');
      return;
    }

    const formattedAccountType =
      accountType.charAt(0).toUpperCase() + accountType.slice(1).toLowerCase();

    let payload = {
      name: formData.name.trim(), // 🔧 Ensure name is sent
      email: formData.email.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      accountType: formattedAccountType,
    };

    if (formattedAccountType === 'Family') {
      const familyName = formData.familyAccountName.trim();

      try {
        const checkRes = await axios.post('https://my-node-backend-gold.vercel.app//api/auth/check-family', {
          familyAccountName: familyName
        });

        if (checkRes.status === 409) {
          alert("This family account already exists. Please use 'Add Member' option.");
          return;
        }
      } catch (checkErr) {
        if (checkErr.response?.status === 409) {
          alert("This family account already exists. Please use 'Add Member' option.");
          return;
        } else {
          alert("Error checking family account. Try again.");
          return;
        }
      }

      payload.familyAccountName = familyName;
      payload.members = members;
      payload.admin = true;
    }

    console.log('📦 Payload sent to backend:', payload); // ✅ For debug

    try {
      const response = await axios.post(url, payload);

      if (response.status === 200 || response.status === 201) {
        alert('Registration successful!');
      } else {
        alert(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Error:', error);
      alert(
        error.response?.data?.message ||
        'An error occurred during registration.'
      );
    }
  };

  // --- LOGIC ENDS HERE. STYLING CHANGES BELOW ---

  return (
    // Background Container with Ambient Glow
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphism Card */}
      <div className="relative w-full max-w-lg bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400 mb-2">
            Create Account
          </h2>
          <p className="text-slate-500 text-sm">Join us by choosing your account type below</p>
        </div>

        {/* Account Type Selector (Styled as Cards) */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <label 
            className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
              accountType === 'individual' 
                ? 'bg-purple-600/10 border-purple-500 text-purple-400 shadow-lg shadow-purple-900/20' 
                : 'bg-slate-950/30 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <input
              type="radio"
              name="accountType"
              value="individual"
              checked={accountType === 'individual'}
              onChange={() => setAccountType('individual')}
              className="hidden"
            />
            <span className="font-bold text-sm uppercase tracking-wide">Individual User</span>
          </label>

          <label 
            className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
              accountType === 'family' 
                ? 'bg-purple-600/10 border-purple-500 text-purple-400 shadow-lg shadow-purple-900/20' 
                : 'bg-slate-950/30 border-slate-700 text-slate-400 hover:border-slate-600'
            }`}
          >
            <input
              type="radio"
              name="accountType"
              value="family"
              checked={accountType === 'family'}
              onChange={() => setAccountType('family')}
              className="hidden"
            />
            <span className="font-bold text-sm uppercase tracking-wide">Family Account</span>
          </label>
        </div>

        {/* Individual Form */}
        {accountType === 'individual' && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Full Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-300 placeholder:text-slate-600"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-300 placeholder:text-slate-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-300 placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Confirm</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-300 placeholder:text-slate-600"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Create Account
            </button>
          </form>
        )}

        {/* Family Form */}
        {accountType === 'family' && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Admin Name</label>
              <input
                type="text"
                name="name"
                placeholder="Enter admin name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-300 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Family Account Name</label>
              <input
                type="text"
                name="familyAccountName"
                placeholder="e.g. The Smiths"
                value={formData.familyAccountName}
                onChange={handleInputChange}
                required
                className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-300 placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-300 placeholder:text-slate-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-300 placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">Confirm</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-slate-950/50 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-300 placeholder:text-slate-600"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Sign Up as Family
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Register;