import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';

interface DocumentFile {
  name: string;
  size: number;
  content: string;
  path: string;
}

interface DocumentUploaderProps {
  onDocumentUploaded: (file: DocumentFile) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onDocumentUploaded }) => {
  const trail = new BreadcrumbTrail('DocumentUploader');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (fileData: { size: number; name: string }): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    
    if (fileData.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    
    const extension = fileData.name.toLowerCase().substring(fileData.name.lastIndexOf('.'));
    if (!allowedExtensions.includes(extension)) {
      return 'Only PDF, DOC, DOCX, and TXT files are supported';
    }
    
    return null;
  };

  const handleFileSelect = useCallback(async () => {
    if (!window.electronAPI) {
      setError('Electron API not available');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // LED 2001: Starting file selection
      trail.light(2001, { operation: 'file_selection_start' });

      const filePath = await window.electronAPI.selectFile();
      if (!filePath) {
        // User cancelled
        setIsUploading(false);
        return;
      }

      // LED 2002: File selected, reading content
      trail.light(2002, { operation: 'file_selected', filePath });

      const fileData = await window.electronAPI.readFile(filePath);
      
      // LED 2003: File read, validating
      trail.light(2003, { operation: 'file_read', size: fileData.size, name: fileData.name });

      const validationError = validateFile(fileData);
      if (validationError) {
        setError(validationError);
        // LED 2010: File validation failed
        trail.light(2010, { operation: 'file_validation_failed', error: validationError });
        setIsUploading(false);
        return;
      }

      // LED 2004: File validation successful
      trail.light(2004, { operation: 'file_validated', name: fileData.name });

      onDocumentUploaded(fileData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      // LED 2011: File processing error
      trail.light(2011, { operation: 'file_processing_error', error: errorMessage });
    } finally {
      setIsUploading(false);
    }
  }, [onDocumentUploaded, trail]);

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 mb-4">
            <FileText className="w-8 h-8 text-primary-500" />
            Upload Sales Document
          </CardTitle>
          <CardDescription className="text-body">
            Upload your sales document to get AI-powered coaching insights.
          </CardDescription>
          
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Badge variant="info" size="sm">PDF</Badge>
            <Badge variant="info" size="sm">DOC</Badge>
            <Badge variant="info" size="sm">DOCX</Badge>
            <Badge variant="info" size="sm">TXT</Badge>
            <Badge variant="default" size="sm">Up to 10MB</Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="upload-zone text-center py-8">
            <div className="flex flex-col items-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary-500/20 flex items-center justify-center">
                <Upload className="w-10 h-10 text-primary-500" />
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-h3">Upload your document</h3>
                <p className="text-body text-neutral-400">
                  Click the button below to select a file
                </p>
              </div>

              <button 
                onClick={handleFileSelect}
                disabled={isUploading}
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg inline-flex items-center transition-colors"
              >
                <Upload className="w-5 h-5 mr-2" />
                {isUploading ? 'Selecting...' : 'Browse Files'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-error-500/10 border border-error-500/30 rounded-card flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-body font-medium text-error-500">Upload Error</p>
                <p className="text-small text-error-400 mt-1">{error}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentUploader;