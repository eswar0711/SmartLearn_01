import React, { useState } from 'react';
import { Mail, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { checkUserExistsByEmail, sendPasswordResetEmail } from '../utils/auth';

interface Props {
  onClose: () => void;
}

const ForgotPasswordModal: React.FC<Props> = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleReset = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const exists = await checkUserExistsByEmail(email);

      if (!exists) {
        setError("You don't have an account. Please sign up first.");
        return;
      }

      await sendPasswordResetEmail(email);
      setMessage('Password reset link sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">
            Reset Password
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Enter your registered email to receive a reset link
          </p>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-600">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              placeholder="you@eduverge.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Success */}
        {message && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            <CheckCircle size={16} />
            {message}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleReset}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? 'Sending...' : 'Send Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;