import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import PremiumLoader from '../../layouts/PremiumLoader';
import {
  Download,
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  User,
  FileText,
  // CheckCircle,
  // XCircle
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

interface QuestionDetail {
  id: string;
  question_text: string;
  correct_answer: string;
  type: string;
}

const AdminSubmissions: React.FC<AdminSubmissionsProps> = ({ user }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [gradedFilter, setGradedFilter] = useState<'all' | 'graded' | 'ungraded'>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  // New state to store fetched questions for the modal
  const [submissionQuestions, setSubmissionQuestions] = useState<QuestionDetail[]>([]);
  
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

  useEffect(() => {
    filterSubmissions();
    setCurrentPage(1);
  }, [submissions, searchQuery, gradedFilter, subjectFilter, branchFilter]);

  // NEW: Fetch questions when a submission is selected for viewing
  useEffect(() => {
    if (selectedSubmission) {
      fetchQuestionsForSubmission(selectedSubmission.assessment_id);
    } else {
      setSubmissionQuestions([]); // Clear when modal closes
    }
  }, [selectedSubmission]);

  const fetchQuestionsForSubmission = async (assessmentId: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, type')
      .eq('assessment_id', assessmentId);
    
    if (!error && data) {
      setSubmissionQuestions(data);
    }
  };

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

    if (subjectFilter !== 'all') {
      filtered = filtered.filter(s => s.assessment_id === subjectFilter);
    }

    if (branchFilter !== 'all') {
      filtered = filtered.filter(s => s.student_branch_id === branchFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        s =>
          s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.student_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.assessment_title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (gradedFilter === 'graded') {
      filtered = filtered.filter(s => s.faculty_rating !== null);
    } else if (gradedFilter === 'ungraded') {
      filtered = filtered.filter(s => s.faculty_rating === null);
    }

    setFilteredSubmissions(filtered);
  };

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
      <div className="flex-1 p-4 md:p-8">
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Student Submissions</h2>
          <p className="text-gray-600 text-sm md:text-base">
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
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 mb-6 md:mb-8">
          <div className="flex items-center gap-2 mb-4 text-gray-500 text-sm">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Subject Filter */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">All Subjects</option>
                {getUniqueSubjects().map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.title}</option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                disabled={!!adminBranchId} 
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:text-gray-500 outline-none"
              >
                <option value="all">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select
                value={gradedFilter}
                onChange={(e) => setGradedFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Submissions</option>
                <option value="graded">Graded</option>
                <option value="ungraded">Ungraded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50/50">
            <p className="text-sm text-gray-600">
              Showing {filteredSubmissions.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
            </p>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No submissions found</div>
          ) : (
            <>
              {/* --- DESKTOP TABLE VIEW --- */}
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
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {getBranchName(submission.student_branch_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-700">
                          {submission.total_score !== null ? (
                            <span className={submission.total_score >= 40 ? 'text-green-600' : 'text-red-500'}>
                              {submission.total_score}/100
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isGraded(submission) ? (
                            <div className="flex items-center gap-1 text-yellow-600 font-medium">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {submission.faculty_rating}
                            </div>
                          ) : <span className="text-gray-400 text-xs italic">Pending</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(submission.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <button onClick={() => setSelectedSubmission(submission)} className="text-blue-600 hover:text-blue-800 font-medium text-xs uppercase tracking-wide">View</button>
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
                          }} className="text-green-600 hover:text-green-800 font-medium text-xs uppercase tracking-wide">Grade</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* --- MOBILE LIST VIEW --- */}
              <div className="md:hidden flex flex-col divide-y divide-gray-100">
                {paginatedSubmissions.map((submission) => (
                  <div key={submission.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm">{submission.student_name}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1">{submission.student_email}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                        {getBranchName(submission.student_branch_id)}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-sm font-medium text-gray-700 line-clamp-1">{submission.assessment_title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 ml-6">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Submitted: {new Date(submission.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="border border-gray-100 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Score</p>
                        <p className={`text-lg font-bold ${submission.total_score !== null && submission.total_score >= 40 ? 'text-green-600' : 'text-red-500'}`}>
                          {submission.total_score !== null ? submission.total_score : '-'}
                        </p>
                      </div>
                      <div className="border border-gray-100 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Rating</p>
                        <div className="flex items-center justify-center gap-1 h-7">
                          {isGraded(submission) ? (
                            <>
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-bold text-gray-700">{submission.faculty_rating}</span>
                            </>
                          ) : (
                            <span className="text-gray-300 text-sm">--</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <button 
                        onClick={() => setSelectedSubmission(submission)}
                        className="flex-1 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium transition-colors"
                      >
                        View Details
                      </button>
                      <button 
                        onClick={() => {
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
                        }}
                        className="flex-1 py-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg font-medium transition-colors"
                      >
                        Grade
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              <div className="px-4 md:px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <button onClick={goToPreviousPage} disabled={currentPage === 1} className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm shadow-sm"><ChevronLeft className="w-4 h-4" /> Prev</button>
                <div className="text-xs md:text-sm text-gray-600 font-medium">Page {currentPage} of {totalPages || 1}</div>
                <button onClick={goToNextPage} disabled={currentPage === totalPages || totalPages === 0} className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm shadow-sm">Next <ChevronRight className="w-4 h-4" /></button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grade Modal */}
      {showGradeModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-200 bg-white sticky top-0 z-10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Grade Submission</h3>
                <p className="text-xs text-gray-500 mt-0.5 max-w-[200px] truncate">{selectedSubmission.student_name}</p>
              </div>
              <button onClick={() => setShowGradeModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">✕</button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">MCQ Score</label>
                  <input type="number" value={gradeForm.mcq_score} onChange={e => setGradeForm({ ...gradeForm, mcq_score: +e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Theory Score</label>
                  <input type="number" value={gradeForm.theory_score} onChange={e => setGradeForm({ ...gradeForm, theory_score: +e.target.value })} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Score</label>
                <input type="number" value={gradeForm.total_score} onChange={e => setGradeForm({ ...gradeForm, total_score: +e.target.value })} className="w-full px-3 py-2 border rounded-lg font-bold text-blue-600 bg-blue-50 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setGradeForm({ ...gradeForm, faculty_rating: star })} className={`p-2 rounded-lg transition-colors ${gradeForm.faculty_rating >= star ? 'bg-yellow-100 text-yellow-600 ring-1 ring-yellow-300' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'}`}>
                      <Star className={`w-5 h-5 ${gradeForm.faculty_rating >= star ? 'fill-yellow-500' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Feedback</label>
                <textarea value={gradeForm.faculty_feedback} onChange={e => setGradeForm({ ...gradeForm, faculty_feedback: e.target.value })} className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="Add comments..." />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
              <button onClick={() => setShowGradeModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-white text-gray-700 font-medium">Cancel</button>
              <button onClick={submitGrade} disabled={actionLoading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 font-medium shadow-sm">{actionLoading ? 'Saving...' : 'Save Grade'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal (Enhanced with Question Text) */}
      {selectedSubmission && !showGradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 border-b flex justify-between items-start bg-gray-50 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{selectedSubmission.student_name}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedSubmission.assessment_title}</p>
              </div>
              <button onClick={() => setSelectedSubmission(null)} className="p-2 bg-white rounded-full hover:bg-gray-100 text-gray-500 shadow-sm">✕</button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Score Summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">MCQ</p>
                  <p className="text-2xl font-bold text-blue-700">{selectedSubmission.mcq_score ?? '-'}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Theory</p>
                  <p className="text-2xl font-bold text-purple-700">{selectedSubmission.theory_score ?? '-'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1">Total</p>
                  <p className="text-2xl font-bold text-green-700">{selectedSubmission.total_score ?? '-'}</p>
                </div>
              </div>
              
              {/* Faculty Feedback */}
              {selectedSubmission.faculty_feedback && (
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                    <span className="font-bold text-yellow-800">Faculty Feedback</span>
                  </div>
                  <p className="text-sm text-yellow-900 italic">"{selectedSubmission.faculty_feedback}"</p>
                </div>
              )}

              {/* ⭐ NEW: Q&A Section (Replaces raw JSON) */}
{selectedSubmission.answers && (
  <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm p-6">

    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-500" />
        Detailed Responses
      </h3>

      <button
        onClick={() => downloadSubmission(selectedSubmission)}
        className="flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition px-4 py-2 rounded-full"
      >
        <Download className="w-3 h-3" />
        Download JSON
      </button>
    </div>

    {/* Cards */}
    <div className="space-y-5">
      {Object.entries(selectedSubmission.answers).map(([questionId, userAnswer], index) => {
        const question = submissionQuestions.find(q => q.id === questionId);

        const isCorrect =
          question &&
          String(userAnswer).trim().toLowerCase() ===
            String(question.correct_answer).trim().toLowerCase();

        return (
          <div
            key={questionId}
            className="group relative rounded-xl border border-slate-200 bg-white p-5 hover:shadow-lg transition-all duration-300"
          >
            {/* Question */}
            <div className="flex gap-4 mb-4">

              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold flex items-center justify-center">
                {index + 1}
              </div>

              <p className="text-sm font-medium text-slate-800 leading-relaxed">
                {question ? question.question_text : "Loading question..."}
              </p>

              {question && (
                <span
                  className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${
                    isCorrect
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {isCorrect ? "Correct" : "Wrong"}
                </span>
              )}
            </div>

            {/* Answers */}
            <div className="ml-12 grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Student */}
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold mb-1">
                  Student Answer
                </p>
                <p className="text-sm font-medium text-slate-800">
                  {String(userAnswer)}
                </p>
              </div>

              {/* Correct */}
              {question && (
                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold mb-1">
                    Correct Answer
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {question.correct_answer}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
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