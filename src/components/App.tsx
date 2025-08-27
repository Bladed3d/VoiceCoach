import { useState, useEffect } from 'react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import SplitViewCoaching from './SplitViewCoaching';

interface DocumentFile {
  name: string;
  size: number;
  content: string;
  path: string;
}

interface AppState {
  currentStep: 'upload' | 'questionnaire' | 'processing' | 'insights' | 'coaching';
  uploadedDocument: DocumentFile | null;
  questionnaire: any;
  processedInsights: any;
}

function App() {
  const trail = new BreadcrumbTrail('App');
  
  // LED 1000: App initialization
  useEffect(() => {
    trail.light(1000, { 
      operation: 'app_initialization',
      timestamp: Date.now(),
      environment: 'electron'
    });
  }, []);

  const [appState, setAppState] = useState<AppState>({
    currentStep: 'upload',
    uploadedDocument: null,
    questionnaire: null,
    processedInsights: null
  });

  // LED 1001: State change tracking
  useEffect(() => {
    trail.light(1001, {
      operation: 'state_change',
      currentStep: appState.currentStep,
      hasDocument: !!appState.uploadedDocument,
      hasQuestionnaire: !!appState.questionnaire
    });
  }, [appState.currentStep]);


  const handleReset = () => {
    trail.light(1050, { operation: 'app_reset' });
    setAppState({
      currentStep: 'upload',
      uploadedDocument: null,
      questionnaire: null,
      processedInsights: null
    });
  };

  return <SplitViewCoaching onNewDocument={() => handleReset()} />;
}

export default App;