import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import type { User } from '../../utils/supabaseClient';
//import NavigationSidebar from '../NavigationSidebar';
import LoadingSpinner from '../../layouts/LoadingSpinner';

import {
  Users,
  BookOpen,
  TrendingUp,
  FileText,
  BarChart3,
  Settings,
  AlertCircle,
  Layers, // Added for Branches
  // Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminDashboardProps {
  user: User;
}

interface DashboardStats {
  totalStudents: number;
  totalFaculty: number;
  totalAssessments: number;
  totalSubmissions: number;
  totalBranches: number; // Added new field
  averageScore: number;
  completionRate: number;
  blockedUsers: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalFaculty: 0,
    totalAssessments: 0,
    totalSubmissions: 0,
    totalBranches: 0, // Initialize new field
    averageScore: 0,
    completionRate: 0,
    blockedUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      console.log('📊 Fetching admin dashboard stats...');

      // Total Students
      const { data: studentsData } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'student');

      // Total Faculty
      const { data: facultyData } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('role', 'faculty');

      // Total Assessments
      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select('id', { count: 'exact' });

      // Total Branches (New)
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id', { count: 'exact' });

      // Total Submissions
      const { data: submissionsData } = await supabase
        .from('submissions')
        .select('total_score', { count: 'exact' });

      // Average Score
      const { data: scoreData } = await supabase
        .from('submissions')
        .select('total_score');

      // Blocked Users
      const { data: blockedData } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact' })
        .eq('is_blocked', true);

      // Calculate metrics
      const totalStudents = studentsData?.length || 0;
      const totalFaculty = facultyData?.length || 0;
      const totalAssessments = assessmentsData?.length || 0;
      const totalBranches = branchesData?.length || 0; // Added calculation
      const totalSubmissions = submissionsData?.length || 0;
      const blockedUsers = blockedData?.length || 0;

      const averageScore = scoreData && scoreData.length > 0
        ? Math.round(scoreData.reduce((sum: number, s: any) => sum + (s.total_score || 0), 0) / scoreData.length * 10) / 10
        : 0;

      const completionRate = totalStudents > 0
        ? Math.round((totalSubmissions / (totalStudents * totalAssessments || 1)) * 100)
        : 0;

      setStats({
        totalStudents,
        totalFaculty,
        totalAssessments,
        totalSubmissions,
        totalBranches, // Set state
        averageScore,
        completionRate,
        blockedUsers
      });

      console.log('✓ Dashboard stats loaded');
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <div className="flex bg-gray-50 min-h-screen font-sans">
      {/* <NavigationSidebar user={user} /> */}

      <div className="flex-1 p-8">
        {/* Header Section with Gradient */}
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h2>
            <p className="text-gray-500 font-medium">Overview of your academic ecosystem</p>
          </div>
        </div>

        {/* Quick Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Students */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-blue-600 transition-colors">Students</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalStudents}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-blue-100 transition-colors">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Total Faculty */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-green-600 transition-colors">Faculty</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalFaculty}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-xl group-hover:bg-green-100 transition-colors">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total Branches (New) */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-indigo-600 transition-colors">Branches</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalBranches}</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded-xl group-hover:bg-indigo-100 transition-colors">
                <Layers className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Total Assessments */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-purple-600 transition-colors">Assessments</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalAssessments}</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl group-hover:bg-purple-100 transition-colors">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:scale-105 transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1 group-hover:text-orange-600 transition-colors">Avg Score</p>
                <p className="text-3xl font-bold text-gray-800">{stats.averageScore}%</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl group-hover:bg-orange-100 transition-colors">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Alert Card - Blocked Users */}
        {stats.blockedUsers > 0 && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4 shadow-sm">
            <div className="p-2 bg-white rounded-full">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-bold text-red-800">{stats.blockedUsers} Blocked Users</p>
              <p className="text-sm text-red-700">Review user management to unblock if needed</p>
            </div>
            <button
              onClick={() => navigate('/admin/users')}
              className="ml-auto px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
            >
              Review Users
            </button>
          </div>
        )}

        {/* Main Action Cards */}
        <h3 className="text-xl font-bold text-gray-800 mb-4 px-1">Quick Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Manage Users */}
          <div
            onClick={() => navigate('/admin/users')}
            className="group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-400 cursor-pointer transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Users className="w-6 h-6 text-blue-600 group-hover:text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Manage Users</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 h-10">
                Full control over student and faculty accounts, roles, and access.
              </p>
              <button className="text-blue-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                Access Panel <span>→</span>
              </button>
            </div>
          </div>

          {/* View Analytics */}
          <div
            onClick={() => navigate('/admin/analytics')}
            className="group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-green-400 cursor-pointer transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-green-100 p-3 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-colors duration-300">
                  <BarChart3 className="w-6 h-6 text-green-600 group-hover:text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Analytics</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 h-10">
                Deep dive into performance metrics, pass rates, and branch statistics.
              </p>
              <button className="text-green-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                View Reports <span>→</span>
              </button>
            </div>
          </div>

          {/* View Submissions */}
          <div
            onClick={() => navigate('/admin/submissions')}
            className="group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-purple-400 cursor-pointer transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-purple-100 p-3 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                  <FileText className="w-6 h-6 text-purple-600 group-hover:text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Submissions</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 h-10">
                Monitor incoming test submissions and review auto-grading results.
              </p>
              <button className="text-purple-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                Check Inbox <span>→</span>
              </button>
            </div>
          </div>

          {/* System Settings */}
          <div
            onClick={() => navigate('/profile')}
            className="group bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-xl hover:border-gray-400 cursor-pointer transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-gray-100 p-3 rounded-xl group-hover:bg-gray-800 group-hover:text-white transition-colors duration-300">
                  <Settings className="w-6 h-6 text-gray-600 group-hover:text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Settings</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 h-10">
                Configure global system parameters, branches, and security policies.
              </p>
              <button className="text-gray-600 font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                Configure <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600" /> System Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative pl-6 border-l-4 border-teal-500">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Activity</p>
              <p className="text-4xl font-extrabold text-gray-900">{stats.totalSubmissions}</p>
              <p className="text-xs text-teal-600 font-medium mt-1">Tests submitted to date</p>
            </div>

            <div className="relative pl-6 border-l-4 border-indigo-500">
              <p className="text-sm font-medium text-gray-500 mb-1">Engagement</p>
              <p className="text-4xl font-extrabold text-gray-900">{stats.completionRate}%</p>
              <p className="text-xs text-indigo-600 font-medium mt-1">Overall completion rate</p>
            </div>

            <div className="relative pl-6 border-l-4 border-rose-500">
              <p className="text-sm font-medium text-gray-500 mb-1">Blocked Users</p>
              <p className="text-4xl font-extrabold text-gray-900">{stats.blockedUsers}</p>
              <p className="text-xs text-rose-600 font-medium mt-1">Accounts requiring review</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
