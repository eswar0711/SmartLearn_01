import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { updatePassword } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/login');
      }
    });
  }, []);

  const handleReset = async () => {
  if (!password || !confirm) {
    setError('Password cannot be empty');
    return;
  }

  if (password.length < 8) {
    setError('Password must be at least 8 characters');
    return;
  }

  if (password !== confirm) {
    setError('Passwords do not match');
    return;
  }

  setLoading(true);
  try {
    await updatePassword(password);
    alert('Password updated successfully');
    await supabase.auth.signOut();
    navigate('/login');
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Lock className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-800">
            Set New Password
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Choose a strong password to secure your account
          </p>
        </div>

        {/* New Password */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-600">
            New Password
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="password"
              placeholder="Enter new password"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Confirm Password */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Confirm Password
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="password"
              placeholder="Re-enter password"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Action */}
      <button
  onClick={handleReset}
  disabled={
    loading ||
    !password ||
    !confirm ||
    password !== confirm
  }
  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg
             bg-blue-600 py-2.5 text-sm font-medium text-white
             hover:bg-blue-700 disabled:opacity-60"
>

          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? 'Updating...' : 'Update Password'}
        </button>

        {/* Footer */}
        <p className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
          <CheckCircle size={14} />
          You’ll be redirected to login after update
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;