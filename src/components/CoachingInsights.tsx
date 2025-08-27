import { useState } from 'react';
import { Play, FileText, BarChart3, TrendingUp, Zap } from 'lucide-react';
import { BreadcrumbTrail } from '../lib/breadcrumb-system';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import SplitViewCoaching from './SplitViewCoaching';

interface CoachingInsightsProps {
  insights: any;
  onNewDocument: () => void;
}

const CoachingInsights: React.FC<CoachingInsightsProps> = ({ 
  insights, 
  onNewDocument 
}) => {
  const trail = new BreadcrumbTrail('CoachingInsights');
  const [showSplitView, setShowSplitView] = useState(false);

  // LED 6001: Insights display initialized
  trail.light(6001, { 
    operation: 'insights_display',
    qualityScore: insights.qualityScore,
    totalTechniques: insights.totalTechniques
  });

  const handleExport = () => {
    trail.light(6010, { operation: 'export_insights' });
    // Future: Export functionality
    alert('Export functionality coming soon!');
  };

  const handleStartCoaching = () => {
    trail.light(6020, { operation: 'start_live_coaching' });
    setShowSplitView(true);
  };

  // If Split View is active, render it full-screen
  if (showSplitView) {
    return (
      <SplitViewCoaching 
        insights={insights} 
        onNewDocument={() => {
          setShowSplitView(false);
          onNewDocument();
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-8 h-8 text-success-500" />
                Coaching Insights Ready!
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                Quality Score: 
                <Badge variant="success" size="lg" className="ml-2">
                  {insights.qualityScore}%
                </Badge>
              </CardDescription>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleExport}>
                <FileText className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="ghost" onClick={onNewDocument}>
                Process New Document
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-h1 font-bold text-primary-500 mb-2">{insights.totalTechniques}</div>
            <p className="text-small text-neutral-400">Total Techniques</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-h1 font-bold text-urgent mb-2">{insights.criticalInsights}</div>
            <p className="text-small text-neutral-400">Critical Insights</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-h1 font-bold text-success-500 mb-2">{insights.quickWins}</div>
            <p className="text-small text-neutral-400">Quick Wins</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="pt-6">
            <div className="text-h1 font-bold text-helpful mb-2">{insights.qualityScore}%</div>
            <p className="text-small text-neutral-400">Quality Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Coaching Prompts by Sales Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {Object.entries(insights.coachingPrompts).map(([stage, prompts]) => (
          <Card key={stage}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">
                  {stage.replace('_', ' ')}
                </span>
                <Badge variant="info" size="sm">
                  {(prompts as string[]).length} techniques
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(prompts as string[]).map((prompt, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-neutral-800 rounded-card">
                    <div className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-small text-neutral-200 flex-1">{prompt}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call-to-Action */}
      <Card className="text-center border-success-500/50 bg-success-500/10">
        <CardContent className="pt-6 pb-8">
          <div className="max-w-2xl mx-auto">
            <Zap className="w-16 h-16 text-success-500 mx-auto mb-4" />
            <h3 className="text-h2 mb-4">Ready for Live Coaching</h3>
            <p className="text-body text-neutral-300 mb-6">
              Launch the Split View interface to get real-time AI coaching guidance during your sales calls
            </p>
            
            <Button
              onClick={handleStartCoaching}
              size="xl"
              className="bg-success-600 hover:bg-success-700 focus:ring-success-500 text-h3 px-8 py-4"
            >
              <Play className="w-6 h-6 mr-3" />
              Start Live Coaching Session
            </Button>
            
            <p className="text-small text-neutral-400 mt-4">
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Optimized for desktop sales environments • Sub-200ms response time
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachingInsights;