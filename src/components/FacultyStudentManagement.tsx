import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import {
  Users,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import type { User } from '../utils/supabaseClient';

interface FacultyStudentManagementProps {
  user: User;
}

interface StudentRecord {
  id: string;
  email: string;
  full_name: string;
  role: 'student';
  is_active: boolean;
  created_at: string;
  branch_id?: string; // Added branch_id to interface
}

interface AddStudentForm {
  email: string;
  password: string;
  full_name: string;
}

const FacultyStudentManagement: React.FC<FacultyStudentManagementProps> = ({ user }) => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Store the logged-in Faculty's Branch ID
  const [facultyBranchId, setFacultyBranchId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [addForm, setAddForm] = useState<AddStudentForm>({
    email: '',
    password: '',
    full_name: '',
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // 1. First get Faculty Branch, then fetch students for that branch
    const initData = async () => {
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('branch_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const branchId = userData?.branch_id;
        setFacultyBranchId(branchId);
        
        // 2. Fetch students filtered by this branch
        fetchStudents(branchId);
      } catch (err) {
        console.error('Error fetching faculty profile:', err);
        setLoading(false);
      }
    };

    initData();
  }, [user.id]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredStudents(
        students.filter(
          s =>
            s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredStudents(students);
    }
  }, [searchQuery, students]);

  const fetchStudents = async (branchId: string | null) => {
    try {
      let query = supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      // ⭐ SECURITY FIX: Only fetch students from the faculty's branch
      if (branchId) {
        query = query.eq('branch_id', branchId);
      } else {
        // Optional: If faculty has no branch, return empty list or handle accordingly
        // For now, we allow fetching but usually, this case should be handled by admin assigning a branch
      }

      const { data, error } = await query;

      if (error) throw error;

      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setActionLoading(true);

    try {
      // 1. Validation
      if (!addForm.email || !addForm.password || !addForm.full_name) {
        throw new Error('All fields are required');
      }

      if (addForm.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (!facultyBranchId) {
        throw new Error('You are not assigned to a branch. Cannot create students.');
      }

      // 2. Create a Temporary Client (to avoid logging out current user)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
      }

      const tempClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      // 3. Sign up the student
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: addForm.email,
        password: addForm.password,
        options: {
          data: {
            full_name: addForm.full_name,
            role: 'student',
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 4. Insert into 'users' table with the FACULTY'S BRANCH ID
        const { error: dbError } = await supabase.from('users').insert([
          {
            id: authData.user.id,
            email: addForm.email,
            full_name: addForm.full_name,
            role: 'student',
            branch_id: facultyBranchId, // ⭐ AUTO-ASSIGN BRANCH
            is_active: true,
          },
        ]);

        if (dbError) {
           throw new Error(`Auth created, but DB insert failed: ${dbError.message}`);
        }

        setSuccessMessage(`✅ Student "${addForm.full_name}" added successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);

        setShowAddModal(false);
        setAddForm({ email: '', password: '', full_name: '' });
        
        // Refresh the list using the current branch ID
        fetchStudents(facultyBranchId);
      }
    } catch (err: any) {
      console.error('Error adding student:', err);
      setFormError(err.message || 'Failed to add student');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <div className="flex-1 p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Student Management
            </h2>
            <p className="text-gray-600">
              {facultyBranchId 
                ? 'Manage students in your branch' 
                : 'View enrolled students (No branch assigned)'}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={!facultyBranchId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            Add New Student
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Warning if no branch assigned */}
        {!facultyBranchId && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <span>You are not assigned to a branch. You cannot add new students or see branch-specific data. Please contact Admin.</span>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4" />
              No students found
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4">{student.full_name}</td>
                    <td className="px-6 py-4">{student.email}</td>
                    <td className="px-6 py-4">
                      {student.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleAddStudent}
            className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <h3 className="text-xl font-bold">Add New Student</h3>
            <p className="text-sm text-gray-500">
              This student will be automatically added to your branch.
            </p>

            {formError && (
              <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-sm rounded">
                {formError}
              </div>
            )}

            <input
              type="text"
              placeholder="Full Name"
              value={addForm.full_name}
              onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={addForm.email}
              onChange={e => setAddForm({ ...addForm, email: e.target.value })}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={addForm.password}
              onChange={e => setAddForm({ ...addForm, password: e.target.value })}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
              minLength={6}
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 border rounded p-2 hover:bg-gray-100 transition-colors font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 bg-blue-600 text-white rounded p-2 hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
              >
                {actionLoading ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FacultyStudentManagement;