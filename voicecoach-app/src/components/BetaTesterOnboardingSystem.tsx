import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserPlus, 
  GraduationCap, 
  CheckCircle, 
  Play, 
  BookOpen, 
  Target, 
  Shield,
  Settings,
  Users,
  Clock,
  Award,
  AlertCircle,
  Download,
  Monitor,
  Headphones,
  Mic,
  Activity
} from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';

interface BetaTester {
  id: string;
  email: string;
  name: string;
  company: string;
  role: string;
  experience: 'beginner' | 'intermediate' | 'expert';
  industry: string;
  
  onboardingStatus: {
    step: 'registration' | 'profile_setup' | 'training_modules' | 'system_setup' | 'first_session' | 'completed';
    completedModules: string[];
    currentModule?: string;
    progress: number; // 0-100
    startDate: Date;
    completionDate?: Date;
  };
  
  trainingProgress: {
    totalModules: number;
    completedModules: number;
    currentlyWatching?: string;
    totalWatchTime: number;
    lastActivityDate: Date;
    testScores: Record<string, number>;
  };
  
  systemConfiguration: {
    audioDevicesConfigured: boolean;
    microphoneSetup: boolean;
    systemAudioSetup: boolean;
    desktopConfigured: boolean;
    permissionsGranted: string[];
    troubleshootingCompleted: boolean;
  };
  
  testingPrivileges: {
    accessLevel: 'basic' | 'advanced' | 'premium';
    featuresUnlocked: string[];
    testingGroups: string[];
    feedbackChannels: string[];
    directContactEnabled: boolean;
  };
  
  performance: {
    sessionsCompleted: number;
    feedbacksSubmitted: number;
    bugsReported: number;
    featureRequestsSubmitted: number;
    helpfulnessRating: number; // Other testers' rating of this tester's feedback
    engagementScore: number;
  };
}

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: number; // minutes
  type: 'video' | 'interactive' | 'quiz' | 'hands_on';
  category: 'basics' | 'advanced' | 'troubleshooting';
  prerequisites: string[];
  content: {
    videoUrl?: string;
    slides?: string[];
    interactiveElements?: any[];
    quizQuestions?: Array<{
      question: string;
      options: string[];
      correctAnswer: number;
      explanation: string;
    }>;
  };
  learningObjectives: string[];
  passingScore?: number;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  estimatedTime: number;
  required: boolean;
  component: React.ComponentType<any>;
}

interface BetaTesterOnboardingSystemProps {
  isVisible: boolean;
  onClose: () => void;
  currentUserId?: string;
  adminMode?: boolean;
}

const BetaTesterOnboardingSystem: React.FC<BetaTesterOnboardingSystemProps> = ({
  isVisible,
  onClose,
  currentUserId = 'new_user',
  adminMode = false
}) => {
  const trail = new BreadcrumbTrail('BetaTesterOnboardingSystem');
  
  const [currentTester, setCurrentTester] = useState<BetaTester | null>(null);
  const [allTesters, setAllTesters] = useState<BetaTester[]>([]);
  const [trainingModules] = useState<TrainingModule[]>([
    {
      id: 'module_1_basics',
      title: 'VoiceCoach Introduction',
      description: 'Learn the fundamentals of AI-powered sales coaching',
      duration: 15,
      type: 'video',
      category: 'basics',
      prerequisites: [],
      content: {
        videoUrl: '/training/intro.mp4',
        slides: [
          'Welcome to VoiceCoach',
          'What is AI Sales Coaching?',
          'How VoiceCoach Works',
          'Key Benefits'
        ]
      },
      learningObjectives: [
        'Understand VoiceCoach\'s core purpose',
        'Learn about AI coaching capabilities',
        'Identify key features and benefits'
      ]
    },
    {
      id: 'module_2_setup',
      title: 'System Setup & Configuration',
      description: 'Configure your audio devices and system permissions',
      duration: 20,
      type: 'hands_on',
      category: 'basics',
      prerequisites: ['module_1_basics'],
      content: {
        interactiveElements: [
          { type: 'audio_test', title: 'Microphone Test' },
          { type: 'system_audio_test', title: 'System Audio Test' },
          { type: 'permission_setup', title: 'Grant Permissions' }
        ]
      },
      learningObjectives: [
        'Configure microphone for optimal recording',
        'Set up system audio capture',
        'Grant necessary permissions'
      ]
    },
    {
      id: 'module_3_interface',
      title: 'Interface Navigation',
      description: 'Master the VoiceCoach user interface',
      duration: 25,
      type: 'interactive',
      category: 'basics',
      prerequisites: ['module_2_setup'],
      content: {
        interactiveElements: [
          { type: 'ui_tour', title: 'Guided Interface Tour' },
          { type: 'practice_session', title: 'Practice Navigation' }
        ]
      },
      learningObjectives: [
        'Navigate the main interface',
        'Understand tab functionality',
        'Access settings and configuration'
      ]
    },
    {
      id: 'module_4_coaching',
      title: 'AI Coaching Features',
      description: 'Learn how to use coaching prompts effectively',
      duration: 30,
      type: 'video',
      category: 'advanced',
      prerequisites: ['module_3_interface'],
      content: {
        videoUrl: '/training/coaching.mp4',
        quizQuestions: [
          {
            question: 'When should you use coaching prompts during a call?',
            options: [
              'Only at the beginning',
              'When prompted by the AI',
              'Throughout the conversation as needed',
              'Only at the end'
            ],
            correctAnswer: 2,
            explanation: 'Coaching prompts are most effective when used throughout the conversation as they appear relevant to the discussion.'
          }
        ]
      },
      learningObjectives: [
        'Understand prompt timing',
        'Learn prompt categories',
        'Practice prompt usage'
      ],
      passingScore: 80
    },
    {
      id: 'module_5_troubleshooting',
      title: 'Troubleshooting Common Issues',
      description: 'Resolve technical problems and optimize performance',
      duration: 20,
      type: 'interactive',
      category: 'troubleshooting',
      prerequisites: ['module_4_coaching'],
      content: {
        interactiveElements: [
          { type: 'diagnostic_tool', title: 'System Diagnostics' },
          { type: 'problem_solver', title: 'Common Problem Solutions' }
        ]
      },
      learningObjectives: [
        'Diagnose audio issues',
        'Resolve connection problems',
        'Optimize system performance'
      ]
    }
  ]);
  
  const [currentModule, setCurrentModule] = useState<TrainingModule | null>(null);
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({});
  const [onboardingStep, setOnboardingStep] = useState<string>('registration');

  // Initialize onboarding system
  useEffect(() => {
    trail.light(800, { operation: 'onboarding_system_init', currentUserId, adminMode });
    
    // Load existing tester data
    loadTesterData();
    
    // Initialize current tester if not exists
    if (!adminMode && currentUserId !== 'new_user') {
      initializeCurrentTester();
    }
  }, [currentUserId, adminMode]);

  const loadTesterData = useCallback(() => {
    try {
      const savedTesters = localStorage.getItem('voicecoach_beta_testers');
      if (savedTesters) {
        const testers = JSON.parse(savedTesters);
        setAllTesters(testers);
        
        // Find current tester
        const tester = testers.find((t: BetaTester) => t.id === currentUserId);
        if (tester) {
          setCurrentTester(tester);
          setOnboardingStep(tester.onboardingStatus.step);
        }
      }
    } catch (error) {
      trail.fail(800, error as Error);
    }
  }, [currentUserId]);

  const initializeCurrentTester = useCallback(() => {
    if (!currentTester) {
      const newTester: BetaTester = {
        id: currentUserId,
        email: `tester${currentUserId}@example.com`,
        name: `Beta Tester ${currentUserId}`,
        company: '',
        role: '',
        experience: 'intermediate',
        industry: '',
        onboardingStatus: {
          step: 'registration',
          completedModules: [],
          progress: 0,
          startDate: new Date()
        },
        trainingProgress: {
          totalModules: trainingModules.length,
          completedModules: 0,
          totalWatchTime: 0,
          lastActivityDate: new Date(),
          testScores: {}
        },
        systemConfiguration: {
          audioDevicesConfigured: false,
          microphoneSetup: false,
          systemAudioSetup: false,
          desktopConfigured: false,
          permissionsGranted: [],
          troubleshootingCompleted: false
        },
        testingPrivileges: {
          accessLevel: 'basic',
          featuresUnlocked: ['basic_coaching', 'transcription'],
          testingGroups: ['beta_group_1'],
          feedbackChannels: ['in_app_feedback'],
          directContactEnabled: false
        },
        performance: {
          sessionsCompleted: 0,
          feedbacksSubmitted: 0,
          bugsReported: 0,
          featureRequestsSubmitted: 0,
          helpfulnessRating: 0,
          engagementScore: 0
        }
      };
      
      setCurrentTester(newTester);
      saveTesterData(newTester);
    }
  }, [currentTester, currentUserId, trainingModules.length]);

  const saveTesterData = useCallback((tester: BetaTester) => {
    try {
      const updatedTesters = allTesters.filter(t => t.id !== tester.id);
      updatedTesters.push(tester);
      setAllTesters(updatedTesters);
      localStorage.setItem('voicecoach_beta_testers', JSON.stringify(updatedTesters));
    } catch (error) {
      trail.fail(801, error as Error);
    }
  }, [allTesters]);

  const completeOnboardingStep = useCallback((stepId: string, data?: any) => {
    if (!currentTester) return;
    
    trail.light(802, { operation: 'complete_onboarding_step', stepId, testerId: currentTester.id });
    
    let nextStep = stepId;
    let progress = currentTester.onboardingStatus.progress;
    
    // Determine next step and progress
    switch (stepId) {
      case 'registration':
        nextStep = 'profile_setup';
        progress = 20;
        break;
      case 'profile_setup':
        nextStep = 'training_modules';
        progress = 40;
        break;
      case 'training_modules':
        nextStep = 'system_setup';
        progress = 70;
        break;
      case 'system_setup':
        nextStep = 'first_session';
        progress = 90;
        break;
      case 'first_session':
        nextStep = 'completed';
        progress = 100;
        break;
    }
    
    const updatedTester: BetaTester = {
      ...currentTester,
      ...data,
      onboardingStatus: {
        ...currentTester.onboardingStatus,
        step: nextStep as any,
        progress,
        ...(nextStep === 'completed' ? { completionDate: new Date() } : {})
      }
    };
    
    setCurrentTester(updatedTester);
    setOnboardingStep(nextStep);
    saveTesterData(updatedTester);
  }, [currentTester, saveTesterData]);

  const completeTrainingModule = useCallback((moduleId: string, score?: number) => {
    if (!currentTester) return;
    
    trail.light(803, { operation: 'complete_training_module', moduleId, score });
    
    const updatedTester: BetaTester = {
      ...currentTester,
      onboardingStatus: {
        ...currentTester.onboardingStatus,
        completedModules: [...currentTester.onboardingStatus.completedModules, moduleId]
      },
      trainingProgress: {
        ...currentTester.trainingProgress,
        completedModules: currentTester.trainingProgress.completedModules + 1,
        lastActivityDate: new Date(),
        testScores: score ? { ...currentTester.trainingProgress.testScores, [moduleId]: score } : currentTester.trainingProgress.testScores
      }
    };
    
    setCurrentTester(updatedTester);
    saveTesterData(updatedTester);
    
    // Check if all modules completed
    if (updatedTester.trainingProgress.completedModules >= trainingModules.length) {
      completeOnboardingStep('training_modules');
    }
  }, [currentTester, saveTesterData, trainingModules.length, completeOnboardingStep]);

  const exportTesterData = useCallback(() => {
    trail.light(804, { operation: 'export_tester_data' });
    
    const exportData = {
      testers: allTesters,
      summary: {
        totalTesters: allTesters.length,
        completedOnboarding: allTesters.filter(t => t.onboardingStatus.step === 'completed').length,
        activeTesters: allTesters.filter(t => 
          new Date().getTime() - new Date(t.trainingProgress.lastActivityDate).getTime() < 7 * 24 * 60 * 60 * 1000
        ).length,
        averageProgress: allTesters.reduce((sum, t) => sum + t.onboardingStatus.progress, 0) / allTesters.length
      },
      exportTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `voicecoach_beta_testers_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [allTesters]);

  // Onboarding Step Components
  const RegistrationStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center">
        <UserPlus className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Welcome to VoiceCoach Beta</h3>
        <p className="text-slate-300">Let's get you set up as a beta tester</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
          <input
            type="text"
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
            placeholder="Enter your full name"
            defaultValue={currentTester?.name}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
          <input
            type="email"
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
            placeholder="Enter your email"
            defaultValue={currentTester?.email}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Company</label>
          <input
            type="text"
            className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white"
            placeholder="Your company name"
            defaultValue={currentTester?.company}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
          <select className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
            <option value="">Select your role</option>
            <option value="sales_rep">Sales Representative</option>
            <option value="sales_manager">Sales Manager</option>
            <option value="sales_director">Sales Director</option>
            <option value="business_owner">Business Owner</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Sales Experience</label>
          <select className="w-full p-3 bg-slate-800 border border-slate-600 rounded-lg text-white">
            <option value="beginner">Beginner (0-2 years)</option>
            <option value="intermediate">Intermediate (2-5 years)</option>
            <option value="expert">Expert (5+ years)</option>
          </select>
        </div>
      </div>
      
      <button
        onClick={() => completeOnboardingStep('registration')}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
      >
        <span>Continue to Profile Setup</span>
        <CheckCircle className="w-5 h-5" />
      </button>
    </div>
  );

  const TrainingModulesStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center">
        <GraduationCap className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Training Modules</h3>
        <p className="text-slate-300">Complete these modules to master VoiceCoach</p>
      </div>
      
      <div className="space-y-4">
        {trainingModules.map((module, index) => {
          const isCompleted = currentTester?.onboardingStatus.completedModules.includes(module.id);
          const isAvailable = module.prerequisites.every(prereq => 
            currentTester?.onboardingStatus.completedModules.includes(prereq)
          ) || module.prerequisites.length === 0;
          
          return (
            <div key={module.id} className={`p-4 rounded-lg border transition-all ${
              isCompleted ? 'border-green-500 bg-green-900/20' :
              isAvailable ? 'border-blue-500 bg-blue-900/20' :
              'border-slate-600 bg-slate-800/50 opacity-50'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-green-600' :
                      isAvailable ? 'bg-blue-600' : 'bg-slate-600'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{module.title}</h4>
                      <p className="text-sm text-slate-400">{module.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center space-x-4 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{module.duration} min</span>
                    </span>
                    <span className="capitalize">{module.type}</span>
                    <span className="capitalize">{module.category}</span>
                  </div>
                </div>
                
                {isAvailable && !isCompleted && (
                  <button
                    onClick={() => setCurrentModule(module)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start</span>
                  </button>
                )}
                
                {isCompleted && (
                  <div className="text-green-400 text-sm font-medium">
                    ✓ Completed
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {currentTester && currentTester.trainingProgress.completedModules >= trainingModules.length && (
        <button
          onClick={() => completeOnboardingStep('training_modules')}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
        >
          <span>Continue to System Setup</span>
          <CheckCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  const SystemSetupStep: React.FC = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="w-16 h-16 text-blue-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">System Setup</h3>
        <p className="text-slate-300">Configure your devices for optimal performance</p>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Mic className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">Microphone Setup</span>
            </div>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-sm text-slate-400 mb-3">Configure your microphone for clear audio capture</p>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
            Test Microphone
          </button>
        </div>
        
        <div className="p-4 bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Headphones className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">System Audio</span>
            </div>
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-sm text-slate-400 mb-3">Enable system audio capture for call monitoring</p>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
            Configure Audio
          </button>
        </div>
        
        <div className="p-4 bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-white">Permissions</span>
            </div>
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-sm text-slate-400 mb-3">Grant necessary system permissions</p>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors">
            Grant Permissions
          </button>
        </div>
      </div>
      
      <button
        onClick={() => completeOnboardingStep('system_setup')}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
      >
        <span>Complete Setup</span>
        <CheckCircle className="w-5 h-5" />
      </button>
    </div>
  );

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-4xl max-h-[95vh] m-4 bg-slate-900 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center space-x-3">
            <Users className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">
              {adminMode ? 'Beta Tester Management' : 'Beta Tester Onboarding'}
            </h2>
          </div>
          {adminMode && (
            <button
              onClick={exportTesterData}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold ml-4"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {adminMode ? (
            // Admin Dashboard
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Total Testers</span>
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{allTesters.length}</div>
                </div>
                
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Completed</span>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {allTesters.filter(t => t.onboardingStatus.step === 'completed').length}
                  </div>
                </div>
                
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Active This Week</span>
                    <Activity className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {allTesters.filter(t => 
                      new Date().getTime() - new Date(t.trainingProgress.lastActivityDate).getTime() < 7 * 24 * 60 * 60 * 1000
                    ).length}
                  </div>
                </div>
                
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-sm">Avg Progress</span>
                    <Target className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {allTesters.length > 0 ? Math.round(allTesters.reduce((sum, t) => sum + t.onboardingStatus.progress, 0) / allTesters.length) : 0}%
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Beta Testers</h3>
                <div className="space-y-3">
                  {allTesters.slice(-10).map(tester => (
                    <div key={tester.id} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                      <div>
                        <div className="text-white font-medium">{tester.name}</div>
                        <div className="text-sm text-slate-400">{tester.email} • {tester.company}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white capitalize">{tester.onboardingStatus.step.replace('_', ' ')}</div>
                        <div className="text-sm text-slate-400">{tester.onboardingStatus.progress}% complete</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // User Onboarding Flow
            <div className="max-w-2xl mx-auto">
              {/* Progress Indicator */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                  <span>Progress</span>
                  <span>{currentTester?.onboardingStatus.progress || 0}% Complete</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${currentTester?.onboardingStatus.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Current Step Content */}
              {onboardingStep === 'registration' && <RegistrationStep />}
              {onboardingStep === 'training_modules' && <TrainingModulesStep />}
              {onboardingStep === 'system_setup' && <SystemSetupStep />}
              
              {onboardingStep === 'completed' && (
                <div className="text-center space-y-6 py-8">
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
                    <Award className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Onboarding Complete!</h3>
                  <p className="text-slate-300">
                    Welcome to the VoiceCoach Beta program. You're now ready to start testing and providing valuable feedback.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
                  >
                    Start Using VoiceCoach
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetaTesterOnboardingSystem;