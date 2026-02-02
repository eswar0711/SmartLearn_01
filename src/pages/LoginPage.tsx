import React, { useEffect, useState } from 'react';
import { signIn, signUp } from '../utils/auth';
import '../index.css';
import EduvergeLogo from '../assets/smartVerg.jpeg';
import OnlyLogo from '../assets/onlylogo.jpeg';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import ForgotPasswordModal from '../components/ForgetPasswordModal';
import { Eye, EyeOff } from 'lucide-react';
//import BackgroundVideo from '../assets/vido.mp4.mp4'; 

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [first_name, setName] = useState('');
  const [role, setRole] = useState<'faculty' | 'student'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Demo Accounts
  const demoAccounts = [
    { role: 'Student', email: 'student@eduverge.com', password: 'password@123' },
    { role: 'Faculty', email: 'faculty@eduverge.com', password: 'faculty@1234' },
    { role: 'Admin', email: 'admin@eduverge.com', password: 'Admin@123' },
  ];

  useEffect(() => {
    const loadBranches = async () => {
      const { data } = await supabase.from('branches').select('*');
      setBranches(data || []);
    };
    loadBranches();
  }, []);

  const fillDemoCredentials = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setIsSignUp(false);
    setError('');
    toast.success('Demo credentials autofilled!');
  };

  // 🛡️ HELPER: Validate Email Domain
  const isEmailValid = (email: string) => {
    // 1. Check for @gmail.com
    const isGmail = email.endsWith('@gmail.com');
    
    // 2. Check for .ac.in (Educational domains like necn.ac.in)
    const isEdu = email.endsWith('.ac.in');

    return isGmail || isEdu;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // 🔒 VALIDATION STEP: Check domain before signing up
        if (!isEmailValid(email)) {
          throw new Error('Access Restricted: Please use a valid Gmail (@gmail.com) or College email (.ac.in).');
        }

        // 1. Create the account (Auth + Initial DB Insert)
        await signUp(email, password, first_name, role, branchId || undefined);

        // 2. Sync Branch Data (Existing logic)
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser && branchId) {
          console.log("Syncing branch data for:", authUser.id);
          
          await supabase
            .from('user_profiles')
            .update({ branch_id: branchId })
            .eq('id', authUser.id);

          await supabase
            .from('users')
            .update({ branch_id: branchId })
            .eq('id', authUser.id);
        }

        toast.success('Account created! Please sign in.', {
          duration: 4000,
          position: 'top-center',
          icon: '🎉',
        });

        setIsSignUp(false);
        setName('');
        setRole('student');
        setBranchId(null);
      } else {
        await signIn(email, password);
        toast.success('Successfully Signed In!');
        onLogin();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">

      {/* Background Video */}
      {/* <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover -z-70 scale-x-[-1]" // scale-x-[-1] mirrors the video
      >
        <source src={BackgroundVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video> */}

      {/* Optional: Dark overlay to make text readable */}
      {/* <div className="absolute top-0 left-0 w-full h-full bg-black/40 -z-10"></div> */}
      {/* --- VIDEO BACKGROUND END --- */}


      <Toaster />
      <div className="relative bg-gray-50 rounded-3xl shadow-2xl w-full max-w-md p-10 overflow-hidden">
        
        {/* Watermark */}
        <img
          src={OnlyLogo}
          alt="EduVerge watermark"
          className="pointer-events-none select-none absolute -top-10 -right-16 w-80 opacity-15 blur-[1px]"
        />

        <div className="relative z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary-100 p-3 rectangle-full mb-4 shadow-sm">
              <img src={EduvergeLogo} alt="EduVerge logo" className="w-16 h-16 object-contain" />
            </div>
           <h1 className="text-3xl font-bold bg-gradient-to-r bold from-indigo-800 to-green-500 bg-clip-text text-transparent">
    EduVerge</h1>
            <p className="text-gray-600 mt-2">Smart Learning & Assessment</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={first_name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
                // Optional: Add helper text for users
                placeholder={isSignUp ? "Enter valid email" : "Enter email"}
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">
                  *Only @gmail.com or .ac.in emails allowed
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg pr-10"
                required
                minLength={6}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>


            </div>
          {!isSignUp && (
  <>
    <div className="text-right">
      <button
        type="button"
        onClick={() => setShowForgot(true)}
        className="text-sm text-blue-600 hover:underline"
      >
        Forgot password?
      </button>
    </div>

    {showForgot && (
      <ForgotPasswordModal onClose={() => setShowForgot(false)} />
    )}
  </>
)}
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <select
                    value={branchId || ''}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
                

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'faculty' | 'student')}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-blue-500 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setName('');
              }}
              className="text-primary-600 text-sm font-medium"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="mt-8 border-t pt-5">
            <p className="text-sm text-gray-600 mb-3 text-center font-medium">Demo Accounts</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {demoAccounts.map((demo) => (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => fillDemoCredentials(demo.email, demo.password)}
                  className="border border-primary-300 rounded-lg px-3 py-2 text-sm hover:bg-primary-50"
                >
                  <div className="font-semibold">{demo.role}</div>
                  <div className="text-xs text-gray-500 truncate">{demo.email}</div>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;