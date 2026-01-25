import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import PremiumLoader from '../../layouts/PremiumLoader';
import {
  Download,
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

interface AdminSubmissionsProps {
  user: any;
}

interface Submission {
  id: string;
  assessment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_branch_id: string | null;
  assessment_title: string;
  submitted_at: string;
  answers: any;
  test_session_id: string | null;
  mcq_score: number | null;
  theory_score: number | null;
  total_score: number | null;
  faculty_feedback: string;
  faculty_rating: number | null;
  is_auto_submitted: boolean;
}

interface GradeForm {
  submissionId: string;
  mcq_score: number;
  theory_score: number;
  total_score: number;
  faculty_feedback: string;
  faculty_rating: number;
}

interface Subject {
  id: string;
  title: string;
}

const AdminSubmissions: React.FC<AdminSubmissionsProps> = ({ user }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [gradedFilter, setGradedFilter] = useState<'all' | 'graded' | 'ungraded'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all'); // ⭐ NEW Branch Filter State

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeForm, setGradeForm] = useState<GradeForm>({
    submissionId: '',
    mcq_score: 0,
    theory_score: 0,
    total_score: 0,
    faculty_feedback: '',
    faculty_rating: 0
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Branch Context State
  const [adminBranchId, setAdminBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (user?.id) {
      fetchBranches(); 
      fetchSubmissions();
    }
  }, [user]);

  // ⭐ Updated Dependency Array to include branchFilter
  useEffect(() => {
    filterSubmissions();
    setCurrentPage(1);
  }, [submissions, searchQuery, gradedFilter, subjectFilter, branchFilter]);

  const fetchBranches = async () => {
    const { data } = await supabase.from('branches').select('*').order('name');
    setBranches(data || []);
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return 'General';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : 'General';
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      
      const { data: userData } = await supabase
        .from('users')
        .select('branch_id')
        .eq('id', user.id)
        .single();

      const branchId = userData?.branch_id;
      setAdminBranchId(branchId);

      // If admin has a branch, lock the filter to that branch automatically
      if (branchId) {
        setBranchFilter(branchId);
      }

      let query = supabase
        .from('submissions')
        .select(`
          *,
          assessments!inner (
            id,
            title,
            branch_id
          ),
          users:student_id (
            full_name,
            email,
            branch_id
          )
        `)
        .order('submitted_at', { ascending: false });

      if (branchId) {
        query = query.eq('assessments.branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching submissions:', error);
        return;
      }

      const transformedData: Submission[] = data?.map((submission: any) => ({
        id: submission.id,
        assessment_id: submission.assessment_id,
        student_id: submission.student_id,
        student_name: submission.users?.full_name || 'Unknown',
        student_email: submission.users?.email || 'Unknown',
        student_branch_id: submission.users?.branch_id || null,
        assessment_title: submission.assessments?.title || 'Unknown',
        submitted_at: submission.submitted_at,
        answers: submission.answers,
        test_session_id: submission.test_session_id,
        mcq_score: submission.mcq_score,
        theory_score: submission.theory_score,
        total_score: submission.total_score,
        faculty_feedback: submission.faculty_feedback || '',
        faculty_rating: submission.faculty_rating,
        is_auto_submitted: submission.is_auto_submitted
      })) || [];

      setSubmissions(transformedData);
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUniqueSubjects = (): Subject[] => {
    const uniqueAssessments = new Map<string, string>();
    submissions.forEach((submission) => {
      if (!uniqueAssessments.has(submission.assessment_id)) {
        uniqueAssessments.set(submission.assessment_id, submission.assessment_title);
      }
    });
    return Array.from(uniqueAssessments, ([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  const filterSubmissions = () => {
    let filtered = [...submissions];

    // 1. Subject Filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(s => s.assessment_id === subjectFilter);
    }

    // 2. Branch Filter (⭐ NEW Logic)
    if (branchFilter !== 'all') {
      filtered = filtered.filter(s => s.student_branch_id === branchFilter);
    }

    // 3. Search Filter
    if (searchQuery) {
      filtered = filtered.filter(
        s =>
          s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.student_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.assessment_title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 4. Graded Filter
    if (gradedFilter === 'graded') {
      filtered = filtered.filter(s => s.faculty_rating !== null);
    } else if (gradedFilter === 'ungraded') {
      filtered = filtered.filter(s => s.faculty_rating === null);
    }

    setFilteredSubmissions(filtered);
  };

  // Pagination & Actions
  const totalPages = Math.ceil(filteredSubmissions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

  const goToNextPage = () => { if (currentPage < totalPages) setCurrentPage(currentPage + 1); };
  const goToPreviousPage = () => { if (currentPage > 1) setCurrentPage(currentPage - 1); };

  const submitGrade = async () => {
    try {
      setActionLoading(true);
      if (gradeForm.total_score < 0 || gradeForm.total_score > 100) {
        alert('⚠️ Total score must be between 0-100');
        setActionLoading(false);
        return;
      }
      const { error } = await supabase
        .from('submissions')
        .update({
          mcq_score: gradeForm.mcq_score,
          theory_score: gradeForm.theory_score,
          total_score: gradeForm.total_score,
          faculty_feedback: gradeForm.faculty_feedback,
          faculty_rating: gradeForm.faculty_rating
        })
        .eq('id', gradeForm.submissionId);

      if (error) throw error;
      setSuccessMessage('✅ Submission graded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setSubmissions(submissions.map(s => s.id === gradeForm.submissionId ? { ...s, ...gradeForm } : s));
      setShowGradeModal(false);
      setSelectedSubmission(null);
      setGradeForm({ submissionId: '', mcq_score: 0, theory_score: 0, total_score: 0, faculty_feedback: '', faculty_rating: 0 });
    } catch (error: any) {
      alert(`Failed to grade: ${error.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const downloadSubmission = (submission: Submission) => {
    if (!submission.answers) return alert('⚠️ No answers attached');
    const dataStr = JSON.stringify(submission.answers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `submission_${submission.student_name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isGraded = (submission: Submission) => submission.faculty_rating !== null;

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><PremiumLoader message="Loading submissions..." /></div>;
  }

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Student Submissions</h2>
          <p className="text-gray-600">
            {adminBranchId 
              ? 'Viewing submissions for your assigned branch'
              : 'Viewing all submissions (Super Admin)'}
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-100 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center gap-2 mb-4 text-gray-500 text-sm">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </div>
          {/* ⭐ Updated to 4 columns to include Branch Filter */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Subjects</option>
                {getUniqueSubjects().map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.title}</option>
                ))}
              </select>
            </div>

            {/* ⭐ Branch Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                // Disable branch filter if admin is already restricted to a branch
                disabled={!!adminBranchId} 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Student name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={gradedFilter}
                onChange={(e) => setGradedFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="all">All Submissions</option>
                <option value="graded">Graded</option>
                <option value="ungraded">Ungraded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredSubmissions.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
            </p>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No submissions found</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Assessment</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Branch</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Rating</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Submitted</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedSubmissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium">
                          <div>
                            <p className="text-gray-800">{submission.student_name}</p>
                            <p className="text-gray-500 text-xs">{submission.student_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{submission.assessment_title}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {getBranchName(submission.student_branch_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-green-600">
                          {submission.total_score !== null ? `${submission.total_score}/100` : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isGraded(submission) ? (
                            <div className="flex items-center gap-1 text-yellow-600 font-medium">
                              <Star className="w-4 h-4 fill-yellow-400" /> {submission.faculty_rating}
                            </div>
                          ) : <span className="text-gray-400 text-xs">Pending</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(submission.submitted_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <button onClick={() => setSelectedSubmission(submission)} className="text-blue-600 hover:underline">View</button>
                          <button onClick={() => {
                            setSelectedSubmission(submission);
                            setGradeForm({
                              submissionId: submission.id,
                              mcq_score: submission.mcq_score || 0,
                              theory_score: submission.theory_score || 0,
                              total_score: submission.total_score || 0,
                              faculty_feedback: submission.faculty_feedback || '',
                              faculty_rating: submission.faculty_rating || 0
                            });
                            setShowGradeModal(true);
                          }} className="text-green-600 hover:underline">Grade</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <div className="text-sm text-gray-600">Page {currentPage} of {totalPages || 1}</div>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grade Modal (Standard) */}
      {showGradeModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-8 py-6 border-b border-gray-200 bg-white sticky top-0">
              <h3 className="text-2xl font-bold text-gray-800">Grade Submission</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedSubmission.student_name} • {selectedSubmission.assessment_title}</p>
            </div>
            <div className="px-8 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">MCQ Score</label>
                <input type="number" value={gradeForm.mcq_score} onChange={e => setGradeForm({ ...gradeForm, mcq_score: +e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theory Score</label>
                <input type="number" value={gradeForm.theory_score} onChange={e => setGradeForm({ ...gradeForm, theory_score: +e.target.value })} className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Score</label>
                <input type="number" value={gradeForm.total_score} onChange={e => setGradeForm({ ...gradeForm, total_score: +e.target.value })} className="w-full px-4 py-2 border rounded-lg font-bold text-blue-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setGradeForm({ ...gradeForm, faculty_rating: star })} className={`p-2 rounded ${gradeForm.faculty_rating >= star ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100'}`}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
                <textarea value={gradeForm.faculty_feedback} onChange={e => setGradeForm({ ...gradeForm, faculty_feedback: e.target.value })} className="w-full px-4 py-2 border rounded-lg resize-none" rows={3} />
              </div>
            </div>
            <div className="px-8 py-4 bg-gray-50 border-t flex gap-2">
              <button onClick={() => setShowGradeModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100">Cancel</button>
              <button onClick={submitGrade} disabled={actionLoading} className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{actionLoading ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal (Standard) */}
      {selectedSubmission && !showGradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-8 py-6 border-b flex justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{selectedSubmission.student_name}</h3>
                <p className="text-sm text-gray-500">{selectedSubmission.assessment_title}</p>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="text-gray-500 text-2xl">✕</button>
            </div>
            <div className="px-8 py-6 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 p-3 rounded-lg"><p className="text-xs text-gray-500">MCQ</p><p className="text-xl font-bold text-blue-600">{selectedSubmission.mcq_score ?? '-'}</p></div>
                <div className="bg-purple-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Theory</p><p className="text-xl font-bold text-purple-600">{selectedSubmission.theory_score ?? '-'}</p></div>
                <div className="bg-green-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold text-green-600">{selectedSubmission.total_score ?? '-'}</p></div>
              </div>
              {selectedSubmission.faculty_feedback && <div className="bg-gray-50 p-4 rounded border"><p className="font-semibold text-sm">Feedback:</p><p className="text-sm text-gray-600">{selectedSubmission.faculty_feedback}</p></div>}
              {selectedSubmission.answers && (
                <div>
                  <label className="block text-sm font-medium mb-2">Answers JSON</label>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-48 text-xs font-mono"><pre>{JSON.stringify(selectedSubmission.answers, null, 2)}</pre></div>
                  <button onClick={() => downloadSubmission(selectedSubmission)} className="mt-2 w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"><Download className="w-4 h-4"/> Download</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubmissions;