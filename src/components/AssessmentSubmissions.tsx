import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import type { Question, Submission } from '../utils/supabaseClient';
import { 
  X, 
  Download, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  FileText,
  AlertCircle,
  Eye // Imported Eye icon for View button
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import PremiumLoader from '../layouts/PremiumLoader';

interface SubmissionWithUser extends Submission {
  student_name?: string;
  student_email?: string;
  assessment_title?: string;
}

interface AssessmentSubmissionsProps {
  assessmentId: string;
  onClose: () => void;
}

const AssessmentSubmissions: React.FC<AssessmentSubmissionsProps> = ({
  assessmentId,
  onClose,
}) => {
  const [submissions, setSubmissions] = useState<SubmissionWithUser[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editScores, setEditScores] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);
  
  // State for the currently selected submission to view in modal
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithUser | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [assessmentId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch assessment title
    const { data: assessmentData } = await supabase
      .from('assessments')
      .select('title')
      .eq('id', assessmentId)
      .single();

    // Fetch submissions for this assessment
    const { data: subs, error: subsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('assessment_id', assessmentId);

    if (subsError) {
      console.error('Error fetching submissions:', subsError);
      setLoading(false);
      return;
    }

    // Fetch student info for each submission
    const submissionsWithUsers: SubmissionWithUser[] = [];

    if (subs) {
      for (const sub of subs) {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', sub.student_id)
          .single();

        submissionsWithUsers.push({
          ...sub,
          student_name: userData?.full_name || 'Student',
          student_email: userData?.email || '-',
          assessment_title: assessmentData?.title || 'Assessment',
        });
      }
    }

    setSubmissions(submissionsWithUsers);

    // Fetch questions for this assessment
    const { data: qs } = await supabase
      .from('questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: true }); 

    setQuestions(qs || []);
    setLoading(false);
  };

  const handleScoreChange = (submissionId: string, value: string) => {
    setEditScores((prev) => ({ ...prev, [submissionId]: value }));
  };

  const saveTheoryScore = async (submissionId: string) => {
    const score = Number(editScores[submissionId]);
    if (isNaN(score)) {
      toast.error('Please enter a valid number');
      return;
    }

    const { error } = await supabase
      .from('submissions')
      .update({ theory_score: score })
      .eq('id', submissionId);

    if (error) {
      console.error('Error saving score:', error);
      toast.error('Error saving score');
      return;
    }

    toast.success('Score saved successfully!');
    fetchData(); 
    // Update local state if viewing specific submission
    if (selectedSubmission && selectedSubmission.id === submissionId) {
        setSelectedSubmission(prev => prev ? {...prev, theory_score: score} : null);
    }
  };

  const getTheoryQuestions = () => {
    return questions.filter((q) => q.type === 'Theory');
  };

  const getTheoryAnswers = (sub: SubmissionWithUser) => {
    const theoryQs = getTheoryQuestions();
    return theoryQs.map((q) => ({
      questionText: q.question_text,
      maxMarks: q.marks,
      studentAnswer: sub.answers[q.id] || 'No answer provided',
    }));
  };

  const getTotalTheoryMarks = () => {
    return getTheoryQuestions().reduce((sum, q) => sum + q.marks, 0);
  };

  const getAnswerStatus = (studentAns: any, correctAns: string) => {
    if (!studentAns) return 'neutral';
    return String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase()
      ? 'correct'
      : 'incorrect';
  };

  const downloadExcel = async () => {
    if (submissions.length === 0) {
      toast.warning('No submissions to export');
      return;
    }

    setIsExporting(true);

    try {
      const assessmentTitle = submissions[0]?.assessment_title || 'Assessment';

      const summaryData = submissions.map((sub) => ({
        'Student Name': sub.student_name || '-',
        'Student Email': sub.student_email || '-',
        'Submission Date': sub.submitted_at
          ? new Date(sub.submitted_at).toLocaleString('en-IN')
          : '-',
        'MCQ Score': sub.mcq_score || 0,
        'Total Score': sub.total_score || 0,
        'Theory Score': sub.theory_score || 0,
         'Status': sub.theory_score === null ? 'Pending' : 'Graded',
      }));

      const detailedData: any[] = [];

      submissions.forEach((sub, idx) => {
        detailedData.push({
          'Student Name': sub.student_name,
          'Email': sub.student_email,
          'Submitted': sub.submitted_at
            ? new Date(sub.submitted_at).toLocaleString('en-IN')
            : '-',
          'MCQ Score': sub.mcq_score || 0,
          'Total Score': sub.total_score || 0,
        });

        detailedData.push({});

        const theoryAnswers = getTheoryAnswers(sub);
        if (theoryAnswers.length > 0) {
          theoryAnswers.forEach((answer, qIdx) => {
            detailedData.push({
              'Question Number': `Q${qIdx + 1}`,
              'Question': answer.questionText,
              'Max Marks': answer.maxMarks,
              'Student Answer': answer.studentAnswer,
            });
          });
        } else {
          detailedData.push({
            'Question Number': 'N/A',
            'Question': 'No theory questions in this assessment',
          });
        }

        if (idx < submissions.length - 1) {
          detailedData.push({});
        }
      });

      const wb = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      summarySheet['!cols'] = [
        { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
      detailedSheet['!cols'] = [
        { wch: 18 }, { wch: 50 }, { wch: 12 }, { wch: 40 }, { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, detailedSheet, 'Detailed Answers');

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${assessmentTitle}_Submissions_${dateStr}.xlsx`;

      XLSX.writeFile(wb, filename);

      toast.success(`Excel file "${filename}" downloaded successfully!`);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel file');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Main Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Assessment Submissions</h2>
            <p className="text-sm text-gray-600 mt-1">
              {submissions.length} student{submissions.length !== 1 ? 's' : ''} submitted
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadExcel}
              disabled={isExporting || submissions.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Excel
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* List of Submissions */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
               <PremiumLoader message="Loading submissions..." />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <div className="bg-white p-6 rounded-full inline-block mb-4 shadow-sm">
                <FileText className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No submissions yet</h3>
              <p className="text-gray-500 mt-1">When students complete this assessment, their work will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-sm transition-shadow"
                >
                  {/* Student Summary */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {sub.student_name}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-600 mt-1">
                      <span>{sub.student_email}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>Submitted: {new Date(sub.submitted_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Scores & Action */}
                  <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-auto">
                    <div className="text-right">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total</div>
                        <div className="text-xl font-bold text-green-600">{sub.total_score}</div>
                    </div>
                    
                    <button
                        onClick={() => setSelectedSubmission(sub)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 font-medium rounded-lg transition-colors border border-blue-200"
                    >
                        <Eye className="w-4 h-4" />
                        View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- Detailed View Modal --- */}
      {selectedSubmission && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">{selectedSubmission.student_name}</h3>
                        <p className="text-sm text-gray-500">{selectedSubmission.student_email}</p>
                    </div>
                    <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">
                    
                    {/* Score Summary Card */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                            <p className="text-xs font-bold text-blue-500 uppercase mb-1">MCQ Score</p>
                            <p className="text-2xl font-bold text-blue-700">{selectedSubmission.mcq_score}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                            <p className="text-xs font-bold text-green-500 uppercase mb-1">Total Score</p>
                            <p className="text-2xl font-bold text-green-700">{selectedSubmission.total_score}</p>
                        </div>
                    </div>

                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Detailed Responses
                    </h4>

                    {/* Questions List */}
                    <div className="space-y-6">
                      {questions.map((q, idx) => {
                        const studentAnswer = selectedSubmission.answers[q.id];
                        const isTheory = q.type === 'Theory';
                        const status = !isTheory ? getAnswerStatus(studentAnswer, q.correct_answer || '') : 'neutral';

                        return (
                          <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors shadow-sm">
                            <div className="flex gap-3">
                              {/* Icon Indicator */}
                              <div className="mt-0.5 flex-shrink-0">
                                {isTheory ? (
                                  <HelpCircle className="w-5 h-5 text-purple-500" />
                                ) : status === 'correct' ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-500" />
                                )}
                              </div>

                              <div className="flex-1">
                                {/* Question Text */}
                                <div className="flex justify-between gap-4 mb-3">
                                  <div className="text-base font-medium text-gray-900">
                                    <span className="text-gray-500 mr-2 font-bold">Q{idx + 1}.</span>
                                    {q.question_text}
                                  </div>
                                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded h-fit whitespace-nowrap">
                                    {q.marks} Marks
                                  </span>
                                </div>

                                {/* Answers Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Student Answer */}
                                  <div className={`p-4 rounded-lg border ${
                                    isTheory 
                                      ? 'bg-purple-50 border-purple-100' 
                                      : status === 'correct' 
                                        ? 'bg-green-50 border-green-100' 
                                        : 'bg-red-50 border-red-100'
                                  }`}>
                                    <p className="text-xs font-bold uppercase mb-1 opacity-70">
                                      Student Answer
                                    </p>
                                    <p className="text-sm font-medium text-gray-800 break-words">
                                      {studentAnswer || <span className="italic opacity-50">No answer provided</span>}
                                    </p>
                                  </div>

                                  {/* Correct Answer (Only for MCQs) */}
                                  {!isTheory && (
                                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-100">
                                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">
                                        Correct Answer
                                      </p>
                                      <p className="text-sm font-medium text-gray-700 break-words">
                                        {q.correct_answer}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Manual Grading Section (Only if Theory Questions Exist) */}
                    {getTotalTheoryMarks() > 0 && (
                      <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100 mt-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-yellow-900 font-bold flex items-center gap-2">
                              <AlertCircle className="w-5 h-5" />
                              Manual Grading Required
                            </h4>
                            <p className="text-sm text-yellow-800 mt-1">
                              Review the theory answers above and assign a score.
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-yellow-200 shadow-sm">
                            <div className="px-2">
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                Theory Score (Max: {getTotalTheoryMarks()})
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={getTotalTheoryMarks()}
                                value={
                                  editScores[selectedSubmission.id] !== undefined
                                    ? editScores[selectedSubmission.id]
                                    : selectedSubmission.theory_score ?? ''
                                }
                                onChange={(e) => handleScoreChange(selectedSubmission.id, e.target.value)}
                                className="w-full text-xl font-bold text-gray-900 border-none focus:ring-0 p-0 placeholder-gray-300 bg-transparent outline-none"
                                placeholder="0"
                              />
                            </div>
                            <button
                              onClick={() => saveTheoryScore(selectedSubmission.id)}
                              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
                            >
                              Save Score
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 text-right">
                           <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-2">Grading Status:</span>
                           <span className={`px-2 py-1 rounded text-xs font-bold ${selectedSubmission.theory_score === null ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                             {selectedSubmission.theory_score === null ? 'Pending' : 'Graded'}
                           </span>
                        </div>
                      </div>
                    )}

                </div>
                {/* Modal Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button onClick={() => setSelectedSubmission(null)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentSubmissions;