import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, HelpCircle, X } from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Progress } from './ui/Progress';
import { Badge } from './ui/Badge';

interface QuestionnaireData {
  documentType: string;
  learningObjective: string;
  businessChallenge: string;
  successMetrics: string;
  criticalConcepts: string[];
}

interface DocumentFile {
  name: string;
  size: number;
  content: string;
  path: string;
}

interface ContextualQuestionnaireProps {
  document: DocumentFile;
  onCompleted: (questionnaire: QuestionnaireData) => void;
}

const ContextualQuestionnaire: React.FC<ContextualQuestionnaireProps> = ({ 
  document, 
  onCompleted 
}) => {
  const trail = new BreadcrumbTrail('ContextualQuestionnaire');
  
  const [formData, setFormData] = useState<QuestionnaireData>({
    documentType: '',
    learningObjective: '',
    businessChallenge: '',
    successMetrics: '',
    criticalConcepts: []
  });
  
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const questions = [
    {
      id: 'documentType',
      title: 'What type of document is this?',
      type: 'select',
      options: [
        'Process & Strategy (methodologies, frameworks, best practices)',
        'Product Information (features, specifications, benefits)',
        'Sales Scripts (call flows, talk tracks, dialogues)'
      ],
      required: true
    },
    {
      id: 'learningObjective',
      title: 'What do you want your team to learn from this document?',
      type: 'textarea',
      placeholder: 'Example: I want them to understand how to use mirroring and labeling techniques to build rapport and handle objections without seeming pushy',
      required: true
    },
    {
      id: 'businessChallenge',
      title: 'Why do you want them to know this?',
      type: 'textarea',
      placeholder: 'Example: Our team struggles with price objections and often drops price too quickly. This document teaches how to redirect the conversation to value instead',
      required: true
    },
    {
      id: 'successMetrics',
      title: 'What does success look like?',
      type: 'textarea',
      placeholder: 'Example: Reps confidently handle price objections without immediately offering discounts, they keep prospects engaged longer in discovery calls, and they close 20% more deals at full price',
      required: true
    },
    {
      id: 'criticalConcepts',
      title: 'Must-Know Concepts (Optional)',
      type: 'chips',
      placeholder: 'Enter critical techniques or concepts (press Enter to add)',
      required: false
    }
  ];

  const currentQuestionData = questions[currentQuestion - 1];
  const totalQuestions = questions.length;

  const validateField = (field: string, value: any): string | null => {
    const question = questions.find(q => q.id === field);
    if (question?.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return 'This field is required';
    }
    return null;
  };

  const handleFieldChange = (field: string, value: any) => {
    trail.light(7010 + currentQuestion, { 
      operation: 'form_field_update', 
      field, 
      questionNumber: currentQuestion 
    });
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleNext = () => {
    const field = currentQuestionData.id;
    const value = formData[field as keyof QuestionnaireData];
    const error = validateField(field, value);
    
    if (error) {
      trail.fail(7020 + currentQuestion, new Error(`Validation failed for ${field}: ${error}`));
      setErrors({ [field]: error });
      return;
    }

    trail.light(7030 + currentQuestion, { 
      operation: 'question_completed', 
      questionNumber: currentQuestion,
      field 
    });

    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    // Validate all required fields
    const newErrors: Record<string, string> = {};
    questions.forEach(q => {
      if (q.required) {
        const error = validateField(q.id, formData[q.id as keyof QuestionnaireData]);
        if (error) {
          newErrors[q.id] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      trail.fail(7040, new Error('Form validation failed'));
      setErrors(newErrors);
      return;
    }

    trail.light(7050, { 
      operation: 'questionnaire_completed', 
      formData: {
        ...formData,
        criticalConcepts: formData.criticalConcepts.length 
      }
    });

    onCompleted(formData);
  };

  const renderField = () => {
    const question = currentQuestionData;
    const value = formData[question.id as keyof QuestionnaireData];
    const error = errors[question.id];

    switch (question.type) {
      case 'select':
        return (
          <div className="space-y-2">
            <select
              value={value as string}
              onChange={(e) => handleFieldChange(question.id, e.target.value)}
              className="input-field w-full"
            >
              <option value="">Select an option...</option>
              {question.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {error && (
              <p className="text-small text-error-500 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={value as string}
            onChange={(e) => handleFieldChange(question.id, e.target.value)}
            placeholder={question.placeholder}
            rows={4}
            error={error}
          />
        );

      case 'chips':
        return (
          <div className="space-y-4">
            <Input
              placeholder={question.placeholder}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const newConcept = e.currentTarget.value.trim();
                  if (!formData.criticalConcepts.includes(newConcept)) {
                    handleFieldChange('criticalConcepts', [...formData.criticalConcepts, newConcept]);
                  }
                  e.currentTarget.value = '';
                }
              }}
              helperText="Press Enter to add a concept"
            />
            {formData.criticalConcepts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.criticalConcepts.map((concept, index) => (
                  <Badge
                    key={index}
                    variant="info"
                    size="md"
                    className="flex items-center gap-2"
                  >
                    {concept}
                    <button
                      onClick={() => {
                        const updated = formData.criticalConcepts.filter((_, i) => i !== index);
                        handleFieldChange('criticalConcepts', updated);
                      }}
                      className="hover:bg-info-600 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            {error && (
              <p className="text-small text-error-500 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary-500" />
            Contextual Questions
          </CardTitle>
          <CardDescription>
            Help us understand your specific needs for processing <strong>"{document.name}"</strong>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Progress Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <Progress
            value={currentQuestion}
            max={totalQuestions}
            label={`Question ${currentQuestion} of ${totalQuestions}`}
            showPercentage
            className="mb-4"
          />
          
          {/* Question Navigation Dots */}
          <div className="flex justify-center gap-2">
            {questions.map((_, index) => {
              const questionNumber = index + 1;
              const isCompleted = questionNumber < currentQuestion;
              const isCurrent = questionNumber === currentQuestion;
              
              return (
                <div
                  key={index}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    isCompleted 
                      ? 'bg-success-500' 
                      : isCurrent 
                        ? 'bg-primary-500' 
                        : 'bg-neutral-600'
                  }`}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Question Card */}
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-h3 font-semibold text-primary-500">
                {currentQuestion}
              </span>
            </div>
            <div className="flex-1">
              <CardTitle className="text-left mb-2">
                {currentQuestionData.title}
              </CardTitle>
              {currentQuestionData.required && (
                <Badge variant="warning" size="sm">Required</Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {renderField()}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-6 border-t border-neutral-700">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestion === 1}
              variant="secondary"
              size="lg"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-2 text-small text-neutral-400">
              <span>{currentQuestion} of {totalQuestions}</span>
            </div>

            {currentQuestion < totalQuestions ? (
              <Button
                onClick={handleNext}
                size="lg"
              >
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                size="lg"
                className="bg-success-600 hover:bg-success-700 focus:ring-success-500"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="text-center text-small text-neutral-400">
            <p>
              These questions help our AI understand your specific use case and generate 
              more targeted coaching insights. You can always refine your responses later.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContextualQuestionnaire;