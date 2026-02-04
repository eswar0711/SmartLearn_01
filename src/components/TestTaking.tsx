import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import type { User, Question } from '../utils/supabaseClient';
import { autoGradeMCQ } from '../utils/autoGrading';
import ConfirmationModal from './ConfirmationModal';
import QuestionDisplay from '../components/TestManager/QuestionDisplay';
import PremiumLoader from '../layouts/PremiumLoader';

import {
  getOrCreateTestSession,
  calculateRemainingTime,
  completeTestSession,
  lockTestSession,
  loadDraftAnswers,
  saveDraftAnswers,
  deleteDraftAnswers,
  type TestSession,
} from '../utils/testTimer';
import { Clock, AlertCircle, ChevronDown, Maximize, AlertTriangle, Lock } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface TestTakingProps {
  user: User;
}

const MAX_VIOLATIONS = 3;

const TestTaking: React.FC<TestTakingProps> = ({ user }) => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();

  // ============ STATE MANAGEMENT ============
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  
  const [testSession, setTestSession] = useState<TestSession | null>(null);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showUnansweredWarning, setShowUnansweredWarning] = useState(false);
  const [expandedHeader, setExpandedHeader] = useState(false);
  const [hasShownFiveMinWarning, setHasShownFiveMinWarning] = useState(false);
  const [hasShownOneMinWarning, setHasShownOneMinWarning] = useState(false);

  // Security State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false); 
  const [violationCount, setViolationCount] = useState(0);

  // Refs 
  const answersRef = useRef(answers);
  const questionsRef = useRef(questions);
  const submittingRef = useRef(submitting);
  const violationRef = useRef(violationCount);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { submittingRef.current = submitting; }, [submitting]);
  useEffect(() => { violationRef.current = violationCount; }, [violationCount]);

  // Persist Violations
  useEffect(() => {
    if (testSession && violationCount > 0) {
      localStorage.setItem(`violations_${testSession.id}`, violationCount.toString());
    }
  }, [violationCount, testSession]);

  // ============ SECURITY FEATURES ============

  const triggerFullScreen = async () => {
    try {
      const elem = document.documentElement;

      if (!document.fullscreenElement) {
         if (elem.requestFullscreen) {
            await elem.requestFullscreen();
         } else if ((elem as any).webkitRequestFullscreen) {
            await (elem as any).webkitRequestFullscreen();
         } else if ((elem as any).msRequestFullscreen) {
            await (elem as any).msRequestFullscreen();
         }
      }

      setTimeout(() => {
        if (document.fullscreenElement) {
          setIsFullScreen(true);
          setHasStarted(true);
        } else {
          toast.error("Please allow full screen to proceed.");
        }
      }, 300);

    } catch (err) {
      console.error("Full screen error:", err);
      toast.error("Full screen blocked. Please click anywhere and try again.");
    }
  };

  // Full Screen Watcher
  useEffect(() => {
    if (!hasStarted || submissionSuccess) return;

    const handleFullScreenChange = () => {
      const isCurrentlyFullScreen = !!document.fullscreenElement;
      setIsFullScreen(isCurrentlyFullScreen);

      // 🛑 FIX: Check submittingRef to ensure we don't punish user during submit
      if (!isCurrentlyFullScreen && !submittingRef.current && !submissionSuccess) {
        const newCount = violationRef.current + 1;
        setViolationCount(newCount);

        if (newCount >= MAX_VIOLATIONS) {
          toast.error("🚫 Maximum violations exceeded! Auto-submitting test...", {
            autoClose: false,
            closeButton: false
          });
          handleAutoSubmit();
        } else {
          toast.warning(`⚠️ Violation Recorded (${newCount}/${MAX_VIOLATIONS})`);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('MSFullscreenChange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullScreenChange);
    };
  }, [hasStarted, submissionSuccess]);

  // Navigation Blockers
  useEffect(() => {
    if (loading || submissionSuccess) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Warning: Leaving this page will end your test session.';
      return e.returnValue;
    };

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      toast.warning("🚫 Navigation blocked! You must submit the test to leave.", {
        toastId: 'nav-block'
      });
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [loading, submissionSuccess]);

  // ============ UTILITIES ============
  const formatTime = (seconds: number): string => {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const mins = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    const padZero = (num: number) => num.toString().padStart(2, '0');
    if (hours > 0) return `${hours}:${padZero(mins)}:${padZero(secs)}`;
    return `${mins}:${padZero(secs)}`;
  };

  const getTimeColor = (): string => {
    if ((timeLeft || 0) <= 300) return 'text-red-600';
    if ((timeLeft || 0) <= 600) return 'text-amber-600';
    return 'text-teal-600';
  };

  const getTimeBgColor = (): string => {
    if ((timeLeft || 0) <= 300) return 'bg-red-50 border-red-200';
    if ((timeLeft || 0) <= 600) return 'bg-amber-50 border-amber-200';
    return 'bg-teal-50 border-teal-200';
  };

  const getTimeStatus = (): string => {
    if ((timeLeft || 0) <= 300) return 'Critical';
    if ((timeLeft || 0) <= 600) return 'Low';
    return 'Good';
  };

  const getProgressPercentage = (): number => {
    if (questions.length === 0) return 0;
    return Math.round((Object.keys(answers).length / questions.length) * 100);
  };

  const getUnansweredCount = (): number => {
    return questions.length - Object.keys(answers).length;
  };

  // ============ INITIALIZATION ============
  useEffect(() => {
    if (!assessmentId) {
      setError('Assessment ID is missing');
      setLoading(false);
      return;
    }

    const initializeTest = async () => {
      try {
        setLoading(true);
        
        // 1. Check if ALREADY SUBMITTED
        const { data: existingSubmission } = await supabase
          .from('submissions')
          .select('id, submitted_at')
          .eq('assessment_id', assessmentId)
          .eq('student_id', user.id)
          .maybeSingle();

        if (existingSubmission && existingSubmission.submitted_at) {
          navigate(`/results-summary/${existingSubmission.id}`, { replace: true });
          return;
        }

        // 2. Load Assessment
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .single();

        if (assessmentError || !assessmentData) throw new Error('Failed to load assessment');
        setAssessment(assessmentData);

        // 3. Load Questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('question_number', { ascending: true });

        if (questionsError) throw new Error('Failed to load questions');
        
        setQuestions(questionsData || []);
        questionsRef.current = questionsData || [];

        // 4. Init Session
        const session = await getOrCreateTestSession(assessmentId, assessmentData.duration_minutes);
        setTestSession(session);

        // Restore Violations from LocalStorage
        const savedViolations = localStorage.getItem(`violations_${session.id}`);
        if (savedViolations) {
           const count = parseInt(savedViolations, 10);
           setViolationCount(count);
           violationRef.current = count; 
        }

        // 5. Load Drafts
        const draftAnswers = await loadDraftAnswers(session.id);
        setAnswers(draftAnswers);
        answersRef.current = draftAnswers;

        // 6. Calculate Time
        const remaining = calculateRemainingTime(session);
        setTimeLeft(remaining);

        if (remaining <= 0) {
          setIsTimeExpired(true);
          setTimeout(() => handleAutoSubmit(), 500); 
        }

        setLoading(false);
      } catch (error: any) {
        console.error('❌ Init error:', error);
        setError(error.message || 'Unknown error');
        setLoading(false);
      }
    };

    initializeTest();
  }, [assessmentId, user.id, navigate]);

  // ============ TIMER ============
  useEffect(() => {
    if (loading || isTimeExpired || submitting || timeLeft === null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isTimeExpired, submitting]);

  // ============ WATCHER ============
  useEffect(() => {
    if (timeLeft !== null && timeLeft <= 0 && !isTimeExpired && !loading && !submittingRef.current) {
      console.warn('⏱️ Timer finished! Triggering auto-submit...');
      setIsTimeExpired(true);
      handleAutoSubmit();
    }
    
    if (timeLeft !== null && timeLeft > 0) {
       if (timeLeft <= 300 && timeLeft > 60 && !hasShownFiveMinWarning) {
          setHasShownFiveMinWarning(true);
          toast.warning('⏰ 5 Minutes Remaining!');
       }
       if (timeLeft <= 60 && !hasShownOneMinWarning) {
          setHasShownOneMinWarning(true);
          toast.error('🚨 1 Minute Remaining! Submit now!');
       }
    }
  }, [timeLeft, isTimeExpired, loading, hasShownFiveMinWarning, hasShownOneMinWarning]);

  // ============ AUTO-SAVE ============
  useEffect(() => {
    if (!testSession || submitting || Object.keys(answers).length === 0) return;
    const saveInterval = setInterval(() => {
      saveDraftAnswers(testSession.id, answers);
    }, 5000);
    return () => clearInterval(saveInterval);
  }, [testSession, answers, submitting]);

  // ============ HANDLERS ============
  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleNavigateQuestion = (newIndex: number) => {
    setCurrentQuestionIndex(newIndex);
    setExpandedHeader(false);
  };

  const handleSubmitClick = () => {
    const unansweredQuestions = questions
      .map((q, idx) => (!answers[q.id] ? idx + 1 : null))
      .filter((n) => n !== null);

    if (unansweredQuestions.length > 0) {
      setShowUnansweredWarning(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmUnanswered = () => {
    setShowUnansweredWarning(false);
    setShowConfirmModal(true);
  };

  const handleAutoSubmit = async () => {
    if (submittingRef.current) return;
    await submitTest(true);
  };

  const handleConfirmSubmit = async () => {
    await submitTest(false);
  };

  // ============ SUBMIT LOGIC (FIXED) ============
  const submitTest = async (isAutoSubmit: boolean) => {
    if (!testSession) return;
    if (submittingRef.current) return;
    
    // 🛑 CRITICAL FIX: Update Ref IMMEDIATELY to prevent race condition
    // This tells the fullscreen listener "We are submitting, ignore the exit!"
    submittingRef.current = true;
    
    setSubmitting(true);

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {}); 
      }

      const currentAnswers = answersRef.current;
      const currentQuestions = questionsRef.current;

      await completeTestSession(testSession.id);

      const mcqScore = autoGradeMCQ(currentQuestions, currentAnswers);
      const totalMarks = currentQuestions.reduce((sum, q) => sum + q.marks, 0);
      const percentageScore = totalMarks > 0 ? Math.round((mcqScore / totalMarks) * 100) : 0;

      const { data: existingSubmission } = await supabase
        .from('submissions')
        .select('id')
        .eq('assessment_id', assessmentId)
        .eq('student_id', user.id)
        .maybeSingle();

      const submissionPayload = {
        assessment_id: assessmentId,
        student_id: user.id,
        test_session_id: testSession.id,
        answers: currentAnswers, 
        mcq_score: mcqScore,
        theory_score: null,
        total_score: percentageScore,
        is_auto_submitted: isAutoSubmit,
        submitted_at: new Date().toISOString(),
      };

      let submissionId;

      if (existingSubmission) {
        const { data, error } = await supabase
          .from('submissions')
          .update(submissionPayload)
          .eq('id', existingSubmission.id)
          .select()
          .single();
        if (error) throw error;
        submissionId = data.id;
      } else {
        const { data, error } = await supabase
          .from('submissions')
          .insert(submissionPayload)
          .select()
          .single();
        if (error) throw error;
        submissionId = data.id;
      }

      await lockTestSession(testSession.id, submissionId);
      await deleteDraftAnswers(testSession.id);

      // Cleanup
      localStorage.removeItem(`violations_${testSession.id}`);

      console.log('✅ Test submitted successfully');
      setSubmissionSuccess(true); 

      toast.success(
        isAutoSubmit ? '✅ Time expired. Test submitted.' : '✅ Test submitted successfully!',
        {
          position: 'top-right',
          autoClose: 2000,
          onClose: () => navigate(`/results-summary/${submissionId}`),
        }
      );

      if(isAutoSubmit) {
         setTimeout(() => navigate(`/results-summary/${submissionId}`), 2500);
      }

      setShowConfirmModal(false);

    } catch (error: any) {
      console.error('❌ Submit error:', error);
      
      if (isAutoSubmit) {
        toast.error("Saving... Redirecting...");
        setTimeout(() => navigate('/'), 3000);
      } else {
        setError('Error submitting: ' + error.message);
        setSubmitting(false);
        // Reset ref if error occurred
        submittingRef.current = false;
        setShowConfirmModal(false);
      }
    }
  };

  // ============ RENDER STATES ============

  if (loading) return <div className="flex justify-center items-center h-screen"><PremiumLoader message="Loading test..." /></div>;

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // 1. START SCREEN
  if (!hasStarted && !submissionSuccess && !isTimeExpired) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full text-center space-y-6">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
            <Maximize className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Proctored Assessment</h1>
            <p className="text-slate-600 mt-2">
              This assessment requires a secure environment. The test will run in full-screen mode.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-left text-sm text-blue-900">
            <p className="font-semibold mb-2">Examination Rules:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Full-screen mode must be active at all times.</li>
              <li>Switching tabs or windows is recorded as a violation.</li>
              <li>Exceeding {MAX_VIOLATIONS} violations will auto-submit the test.</li>
            </ul>
          </div>
          <button 
            onClick={triggerFullScreen}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            Agree & Start Test
          </button>
        </div>
      </div>
    );
  }

  // 2. VIOLATION SCREEN
  // 🛑 FIX: Added !submitting check. If we are submitting, DO NOT show this violation screen.
  if (hasStarted && !isFullScreen && !submissionSuccess && !isTimeExpired && !submitting) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center space-y-5 border-t-8 border-red-500">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Action Required</h2>
            <p className="text-slate-600 mt-2">
              You have exited full-screen mode. Please return to the assessment immediately.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 py-3 bg-red-50 rounded-lg border border-red-100">
            <div className="text-right">
              <span className="block text-xs font-semibold text-red-600 uppercase tracking-wider">Violations</span>
              <span className="block text-2xl font-bold text-red-700 leading-none">{violationCount}</span>
            </div>
            <div className="h-8 w-px bg-red-200"></div>
            <div className="text-left">
              <span className="block text-xs font-semibold text-red-600 uppercase tracking-wider">Remaining</span>
              <span className="block text-2xl font-bold text-red-700 leading-none">{Math.max(0, MAX_VIOLATIONS - violationCount)}</span>
            </div>
          </div>

          <button 
            onClick={triggerFullScreen}
            className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
          >
            Return to Full Screen
          </button>
        </div>
      </div>
    );
  }

  // 3. TIME EXPIRED
  if (isTimeExpired && !submissionSuccess) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Time Expired</h2>
          <p className="text-gray-600 mb-6">Submitting your answers...</p>
          
          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-6">
             <div className="h-full bg-blue-600 animate-progress"></div>
          </div>

          <button 
            onClick={() => handleAutoSubmit()} 
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Auto Submitted..! Click here to view result
          </button>
        </div>
      </div>
    );
  }

  if (!assessment) return null;

  // ============ MAIN RENDER ============
  return (
    <div className="flex bg-gray-100 min-h-screen">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className={`px-4 py-3 sm:px-6 sm:py-4 border-2 ${getTimeBgColor()} transition-colors duration-300`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-gray-800 truncate">{assessment.title}</h2>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{assessment.subject} • U{assessment.unit}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className={`flex items-center gap-1.5 font-mono text-lg sm:text-2xl font-bold ${getTimeColor()}`}>
                  <Clock className="w-5 h-5" />
                  <span>{formatTime(timeLeft || 0)}</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${timeLeft && timeLeft <= 300 ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'}`}>
                  {getTimeStatus()}
                </span>
              </div>
            </div>
          </div>
          {/* Mobile Header */}
          <div className="md:hidden border-t border-gray-100">
            <button onClick={() => setExpandedHeader(!expandedHeader)} className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Question {currentQuestionIndex + 1}/{questions.length}</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedHeader ? 'rotate-180' : ''}`} />
            </button>
            {expandedHeader && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 animate-in fade-in">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-700">Progress</span>
                  <span className="text-xs font-bold text-teal-600">{getProgressPercentage()}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-teal-500" style={{ width: `${getProgressPercentage()}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Question Display */}
        <QuestionDisplay
          questions={questions}
          answers={answers}
          currentQuestionIndex={currentQuestionIndex}
          onAnswerChange={handleAnswerChange}
          onNavigate={handleNavigateQuestion}
          onSubmit={handleSubmitClick}
          isTimeExpired={isTimeExpired}
          submitting={submitting}
          timeLeft={timeLeft || 0}
        />
      </div>

      <ConfirmationModal
        isOpen={showUnansweredWarning}
        title="Unanswered Questions"
        message={`You have ${getUnansweredCount()} unanswered questions.`}
        confirmLabel="Submit Anyway"
        cancelLabel="Continue"
        onConfirm={handleConfirmUnanswered}
        onCancel={() => setShowUnansweredWarning(false)}
        isLoading={false}
      />

      <ConfirmationModal
        isOpen={showConfirmModal}
        title="Submit Test?"
        message="Are you sure? You cannot change answers after submitting."
        confirmLabel="Submit"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
        isLoading={submitting}
      />

      <ToastContainer position="top-right" autoClose={5000} />
    </div>
  );
};

export default TestTaking;