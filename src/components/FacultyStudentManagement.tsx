import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { createClient } from '@supabase/supabase-js'; // Import createClient
// import NavigationSidebar from './NavigationSidebar';
import {
  Users,
  Plus,
  Search,
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
}

interface AddStudentForm {
  email: string;
  password: string;
  full_name: string;
}

const FacultyStudentManagement: React.FC<FacultyStudentManagementProps> = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    fetchStudents();
  }, []);

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

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FINAL & SECURE STUDENT CREATION WITH TEMP CLIENT
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

      // 2. Create a Temporary Client
      // We use the env variables directly to create a fresh instance
      // Note: Ensure these env variables are accessible in your project
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
      }

      const tempClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false, // CRITICAL: This prevents logging out the current Faculty user
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

      // 3. Sign up the student using the temp client (Creates Auth User)
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: addForm.email,
        password: addForm.password,
        options: {
          data: {
            full_name: addForm.full_name,
            role: 'student', // Save metadata to auth object
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 4. Manually insert into the public 'users' table
        // We use the MAIN 'supabase' client here because the Faculty is logged in 
        // and presumably has RLS permission to insert into the 'users' table.
        const { error: dbError } = await supabase.from('users').insert([
          {
            id: authData.user.id, // Link the Auth ID
            email: addForm.email,
            full_name: addForm.full_name,
            role: 'student',
            is_active: true,
          },
        ]);

        if (dbError) {
           // If the database insert fails, the Auth user still exists. 
           // In a production app, you might want to try and delete the Auth user here to clean up.
           throw new Error(`Auth created, but DB insert failed: ${dbError.message}`);
        }

        setSuccessMessage(`✅ Student "${addForm.full_name}" added successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);

        setShowAddModal(false);
        setAddForm({ email: '', password: '', full_name: '' });
        
        // Refresh the list
        fetchStudents();
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
        {/* <NavigationSidebar user={user} /> */}
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* <NavigationSidebar user={user} /> */}

      <div className="flex-1 p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Student Management
            </h2>
            <p className="text-gray-600">View and manage enrolled students</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
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
                      {student.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td className="px-6 py-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleAddStudent}
            className="bg-white rounded-xl p-6 w-full max-w-md space-y-4"
          >
            <h3 className="text-xl font-bold">Add New Student</h3>

            {formError && (
              <div className="p-2 bg-red-100 text-red-700 rounded">
                {formError}
              </div>
            )}

            <input
              type="text"
              placeholder="Full Name"
              value={addForm.full_name}
              onChange={e => setAddForm({ ...addForm, full_name: e.target.value })}
              className="w-full border p-2 rounded"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={addForm.email}
              onChange={e => setAddForm({ ...addForm, email: e.target.value })}
              className="w-full border p-2 rounded"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={addForm.password}
              onChange={e => setAddForm({ ...addForm, password: e.target.value })}
              className="w-full border p-2 rounded"
              required
              minLength={6}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 border rounded p-2 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 bg-blue-600 text-white rounded p-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
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