import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { User as UserIcon, Mail, Briefcase, Calendar, ArrowLeft, Layers } from 'lucide-react';
import profilecard from '../../assets/ProfilecardBg.avif';
import PremiumLoader from '../../layouts/PremiumLoader';

// 1. Define the correct shape of the data
interface UserProfileData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  branch_id: string | null;
  // Supabase can return the joined relation as an object or an array
  branches?: { name: string } | { name: string }[] | null;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        // 2. Query 'user_profiles' (not 'users') and join with 'branches'
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*, branches(name)')
          .eq('id', authUser.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (data) {
          // Merge the auth email if missing from profile
          setUser({
            ...data,
            email: data.email || authUser.email
          } as UserProfileData);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  // 3. Helper to safely get the branch name (handles array or object return)
  const getBranchName = () => {
    if (!user?.branches) return null;
    if (Array.isArray(user.branches)) {
      return user.branches[0]?.name;
    }
    return (user.branches as { name: string }).name;
  };

  const branchName = getBranchName();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <PremiumLoader message="Loading..." fullHeight={false} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto mt-10">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-8 px-4 py-2 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
          <p className="text-gray-600 mt-2">View and manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div
            className="relative px-8 py-12 text-center bg-cover bg-center"
            style={{
              backgroundImage: `url(${profilecard})`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-purple-700/50 to-yellow-600/70"></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-md mb-4">
                <UserIcon className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-white">
                {user?.full_name || 'User'}
              </h2>

              <p className="text-blue-100 mt-1 capitalize">
                {user?.role}
              </p>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8 space-y-6">
            {/* Email */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">email</p>
                <p className="text-gray-800 font-medium">{user?.email}</p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <div className="p-3 bg-green-100 rounded-lg">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Role</p>
                <p className="text-gray-800 font-medium capitalize">{user?.role}</p>
              </div>
            </div>

            {/* Branch / Department */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Layers className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Branch / Department</p>
                <p className="text-gray-800 font-medium text-lg">
                  {branchName ? (
                    <span className="text-indigo-700 font-bold">{branchName}</span>
                  ) : (
                    <span className="text-slate-400 italic text-base font-normal">Not Assigned</span>
                  )}
                </p>
              </div>
            </div>

            {/* Created Date */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Member Since</p>
                <p className="text-gray-800 font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            📝 To change your password, use the options in your Settings menu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;