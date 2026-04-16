import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { UserProfile } from "@/lib/userProfile";
import { Activity, ArrowLeft, ClipboardList, TrendingUp, Users } from "lucide-react";

interface TherapistDashboardProps {
  profile: UserProfile;
  onBack: () => void;
}

const learners = [
  {
    id: "learner-001",
    name: "Mia Chen",
    supportNeed: "Speech clarity",
    completedSessions: 18,
    weeklyGoal: 24,
    confidenceScore: 76,
    pronunciationScore: 82,
    consistencyScore: 71,
    currentScenario: "Airport Check-in",
    lastActive: "Today, 10:20 AM",
    notes: "Responds well to short prompts. Needs repetition support under pressure.",
  },
  {
    id: "learner-002",
    name: "Noah Lin",
    supportNeed: "Conversation pacing",
    completedSessions: 11,
    weeklyGoal: 15,
    confidenceScore: 68,
    pronunciationScore: 74,
    consistencyScore: 80,
    currentScenario: "Asking for Help",
    lastActive: "Yesterday",
    notes: "Improving on turn-taking. Hesitates when instructions change.",
  },
  {
    id: "learner-003",
    name: "Sofia Zhang",
    supportNeed: "Vocabulary recall",
    completedSessions: 9,
    weeklyGoal: 12,
    confidenceScore: 84,
    pronunciationScore: 79,
    consistencyScore: 88,
    currentScenario: "Ordering Food",
    lastActive: "2 days ago",
    notes: "Strong confidence. Next target is faster word retrieval.",
  },
];

const TherapistDashboard = ({ profile, onBack }: TherapistDashboardProps) => {
  const totalLearners = learners.length;
  const totalSessions = learners.reduce((sum, learner) => sum + learner.completedSessions, 0);
  const averageConfidence = Math.round(
    learners.reduce((sum, learner) => sum + learner.confidenceScore, 0) / totalLearners
  );
  const averagePronunciation = Math.round(
    learners.reduce((sum, learner) => sum + learner.pronunciationScore, 0) / totalLearners
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <p className="text-sm font-medium text-primary mb-2">Therapist Portal</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Learner Progress Overview
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Track engagement, confidence, and current scenario focus for your learners.
              This page uses dummy data for now.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-foreground">{profile.name}</p>
              <p className="text-sm text-muted-foreground">Therapist account</p>
            </div>
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" /> Log out
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
          <Card className="border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Active roster</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalLearners}</p>
              <p className="text-sm text-muted-foreground mt-1">Learners assigned</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <ClipboardList className="w-5 h-5 text-accent" />
                <span className="text-xs font-semibold text-muted-foreground">This month</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalSessions}</p>
              <p className="text-sm text-muted-foreground mt-1">Completed sessions</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Average</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{averageConfidence}%</p>
              <p className="text-sm text-muted-foreground mt-1">Confidence score</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-5 h-5 text-accent" />
                <span className="text-xs font-semibold text-muted-foreground">Average</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{averagePronunciation}%</p>
              <p className="text-sm text-muted-foreground mt-1">Pronunciation score</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-2xl">Learner Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {learners.map((learner) => {
                const goalProgress = Math.min(
                  100,
                  Math.round((learner.completedSessions / learner.weeklyGoal) * 100)
                );

                return (
                  <div key={learner.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2 max-w-xl">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{learner.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Focus: {learner.supportNeed} · Current scenario: {learner.currentScenario}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">{learner.notes}</p>
                        <p className="text-xs font-medium text-muted-foreground">
                          Last active: {learner.lastActive}
                        </p>
                      </div>

                      <div className="w-full lg:max-w-xs space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Weekly target</span>
                            <span className="font-semibold text-foreground">
                              {learner.completedSessions}/{learner.weeklyGoal}
                            </span>
                          </div>
                          <Progress value={goalProgress} className="h-2" />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Confidence</span>
                            <span className="font-semibold text-foreground">
                              {learner.confidenceScore}%
                            </span>
                          </div>
                          <Progress value={learner.confidenceScore} className="h-2" />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Pronunciation</span>
                            <span className="font-semibold text-foreground">
                              {learner.pronunciationScore}%
                            </span>
                          </div>
                          <Progress value={learner.pronunciationScore} className="h-2" />
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Consistency</span>
                            <span className="font-semibold text-foreground">
                              {learner.consistencyScore}%
                            </span>
                          </div>
                          <Progress value={learner.consistencyScore} className="h-2" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-2xl">Highlights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
                  <p className="font-semibold text-foreground mb-1">Best confidence trend</p>
                  <p>Sofia Zhang improved fastest this week and is ready for more stressful prompts.</p>
                </div>
                <div className="rounded-xl bg-accent/10 p-4 border border-accent/10">
                  <p className="font-semibold text-foreground mb-1">Needs follow-up</p>
                  <p>Noah Lin is engaged but slows down when the scenario becomes less predictable.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-2xl">Suggested next step</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Add a learner detail view next, then replace the dummy data with session results
                  stored per user.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TherapistDashboard;