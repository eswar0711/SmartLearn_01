import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import {
  Trash2,
  Lock,
  Unlock,
  Search,
  Plus,
  X,
  GitBranch,
  AlertTriangle // Imported for the warning modal
} from 'lucide-react';
import PremiumLoader from '../../layouts/PremiumLoader'; 

interface AdminUserManagementProps {
  user: any;
}

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'faculty' | 'admin';
  branch_id?: string | null;
  is_blocked: boolean;
  is_active: boolean;
  created_at: string;
}

interface AddUserForm {
  email: string;
  password: string;
  full_name: string;
  role: 'student' | 'faculty';
  branch_id?: string;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'faculty' | 'admin'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  
  // Modal States
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // NEW: State for delete confirmation
  
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
   
  // Branch State
  const [branches, setBranches] = useState<any[]>([]);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [branchLoading, setBranchLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, []);

  // Fetch branches for dropdown and table lookup
  const fetchBranches = async () => {
    const { data } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    setBranches(data || []);
  };

  // Helper to get branch name from ID (Client-side join)
  const getBranchName = (branchId: string | null | undefined) => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : '-';
  };

  const createBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    setBranchLoading(true);
    try {
      const { error } = await supabase
        .from('branches')
        .insert({ name: newBranchName.trim() });

      if (error) throw error;

      setSuccessMessage('✅ Branch created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setNewBranchName('');
      fetchBranches(); 
    } catch (error: any) {
      console.error('Error creating branch:', error);
      alert(error.message || 'Failed to create branch');
    } finally {
      setBranchLoading(false);
    }
  };

  const deleteBranch = async (id: string) => {
    if (!window.confirm('Are you sure? This might affect users assigned to this branch.')) return;
    
    setBranchLoading(true);
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccessMessage('Branch deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchBranches();
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      alert('Cannot delete branch. It might be assigned to users or assessments.');
    } finally {
      setBranchLoading(false);
    }
  };

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserForm, setAddUserForm] = useState<AddUserForm>({
    email: '',
    password: '',
    full_name: '',
    role: 'student'
  });
  const [addUserError, setAddUserError] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    filterUsers();
    setCurrentPage(1);
  }, [users, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredUsers, pageSize, currentPage]);

  // Fetch users WITHOUT server-side join to avoid PGRST200
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching users:', error);
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchQuery) {
      filtered = filtered.filter(
        u =>
          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (statusFilter === 'active') {
      filtered = filtered.filter(u => !u.is_blocked && u.is_active);
    } else if (statusFilter === 'blocked') {
      filtered = filtered.filter(u => u.is_blocked);
    }

    setFilteredUsers(filtered);
  };

const addNewUser = async () => {
    try {
      setAddUserError('');
      setActionLoading(true);

      // 1. Validation
      if (!addUserForm.email || !addUserForm.password || !addUserForm.full_name) {
        setAddUserError('❌ All fields are required!');
        setActionLoading(false);
        return;
      }
      if (addUserForm.password.length < 6) {
        setAddUserError('❌ Password must be at least 6 characters!');
        setActionLoading(false);
        return;
      }
      // Require branch for Faculty/Student
      if ((addUserForm.role === 'student' || addUserForm.role === 'faculty') && !addUserForm.branch_id) {
        setAddUserError(`❌ Please select a branch for the ${addUserForm.role}`);
        setActionLoading(false);
        return;
      }

      // 2. Create Auth User (using temp client to avoid logging out admin)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) throw new Error('Supabase vars missing');

      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: addUserForm.email,
        password: addUserForm.password,
        options: {
          data: {
            full_name: addUserForm.full_name,
            role: addUserForm.role,
          }
        }
      });

      if (authError) {
        setAddUserError(`❌ Auth Error: ${authError.message}`);
        setActionLoading(false);
        return;
      }

      if (!authData.user?.id) {
        setAddUserError('❌ User created but ID missing.');
        setActionLoading(false);
        return;
      }

      const userId = authData.user.id;
      const branchIdToSave = (addUserForm.role === 'student' || addUserForm.role === 'faculty') 
        ? addUserForm.branch_id 
        : null;

      // 3. Prepare Data Objects
      const userProfileData = {
        id: userId,
        email: addUserForm.email,
        full_name: addUserForm.full_name,
        role: addUserForm.role,
        branch_id: branchIdToSave,
        is_active: true,
        is_blocked: false,
        created_at: new Date().toISOString()
      };

      const publicUserData = {
        id: userId,
        email: addUserForm.email,
        full_name: addUserForm.full_name,
        role: addUserForm.role,
        branch_id: branchIdToSave,
        is_active: true,
        is_blocked: false,
        created_at: new Date().toISOString()
      };

      // 4. Insert into BOTH tables explicitly
      // We use Promise.allsettled or sequential to ensure we catch specific errors
      console.log("Inserting into user_profiles...");
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert(userProfileData);

      if (profileError) {
        console.error("Profile Insert Error:", profileError);
        // Don't return yet, try to insert into users table too so we don't have partial data state
        setAddUserError(`Warning: Profile insert failed (${profileError.message}), but Auth user created.`);
      }

      console.log("Inserting into users...");
      const { error: usersError } = await supabase
        .from('users')
        .insert(publicUserData);

      if (usersError) {
        console.error("Users Table Insert Error:", usersError);
        setAddUserError(`Error: ${usersError.message}`);
        return; // Stop here if this fails
      }

      // 5. Success
      setSuccessMessage(
        `✅ ${addUserForm.role} "${addUserForm.full_name}" created successfully!`
      );
      setTimeout(() => setSuccessMessage(''), 3000);

      setAddUserForm({
        email: '',
        password: '',
        full_name: '',
        role: 'student',
        branch_id: undefined
      });

      setShowAddUserModal(false);
      fetchUsers();

    } catch (error: any) {
      console.error('❌ Critical Error:', error);
      setAddUserError(error.message || 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleBlockUser = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(true);
      const newStatus = !currentStatus;

      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({ is_blocked: newStatus })
        .eq('id', userId);

      const { error: usersErr } = await supabase
        .from('users')
        .update({ is_blocked: newStatus })
        .eq('id', userId);

      if (profileErr || usersErr) throw (profileErr || usersErr);

      setSuccessMessage(`User ${newStatus ? 'blocked' : 'unblocked'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);

      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_blocked: newStatus } : u
      ));

      setSelectedUser(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const changeUserRole = async (userId: string, newRole: 'student' | 'faculty' | 'admin') => {
    try {
      setActionLoading(true);

      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      const { error: usersErr } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (profileErr || usersErr) throw (profileErr || usersErr);

      setSuccessMessage(`User role changed to ${newRole}!`);
      setTimeout(() => setSuccessMessage(''), 3000);

      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));

      setSelectedUser(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleActiveStatus = async (userId: string, currentStatus: boolean) => {
    try {
      setActionLoading(true);
      const newStatus = !currentStatus;

      const { error: profileErr } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus })
        .eq('id', userId);

      const { error: usersErr } = await supabase
        .from('users')
        .update({ is_active: newStatus })
        .eq('id', userId);

      if (profileErr || usersErr) throw (profileErr || usersErr);

      setSuccessMessage(`User ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);

      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_active: newStatus } : u
      ));

      setSelectedUser(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ UPDATED: Function just handles the logic, no window.confirm here
  const deleteUser = async (userId: string) => {
    try {
      setActionLoading(true);

      const { error: profileErr } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      const { error: usersErr } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (profileErr || usersErr) throw (profileErr || usersErr);

      setSuccessMessage('User deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setUsers(users.filter(u => u.id !== userId));
      setSelectedUser(null);
      setShowDeleteConfirm(false); // Close the modal
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex">
        <div className="flex-1 flex items-center justify-center">
          <PremiumLoader message='loading...'/>
        </div>
      </div>
    );
  }

  // Pagination calculations
  const totalItems = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const indexOfLast = currentPage * pageSize;
  const indexOfFirst = indexOfLast - pageSize;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const startDisplay = totalItems === 0 ? 0 : indexOfFirst + 1;
  const endDisplay = totalItems === 0 ? 0 : Math.min(indexOfLast, totalItems);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <div className="flex-1 p-8">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">User Management</h2>
            <p className="text-gray-600">View and manage all users in the system</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowBranchModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              <GitBranch className="w-5 h-5" />
              Manage Branches
            </button>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add User
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="student">Students</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            {/* Page Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rows per page</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startDisplay}–{endDisplay} of {users.length} users
            </p>
            <p className="text-xs text-gray-400">
              Filtered: {filteredUsers.length}
            </p>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">

                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Branch</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Created</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-800 font-medium">{u.full_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
                             u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                             u.role === 'faculty' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                           {getBranchName(u.branch_id)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {u.is_blocked ? (
                            <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              Blocked
                            </span>
                          ) : u.is_active ? (
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
<div className="md:hidden flex flex-col divide-y divide-gray-100">
  {currentUsers.map((u) => (
    <div key={u.id} className="p-4 space-y-3">

      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold text-gray-900">{u.full_name}</p>
          <p className="text-xs text-gray-500 break-all">{u.email}</p>
        </div>

        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 capitalize">
          {u.role}
        </span>
      </div>

      <div className="text-sm text-gray-600">
        Branch: {getBranchName(u.branch_id)}
      </div>

      <div className="flex gap-2 text-xs">
        {u.is_blocked ? (
          <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full">Blocked</span>
        ) : u.is_active ? (
          <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full">Active</span>
        ) : (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full">Inactive</span>
        )}
      </div>

      <button
        onClick={() => setSelectedUser(u)}
        className="w-full mt-2 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium"
      >
        Manage User
      </button>

    </div>
  ))}
</div>


              {/* Pagination Controls */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 text-sm rounded-lg border ${
                        page === currentPage
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalItems === 0}
                  className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

       {/* Branch Management Modal */}
       {showBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Manage Branches</h3>
              <button onClick={() => setShowBranchModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Create Branch */}
              <form onSubmit={createBranch} className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Enter branch name (e.g. CSE, Mechanical)"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={branchLoading || !newBranchName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </form>

              {/* List Branches */}
              <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Branch Name</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {branches.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-center text-gray-500 text-sm">
                          No branches found. Add one above.
                        </td>
                      </tr>
                    ) : (
                      branches.map((b) => (
                        <tr key={b.id}>
                          <td className="px-4 py-3 text-gray-800 font-medium">{b.name}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => deleteBranch(b.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              title="Delete Branch"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-800">Add New User</h3>
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setAddUserError('');
                  setAddUserForm({ email: '', password: '', full_name: '', role: 'student' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-4">
              {addUserError && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm">
                  {addUserError}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={addUserForm.email}
                  onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                  placeholder="student@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={addUserForm.full_name}
                  onChange={(e) => setAddUserForm({ ...addUserForm, full_name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={addUserForm.password}
                  onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                </select>
                
                {/* ✅ FIX: Show Branch Selection for BOTH Faculty and Student */}
                {addUserForm.role === 'student' || addUserForm.role === 'faculty' ? (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch
                    </label>
                    <select
                      value={addUserForm.branch_id || ''}
                      onChange={(e) =>
                        setAddUserForm({ ...addUserForm, branch_id: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex gap-2">
              <button
                onClick={() => {
                  setShowAddUserModal(false);
                  setAddUserError('');
                  setAddUserForm({ email: '', password: '', full_name: '', role: 'student' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={addNewUser}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Actions Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800">{selectedUser.full_name}</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedUser.email}</p>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <p><strong>Role:</strong> <span className="capitalize text-gray-700">{selectedUser.role}</span></p>
                <p><strong>Branch:</strong> <span className="text-gray-700">{getBranchName(selectedUser.branch_id)}</span></p>
                <p><strong>Status:</strong> <span className={selectedUser.is_active ? 'text-green-600' : 'text-yellow-600'}>{selectedUser.is_active ? 'Active' : 'Inactive'}</span></p>
                <p><strong>Blocked:</strong> <span className={selectedUser.is_blocked ? 'text-red-600' : 'text-green-600'}>{selectedUser.is_blocked ? 'Yes' : 'No'}</span></p>
              </div>

              {/* Change Role */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Change Role</label>
                <select
                  defaultValue={selectedUser.role}
                  onChange={(e) => changeUserRole(selectedUser.id, e.target.value as any)}
                  disabled={actionLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="student">Student</option>
                  <option value="faculty">Faculty</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Toggle Active Status */}
              <button
                onClick={() => toggleActiveStatus(selectedUser.id, selectedUser.is_active)}
                disabled={actionLoading}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedUser.is_active
                    ? 'bg-yellow-500 hover:bg-yellow-600'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {selectedUser.is_active ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    Deactivate User
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Activate User
                  </>
                )}
              </button>

              {/* Block/Unblock */}
              <button
                onClick={() => toggleBlockUser(selectedUser.id, selectedUser.is_blocked)}
                disabled={actionLoading}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedUser.is_blocked
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {selectedUser.is_blocked ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    Unblock User
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Block User
                  </>
                )}
              </button>

              {/* Delete */}
              <button
                onClick={() => setShowDeleteConfirm(true)} // ✅ Updated: Triggers the new modal
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete User Permanently
              </button>
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW: Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete User?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold">{selectedUser.full_name}</span>? 
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUser(selectedUser.id)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
                >
                  {actionLoading ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;