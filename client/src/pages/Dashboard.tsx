import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GenerateBriefingButton } from "@/components/GenerateBriefingButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { trpc } from "@/lib/trpc";
import { AlertCircle, Calendar, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Sparkles, Clock, Users } from "lucide-react";
import { useState } from "react";
import { getLoginUrl } from "@/const";

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: briefingData, isLoading: briefingLoading } = trpc.briefing.getLatest.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: relationships } = trpc.relationships.getAll.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const toggleAlertMutation = trpc.briefing.toggleAlert.useMutation();
  const utils = trpc.useUtils();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    urgent: true,
    important: false,
    strategic: false,
    calendar: false,
    relationships: false,
    llm: false,
  });

  if (loading || briefingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your briefing...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>HTI Daily BD Intelligence Briefing</CardTitle>
            <CardDescription>Please sign in to view your briefing</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!briefingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">HTI Daily BD Intelligence Briefing</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <GenerateBriefingButton />
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Welcome Content */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                <Sparkles className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Your Intelligence Briefing</h2>
              <p className="text-xl text-gray-600 mb-8">
                Your AI-powered business development command center is ready to help you stay ahead of every opportunity.
              </p>
              <GenerateBriefingButton />
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <CardTitle className="text-lg">Smart Alerts</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Get notified about response urgency, relationship cooling, and commitment breaches before they become problems.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg">Multi-LLM Analysis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Every strategic opportunity analyzed by Claude, Gemini, Grok, and Perplexity for consensus validation.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <CardTitle className="text-lg">Relationship Intelligence</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Track engagement health, momentum trends, and interaction patterns across your entire network.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">Calendar Prep</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">
                    Automatic meeting preparation with attendee research, strategic context, and suggested talking points.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* How It Works */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-2xl">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Data Collection</h3>
                    <p className="text-gray-600">Pulls from your HTI Gmail, Google Calendar, and Limitless recordings every morning at 8 AM.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">AI Analysis</h3>
                    <p className="text-gray-600">Four AI models analyze opportunities, detect patterns, and generate smart alerts based on your activity.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Actionable Insights</h3>
                    <p className="text-gray-600">Your briefing is ready when you start work—prioritized, contextualized, and ready to act on.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="mt-12 text-center">
              <p className="text-gray-600 mb-4">Ready to see your first briefing?</p>
              <GenerateBriefingButton />
              <p className="text-sm text-gray-500 mt-4">
                <Clock className="w-4 h-4 inline mr-1" />
                Automated briefings run every weekday at 8 AM EST
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { briefing, alerts, calendarEvents, llmAnalyses } = briefingData;

  const urgentAlerts = alerts.filter(a => a.type === 'urgent');
  const importantAlerts = alerts.filter(a => a.type === 'important');
  const strategicAlerts = alerts.filter(a => a.type === 'strategic');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleToggleAlert = async (alertId: number, completed: boolean) => {
    await toggleAlertMutation.mutateAsync({ id: alertId, completed });
    utils.briefing.getLatest.invalidate();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'new': return <Sparkles className="h-4 w-4 text-blue-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = (score: number | null) => {
    if (!score) return 'bg-gray-200';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">HTI Daily BD Intelligence Briefing</h1>
              <p className="text-sm text-gray-600">
                {new Date(briefing.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <GenerateBriefingButton />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Executive Summary */}
        {briefing.executiveSummary && (
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{briefing.executiveSummary}</p>
            </CardContent>
          </Card>
        )}

        {/* Urgent Actions */}
        <Collapsible open={openSections.urgent} onOpenChange={() => toggleSection('urgent')}>
          <Card className="mb-4 border-l-4 border-l-red-500">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <CardTitle>Urgent Actions</CardTitle>
                    <Badge variant="destructive">{urgentAlerts.length}</Badge>
                  </div>
                  {openSections.urgent ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {urgentAlerts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No urgent actions at this time</p>
                ) : (
                  urgentAlerts.map(alert => (
                    <div key={alert.id} className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                      <Checkbox
                        checked={alert.completed}
                        onCheckedChange={(checked) => handleToggleAlert(alert.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h4 className={`font-semibold ${alert.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {alert.title}
                        </h4>
                        {alert.contactName && (
                          <p className="text-sm text-gray-600 mt-1">
                            Contact: {alert.contactName} {alert.organization && `(${alert.organization})`}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 mt-2">{alert.description}</p>
                        {alert.actionRequired && (
                          <div className="mt-3 p-3 bg-white rounded border border-red-300">
                            <p className="text-sm font-medium text-red-900">Recommended Action:</p>
                            <p className="text-sm text-gray-700 mt-1">{alert.actionRequired}</p>
                          </div>
                        )}
                        {alert.deadline && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-red-700">
                            <Clock className="h-4 w-4" />
                            Deadline: {new Date(alert.deadline).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Important Actions */}
        <Collapsible open={openSections.important} onOpenChange={() => toggleSection('important')}>
          <Card className="mb-4 border-l-4 border-l-yellow-500">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <CardTitle>Important Actions</CardTitle>
                    <Badge variant="secondary">{importantAlerts.length}</Badge>
                  </div>
                  {openSections.important ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {importantAlerts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No important actions at this time</p>
                ) : (
                  importantAlerts.map(alert => (
                    <div key={alert.id} className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Checkbox
                        checked={alert.completed}
                        onCheckedChange={(checked) => handleToggleAlert(alert.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h4 className={`font-semibold ${alert.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {alert.title}
                        </h4>
                        {alert.contactName && (
                          <p className="text-sm text-gray-600 mt-1">
                            Contact: {alert.contactName} {alert.organization && `(${alert.organization})`}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 mt-2">{alert.description}</p>
                        {alert.actionRequired && (
                          <div className="mt-3 p-3 bg-white rounded border border-yellow-300">
                            <p className="text-sm font-medium text-yellow-900">Recommended Action:</p>
                            <p className="text-sm text-gray-700 mt-1">{alert.actionRequired}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Strategic Opportunities */}
        <Collapsible open={openSections.strategic} onOpenChange={() => toggleSection('strategic')}>
          <Card className="mb-4 border-l-4 border-l-green-500">
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-green-500" />
                    <CardTitle>Strategic Opportunities</CardTitle>
                    <Badge variant="secondary">{strategicAlerts.length}</Badge>
                  </div>
                  {openSections.strategic ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {strategicAlerts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No strategic opportunities at this time</p>
                ) : (
                  strategicAlerts.map(alert => (
                    <div key={alert.id} className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <Checkbox
                        checked={alert.completed}
                        onCheckedChange={(checked) => handleToggleAlert(alert.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <h4 className={`font-semibold ${alert.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {alert.title}
                        </h4>
                        {alert.contactName && (
                          <p className="text-sm text-gray-600 mt-1">
                            Contact: {alert.contactName} {alert.organization && `(${alert.organization})`}
                          </p>
                        )}
                        <p className="text-sm text-gray-700 mt-2">{alert.description}</p>
                        {alert.actionRequired && (
                          <div className="mt-3 p-3 bg-white rounded border border-green-300">
                            <p className="text-sm font-medium text-green-900">Recommended Action:</p>
                            <p className="text-sm text-gray-700 mt-1">{alert.actionRequired}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Calendar Events */}
        {calendarEvents.length > 0 && (
          <Collapsible open={openSections.calendar} onOpenChange={() => toggleSection('calendar')}>
            <Card className="mb-4 border-l-4 border-l-purple-500">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-purple-500" />
                      <CardTitle>Upcoming Events</CardTitle>
                      <Badge variant="secondary">{calendarEvents.length}</Badge>
                    </div>
                    {openSections.calendar ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {calendarEvents.map(event => (
                    <div key={event.id} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="font-semibold text-gray-900">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        {new Date(event.startTime).toLocaleString()} - {new Date(event.endTime).toLocaleTimeString()}
                      </div>
                      {event.location && (
                        <p className="text-sm text-gray-600 mt-1">📍 {event.location}</p>
                      )}
                      {event.description && (
                        <p className="text-sm text-gray-700 mt-2">{event.description}</p>
                      )}
                      {event.strategicValue && (
                        <div className="mt-3 p-3 bg-white rounded border border-purple-300">
                          <p className="text-sm font-medium text-purple-900">Strategic Value:</p>
                          <p className="text-sm text-gray-700 mt-1">{event.strategicValue}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Relationships */}
        {relationships && relationships.length > 0 && (
          <Collapsible open={openSections.relationships} onOpenChange={() => toggleSection('relationships')}>
            <Card className="mb-4 border-l-4 border-l-indigo-500">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-indigo-500" />
                      <CardTitle>Relationship Intelligence</CardTitle>
                      <Badge variant="secondary">{relationships.length}</Badge>
                    </div>
                    {openSections.relationships ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-3">
                    {relationships.map(rel => (
                      <div key={rel.id} className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-gray-900">{rel.contactName}</h4>
                            {getTrendIcon(rel.trend)}
                          </div>
                          {rel.organization && (
                            <p className="text-sm text-gray-600 mt-1">{rel.organization}</p>
                          )}
                          {rel.lastInteraction && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last contact: {new Date(rel.lastInteraction).toLocaleDateString()}
                              {rel.lastInteractionType && ` (${rel.lastInteractionType})`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Health Score</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${getHealthColor(rel.healthScore)}`}
                                  style={{ width: `${rel.healthScore || 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900">{rel.healthScore || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Multi-LLM Analysis */}
        {llmAnalyses.length > 0 && (
          <Collapsible open={openSections.llm} onOpenChange={() => toggleSection('llm')}>
            <Card className="mb-4 border-l-4 border-l-pink-500">
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-pink-500" />
                      <CardTitle>Multi-LLM Consensus Analysis</CardTitle>
                      <Badge variant="secondary">{llmAnalyses.length}</Badge>
                    </div>
                    {openSections.llm ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {llmAnalyses.map(analysis => (
                    <div key={analysis.id} className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                      <h4 className="font-semibold text-gray-900 mb-4">{analysis.topic}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {analysis.claudeAnalysis && (
                          <div className="p-3 bg-white rounded border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-2">CLAUDE SONNET 4.5</p>
                            <p className="text-sm text-gray-700">{analysis.claudeAnalysis}</p>
                          </div>
                        )}
                        {analysis.geminiAnalysis && (
                          <div className="p-3 bg-white rounded border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-2">GEMINI 2.5 PRO</p>
                            <p className="text-sm text-gray-700">{analysis.geminiAnalysis}</p>
                          </div>
                        )}
                        {analysis.grokAnalysis && (
                          <div className="p-3 bg-white rounded border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-2">GROK 4</p>
                            <p className="text-sm text-gray-700">{analysis.grokAnalysis}</p>
                          </div>
                        )}
                        {analysis.perplexityAnalysis && (
                          <div className="p-3 bg-white rounded border border-gray-200">
                            <p className="text-xs font-semibold text-gray-500 mb-2">PERPLEXITY SONAR PRO</p>
                            <p className="text-sm text-gray-700">{analysis.perplexityAnalysis}</p>
                          </div>
                        )}
                      </div>

                      {analysis.consensus && (
                        <div className="p-4 bg-green-100 rounded border border-green-300 mb-3">
                          <p className="text-sm font-semibold text-green-900 mb-2">✅ CONSENSUS</p>
                          <p className="text-sm text-gray-800">{analysis.consensus}</p>
                        </div>
                      )}

                      {analysis.dissent && (
                        <div className="p-4 bg-orange-100 rounded border border-orange-300 mb-3">
                          <p className="text-sm font-semibold text-orange-900 mb-2">⚠️ DISSENTING OPINIONS</p>
                          <p className="text-sm text-gray-800">{analysis.dissent}</p>
                        </div>
                      )}

                      {analysis.recommendation && (
                        <div className="p-4 bg-blue-100 rounded border border-blue-300">
                          <p className="text-sm font-semibold text-blue-900 mb-2">💡 RECOMMENDATION</p>
                          <p className="text-sm text-gray-800">{analysis.recommendation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </main>
    </div>
  );
}
