import React, { useState, useCallback, useEffect } from 'react';
import { 
  MessageSquare, 
  Star, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle,
  CheckCircle,
  Target,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  Download
} from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface FeedbackEntry {
  id: string;
  userId: string;
  timestamp: Date;
  sessionId?: string;
  feedbackType: 'coaching_quality' | 'user_experience' | 'technical_performance' | 'feature_request' | 'bug_report' | 'general';
  
  // Rating-based feedback (1-5 scale)
  ratings: {
    coachingEffectiveness: number;
    promptQuality: number;
    userInterface: number;
    technicalPerformance: number;
    overallSatisfaction: number;
  };
  
  // Qualitative feedback
  textFeedback: {
    whatWorkedWell: string;
    whatNeedsImprovement: string;
    specificIssues: string;
    suggestedImprovements: string;
    additionalComments: string;
  };
  
  // Context-specific feedback
  contextData: {
    currentFeature?: string;
    coachingPromptUsed?: string;
    callOutcome?: 'closed' | 'follow_up' | 'rejected' | 'no_outcome';
    callDuration?: number;
    promptsUsedCount?: number;
    technicalIssuesEncountered?: string[];
  };
  
  // User satisfaction metrics
  satisfactionMetrics: {
    wouldRecommend: boolean;
    willingToTestAgain: boolean;
    expectedOutcomeAchieved: boolean;
    learningCurveRating: number; // 1-5 (1 = very difficult, 5 = very easy)
    valuePerceptionRating: number; // 1-5 (1 = no value, 5 = extremely valuable)
  };
  
  // Follow-up information
  followUp: {
    contactForDetails: boolean;
    participateInInterview: boolean;
    shareCallRecording: boolean;
    anonymousSubmission: boolean;
  };
}

interface PostCallSurvey {
  sessionId: string;
  callMetrics: {
    actualOutcome: 'closed' | 'follow_up' | 'rejected' | 'no_outcome';
    coachingHelpfulness: number; // 1-5
    promptsUsefulnessRating: number; // 1-5
    distractionLevel: number; // 1-5 (1 = not distracting, 5 = very distracting)
    confidenceImprovement: number; // 1-5
    salesPerformanceImpact: number; // 1-5
  };
  
  specificPromptFeedback: Array<{
    promptText: string;
    wasUsed: boolean;
    wasHelpful: boolean;
    helpfulnessRating: number; // 1-5
    timeliness: number; // 1-5
    relevance: number; // 1-5
  }>;
  
  technicalExperience: {
    transcriptionAccuracy: number; // 1-5
    responseTime: number; // 1-5
    systemStability: number; // 1-5
    interfaceIntuitivenss: number; // 1-5
  };
}

interface FeedbackCollectionSystemProps {
  isVisible: boolean;
  onClose: () => void;
  currentUserId?: string;
  currentSessionId?: string;
  triggerType?: 'post_call' | 'feature_feedback' | 'error_report' | 'periodic_check';
  contextData?: any;
}

const FeedbackCollectionSystem: React.FC<FeedbackCollectionSystemProps> = ({
  isVisible,
  onClose,
  currentUserId = 'anonymous',
  currentSessionId,
  triggerType = 'general',
  contextData
}) => {
  const trail = new BreadcrumbTrail('FeedbackCollectionSystem');
  
  const [currentStep, setCurrentStep] = useState<'type_selection' | 'rating_feedback' | 'detailed_feedback' | 'post_call_survey' | 'completion'>('type_selection');
  const [feedbackType, setFeedbackType] = useState<FeedbackEntry['feedbackType']>('general');
  
  // Feedback form state
  const [ratings, setRatings] = useState({
    coachingEffectiveness: 0,
    promptQuality: 0,
    userInterface: 0,
    technicalPerformance: 0,
    overallSatisfaction: 0
  });
  
  const [textFeedback, setTextFeedback] = useState({
    whatWorkedWell: '',
    whatNeedsImprovement: '',
    specificIssues: '',
    suggestedImprovements: '',
    additionalComments: ''
  });
  
  const [satisfactionMetrics, setSatisfactionMetrics] = useState({
    wouldRecommend: false,
    willingToTestAgain: false,
    expectedOutcomeAchieved: false,
    learningCurveRating: 0,
    valuePerceptionRating: 0
  });
  
  const [followUp, setFollowUp] = useState({
    contactForDetails: false,
    participateInInterview: false,
    shareCallRecording: false,
    anonymousSubmission: true
  });
  
  // Post-call survey specific state
  const [postCallSurvey, setPostCallSurvey] = useState<PostCallSurvey>({
    sessionId: currentSessionId || '',
    callMetrics: {
      actualOutcome: 'no_outcome',
      coachingHelpfulness: 0,
      promptsUsefulnessRating: 0,
      distractionLevel: 0,
      confidenceImprovement: 0,
      salesPerformanceImpact: 0
    },
    specificPromptFeedback: [],
    technicalExperience: {
      transcriptionAccuracy: 0,
      responseTime: 0,
      systemStability: 0,
      interfaceIntuitivenss: 0
    }
  });
  
  // Analytics state
  const [feedbackAnalytics, setFeedbackAnalytics] = useState({
    totalFeedbacks: 0,
    averageRatings: {
      coachingEffectiveness: 0,
      promptQuality: 0,
      userInterface: 0,
      technicalPerformance: 0,
      overallSatisfaction: 0
    },
    feedbackTrends: [] as Array<{ date: string; count: number; averageRating: number }>,
    commonIssues: [] as Array<{ issue: string; frequency: number; severity: 'low' | 'medium' | 'high' }>,
    userSatisfactionTrend: 0
  });

  // Initialize feedback system
  useEffect(() => {
    trail.light(600, { operation: 'feedback_system_init', triggerType, currentUserId });
    
    // Load existing feedback data
    loadFeedbackAnalytics();
    
    // Auto-determine feedback type based on trigger
    if (triggerType === 'post_call') {
      setFeedbackType('coaching_quality');
      setCurrentStep('post_call_survey');
    } else if (triggerType === 'error_report') {
      setFeedbackType('technical_performance');
      setCurrentStep('detailed_feedback');
    }
  }, [triggerType, currentUserId]);

  const loadFeedbackAnalytics = useCallback(() => {
    try {
      const savedFeedbacks = localStorage.getItem('voicecoach_feedbacks');
      if (savedFeedbacks) {
        const feedbacks: FeedbackEntry[] = JSON.parse(savedFeedbacks);
        updateFeedbackAnalytics(feedbacks);
      }
    } catch (error) {
      trail.fail(600, error as Error);
    }
  }, []);

  const updateFeedbackAnalytics = useCallback((feedbacks: FeedbackEntry[]) => {
    const totalFeedbacks = feedbacks.length;
    
    if (totalFeedbacks === 0) {
      setFeedbackAnalytics(prev => ({ ...prev, totalFeedbacks: 0 }));
      return;
    }
    
    // Calculate average ratings
    const averageRatings = {
      coachingEffectiveness: feedbacks.reduce((sum, f) => sum + f.ratings.coachingEffectiveness, 0) / totalFeedbacks,
      promptQuality: feedbacks.reduce((sum, f) => sum + f.ratings.promptQuality, 0) / totalFeedbacks,
      userInterface: feedbacks.reduce((sum, f) => sum + f.ratings.userInterface, 0) / totalFeedbacks,
      technicalPerformance: feedbacks.reduce((sum, f) => sum + f.ratings.technicalPerformance, 0) / totalFeedbacks,
      overallSatisfaction: feedbacks.reduce((sum, f) => sum + f.ratings.overallSatisfaction, 0) / totalFeedbacks
    };
    
    // Analyze trends and common issues
    const recentFeedbacks = feedbacks.filter(f => 
      new Date(f.timestamp).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000) // Last 7 days
    );
    
    const userSatisfactionTrend = recentFeedbacks.length > 0
      ? recentFeedbacks.reduce((sum, f) => sum + f.ratings.overallSatisfaction, 0) / recentFeedbacks.length
      : 0;
    
    setFeedbackAnalytics(prev => ({
      ...prev,
      totalFeedbacks,
      averageRatings,
      userSatisfactionTrend
    }));
  }, []);

  const submitFeedback = useCallback(async () => {
    trail.light(601, { operation: 'submit_feedback', feedbackType, userId: currentUserId });
    
    const feedbackEntry: FeedbackEntry = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUserId,
      timestamp: new Date(),
      sessionId: currentSessionId,
      feedbackType,
      ratings,
      textFeedback,
      contextData: contextData || {},
      satisfactionMetrics,
      followUp
    };
    
    try {
      // Save feedback to localStorage
      const existingFeedbacks = localStorage.getItem('voicecoach_feedbacks');
      const feedbacks = existingFeedbacks ? JSON.parse(existingFeedbacks) : [];
      feedbacks.push(feedbackEntry);
      localStorage.setItem('voicecoach_feedbacks', JSON.stringify(feedbacks));
      
      // Update analytics
      updateFeedbackAnalytics(feedbacks);
      
      // In production, this would send to analytics service
      console.log('📝 Feedback submitted:', feedbackEntry);
      
      setCurrentStep('completion');
      
      // Auto-close after showing completion
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      trail.fail(601, error as Error);
      console.error('Failed to submit feedback:', error);
    }
  }, [currentUserId, currentSessionId, feedbackType, ratings, textFeedback, satisfactionMetrics, followUp, contextData, onClose, updateFeedbackAnalytics]);

  const submitPostCallSurvey = useCallback(async () => {
    trail.light(602, { operation: 'submit_post_call_survey', sessionId: currentSessionId });
    
    try {
      // Save post-call survey data
      const existingSurveys = localStorage.getItem('voicecoach_post_call_surveys');
      const surveys = existingSurveys ? JSON.parse(existingSurveys) : [];
      surveys.push(postCallSurvey);
      localStorage.setItem('voicecoach_post_call_surveys', JSON.stringify(surveys));
      
      console.log('📊 Post-call survey submitted:', postCallSurvey);
      
      setCurrentStep('completion');
      
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      trail.fail(602, error as Error);
    }
  }, [postCallSurvey, currentSessionId, onClose]);

  const StarRating: React.FC<{ value: number; onChange: (value: number) => void; label: string }> = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`w-8 h-8 ${
              star <= value 
                ? 'text-yellow-400 hover:text-yellow-300' 
                : 'text-slate-600 hover:text-slate-500'
            } transition-colors`}
          >
            <Star className={`w-full h-full ${star <= value ? 'fill-current' : ''}`} />
          </button>
        ))}
      </div>
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-4xl max-h-[90vh] m-4 bg-slate-900 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">
              {triggerType === 'post_call' ? 'Post-Call Feedback' : 'User Feedback Collection'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <div className={`w-2 h-2 rounded-full ${currentStep === 'type_selection' ? 'bg-blue-400' : 'bg-slate-600'}`} />
              <span>Type Selection</span>
              <div className="w-4 h-px bg-slate-600" />
              <div className={`w-2 h-2 rounded-full ${currentStep === 'rating_feedback' || currentStep === 'post_call_survey' ? 'bg-blue-400' : 'bg-slate-600'}`} />
              <span>Ratings</span>
              <div className="w-4 h-px bg-slate-600" />
              <div className={`w-2 h-2 rounded-full ${currentStep === 'detailed_feedback' ? 'bg-blue-400' : 'bg-slate-600'}`} />
              <span>Details</span>
              <div className="w-4 h-px bg-slate-600" />
              <div className={`w-2 h-2 rounded-full ${currentStep === 'completion' ? 'bg-green-400' : 'bg-slate-600'}`} />
              <span>Complete</span>
            </div>
          </div>

          {/* Step 1: Feedback Type Selection */}
          {currentStep === 'type_selection' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">What would you like to provide feedback about?</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { type: 'coaching_quality', icon: Target, label: 'Coaching Quality', description: 'AI coaching prompts and effectiveness' },
                    { type: 'user_experience', icon: Users, label: 'User Experience', description: 'Interface design and usability' },
                    { type: 'technical_performance', icon: BarChart3, label: 'Technical Performance', description: 'Speed, stability, and reliability' },
                    { type: 'feature_request', icon: TrendingUp, label: 'Feature Request', description: 'New features or improvements' },
                    { type: 'bug_report', icon: AlertTriangle, label: 'Bug Report', description: 'Technical issues or errors' },
                    { type: 'general', icon: MessageSquare, label: 'General Feedback', description: 'Overall thoughts and suggestions' }
                  ].map(({ type, icon: Icon, label, description }) => (
                    <button
                      key={type}
                      onClick={() => {
                        setFeedbackType(type as FeedbackEntry['feedbackType']);
                        setCurrentStep('rating_feedback');
                      }}
                      className={`p-4 rounded-lg border transition-all duration-200 text-left ${
                        feedbackType === type
                          ? 'border-blue-500 bg-blue-900/20'
                          : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <Icon className="w-5 h-5 text-blue-400" />
                        <span className="font-medium text-white">{label}</span>
                      </div>
                      <p className="text-sm text-slate-400">{description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Rating Feedback */}
          {currentStep === 'rating_feedback' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Please rate your experience</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StarRating
                  value={ratings.coachingEffectiveness}
                  onChange={(value) => setRatings(prev => ({ ...prev, coachingEffectiveness: value }))}
                  label="Coaching Effectiveness"
                />
                
                <StarRating
                  value={ratings.promptQuality}
                  onChange={(value) => setRatings(prev => ({ ...prev, promptQuality: value }))}
                  label="Prompt Quality"
                />
                
                <StarRating
                  value={ratings.userInterface}
                  onChange={(value) => setRatings(prev => ({ ...prev, userInterface: value }))}
                  label="User Interface"
                />
                
                <StarRating
                  value={ratings.technicalPerformance}
                  onChange={(value) => setRatings(prev => ({ ...prev, technicalPerformance: value }))}
                  label="Technical Performance"
                />
                
                <div className="md:col-span-2">
                  <StarRating
                    value={ratings.overallSatisfaction}
                    onChange={(value) => setRatings(prev => ({ ...prev, overallSatisfaction: value }))}
                    label="Overall Satisfaction"
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('type_selection')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('detailed_feedback')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Detailed Feedback */}
          {currentStep === 'detailed_feedback' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Tell us more about your experience</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    What worked well?
                  </label>
                  <textarea
                    value={textFeedback.whatWorkedWell}
                    onChange={(e) => setTextFeedback(prev => ({ ...prev, whatWorkedWell: e.target.value }))}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white resize-none"
                    rows={3}
                    placeholder="Tell us about the positive aspects of your experience..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    What needs improvement?
                  </label>
                  <textarea
                    value={textFeedback.whatNeedsImprovement}
                    onChange={(e) => setTextFeedback(prev => ({ ...prev, whatNeedsImprovement: e.target.value }))}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white resize-none"
                    rows={3}
                    placeholder="Share areas that could be improved..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Suggested improvements
                  </label>
                  <textarea
                    value={textFeedback.suggestedImprovements}
                    onChange={(e) => setTextFeedback(prev => ({ ...prev, suggestedImprovements: e.target.value }))}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white resize-none"
                    rows={3}
                    placeholder="What specific changes would you suggest?"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Additional comments
                  </label>
                  <textarea
                    value={textFeedback.additionalComments}
                    onChange={(e) => setTextFeedback(prev => ({ ...prev, additionalComments: e.target.value }))}
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white resize-none"
                    rows={2}
                    placeholder="Any other thoughts or comments?"
                  />
                </div>
              </div>
              
              {/* Satisfaction metrics */}
              <div className="space-y-4">
                <h4 className="font-medium text-white">Additional Questions</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={satisfactionMetrics.wouldRecommend}
                      onChange={(e) => setSatisfactionMetrics(prev => ({ ...prev, wouldRecommend: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded"
                    />
                    <span className="text-slate-300">I would recommend VoiceCoach to other sales professionals</span>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={satisfactionMetrics.willingToTestAgain}
                      onChange={(e) => setSatisfactionMetrics(prev => ({ ...prev, willingToTestAgain: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded"
                    />
                    <span className="text-slate-300">I'm willing to participate in future beta testing</span>
                  </label>
                  
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={satisfactionMetrics.expectedOutcomeAchieved}
                      onChange={(e) => setSatisfactionMetrics(prev => ({ ...prev, expectedOutcomeAchieved: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded"
                    />
                    <span className="text-slate-300">VoiceCoach met my expectations for sales coaching</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('rating_feedback')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={submitFeedback}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Feedback</span>
                </button>
              </div>
            </div>
          )}

          {/* Post-Call Survey */}
          {currentStep === 'post_call_survey' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">How did VoiceCoach help with your call?</h3>
              
              <div className="space-y-6">
                {/* Call outcome */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Call outcome</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'closed', label: 'Deal Closed', icon: CheckCircle, color: 'green' },
                      { value: 'follow_up', label: 'Follow-up Scheduled', icon: Clock, color: 'blue' },
                      { value: 'rejected', label: 'Rejected', icon: ThumbsDown, color: 'red' },
                      { value: 'no_outcome', label: 'No Clear Outcome', icon: AlertTriangle, color: 'yellow' }
                    ].map(({ value, label, icon: Icon, color }) => (
                      <button
                        key={value}
                        onClick={() => setPostCallSurvey(prev => ({
                          ...prev,
                          callMetrics: { ...prev.callMetrics, actualOutcome: value as any }
                        }))}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          postCallSurvey.callMetrics.actualOutcome === value
                            ? `border-${color}-500 bg-${color}-900/20`
                            : 'border-slate-600 bg-slate-800 hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 text-${color}-400`} />
                          <span className="text-white text-sm">{label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coaching effectiveness ratings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <StarRating
                    value={postCallSurvey.callMetrics.coachingHelpfulness}
                    onChange={(value) => setPostCallSurvey(prev => ({
                      ...prev,
                      callMetrics: { ...prev.callMetrics, coachingHelpfulness: value }
                    }))}
                    label="How helpful was the AI coaching?"
                  />
                  
                  <StarRating
                    value={postCallSurvey.callMetrics.confidenceImprovement}
                    onChange={(value) => setPostCallSurvey(prev => ({
                      ...prev,
                      callMetrics: { ...prev.callMetrics, confidenceImprovement: value }
                    }))}
                    label="Did it improve your confidence?"
                  />
                  
                  <StarRating
                    value={postCallSurvey.callMetrics.distractionLevel}
                    onChange={(value) => setPostCallSurvey(prev => ({
                      ...prev,
                      callMetrics: { ...prev.callMetrics, distractionLevel: value }
                    }))}
                    label="How distracting was the interface? (1=not at all, 5=very)"
                  />
                  
                  <StarRating
                    value={postCallSurvey.callMetrics.salesPerformanceImpact}
                    onChange={(value) => setPostCallSurvey(prev => ({
                      ...prev,
                      callMetrics: { ...prev.callMetrics, salesPerformanceImpact: value }
                    }))}
                    label="Impact on your sales performance"
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                >
                  Skip Survey
                </button>
                <button
                  onClick={submitPostCallSurvey}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Survey</span>
                </button>
              </div>
            </div>
          )}

          {/* Completion Step */}
          {currentStep === 'completion' && (
            <div className="text-center space-y-6 py-8">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white">Thank you for your feedback!</h3>
              <p className="text-slate-300 max-w-md mx-auto">
                Your input helps us improve VoiceCoach and provide better sales coaching for everyone.
              </p>
              <div className="text-sm text-slate-400">
                This window will close automatically in a few seconds...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackCollectionSystem;