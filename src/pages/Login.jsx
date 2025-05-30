import { useState, useContext } from 'react';
import { supabase } from '../utils/Supabase';
import { useNavigate } from 'react-router-dom';
import logo from '/logo.png';
import { AuthContext } from '../context/AuthContext';

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // 1. Authenticate with Supabase
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (authError) throw authError;

      // 2. Fetch teacher data
      const { data: teacherData, error: teacherError } = await supabase
        .from('Teacher')
        .select('*')
        .eq('teacherId', user.id)  // Ensure this matches your DB column name
        .single();

      if (teacherError) throw teacherError;

      // 3. Set user context
      setUser({
        ...teacherData,
        email: user.email,
        auth: user // Include the auth user object if needed
      });

      // 4. Navigate to user-specific route
    navigate(`/user/${user.id}`, {
      replace: true
    });

    } catch (error) {
      setError(error.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white/5 backdrop-blur-sm p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-white/20 backdrop-blur-sm">
          {/* Header with Logo */}
          <div className="bg-gradient-to-r from-[#006633] to-[#00502a] p-8 text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={logo} 
                alt="AttendEase Logo" 
                className="h-20 object-contain drop-shadow-md" 
              />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">AttendEase</h1>
            <p className="text-white/90 mt-2 font-light">Student Attendance Management System</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start">
                <svg className="h-5 w-5 text-red-500 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="teacher@university.edu"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#006633]/50 focus:border-[#006633] transition-all shadow-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#006633]/50 focus:border-[#006633] transition-all shadow-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {showPassword ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 16a6 6 0 100-12 6 6 0 000 12z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-4 rounded-xl font-medium text-white transition-all shadow-md ${
                  loading
                    ? 'bg-[#004d26] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#006633] to-[#00502a] hover:from-[#00502a] hover:to-[#004d26] hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                    </svg>
                    Sign In
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center  text-black/80 text-sm mt-8 font-light">
          © {new Date().getFullYear()} AttendEase. Secure Attendance System.
        </div>
      </div>
    </div>
  );
}