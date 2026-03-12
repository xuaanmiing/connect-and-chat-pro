import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getProfile } from "@/lib/userProfile";

interface MultiplayerLobbyProps {
  onBack: () => void;
  onMatchReady: () => void;
}

interface Opponent {
  name: string;
  level: "Beginner" | "Intermediate";
  rating: number;
}

const sampleOpponents: Opponent[] = [
  { name: "Mia", level: "Beginner", rating: 720 },
  { name: "Leo", level: "Beginner", rating: 695 },
  { name: "Aria", level: "Intermediate", rating: 840 },
  { name: "Noah", level: "Intermediate", rating: 815 },
  { name: "Ivy", level: "Beginner", rating: 735 },
];

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const MultiplayerLobby = ({ onBack, onMatchReady }: MultiplayerLobbyProps) => {
  const profile = getProfile();
  const [status, setStatus] = useState<"idle" | "searching" | "matched">("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [targetSeconds, setTargetSeconds] = useState(10);
  const [opponent, setOpponent] = useState<Opponent | null>(null);

  const onlinePlayers = useMemo(() => 28 + Math.floor(Math.random() * 12), []);

  const searchProgress = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));

  useEffect(() => {
    if (status !== "searching") {
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;

        if (next >= targetSeconds) {
          const randomOpponent = sampleOpponents[Math.floor(Math.random() * sampleOpponents.length)];
          setOpponent(randomOpponent);
          setStatus("matched");
          return targetSeconds;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, targetSeconds]);

  const startMatching = () => {
    setOpponent(null);
    setElapsedSeconds(0);
    setTargetSeconds(8 + Math.floor(Math.random() * 6));
    setStatus("searching");
  };

  const cancelMatching = () => {
    setStatus("idle");
    setElapsedSeconds(0);
    setOpponent(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl"
      >
        <Card className="border-2 border-primary/20 shadow-lg">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Multiplayer Lobby</h1>
                <p className="text-muted-foreground mt-2">
                  Match with another player and practise speaking turns together.
                </p>
              </div>
              <Badge variant="secondary" className="w-fit">
                <Users className="w-3.5 h-3.5 mr-1" />
                {onlinePlayers} players online
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border border-border">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(profile?.name || "You")}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{profile?.name || "Guest Player"}</p>
                      <p className="text-sm text-muted-foreground">You</p>
                    </div>
                  </div>
                  <Badge variant="outline">Preferred Scenario: Airport Check-in</Badge>
                </CardContent>
              </Card>

              <Card className="border border-border">
                <CardContent className="p-5 space-y-4">
                  <p className="font-semibold text-foreground">Queue Status</p>

                  {status === "idle" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">Ready to find a partner for a live practice session.</p>
                      <Button className="w-full" variant="accent" onClick={startMatching}>
                        <Search className="w-4 h-4" />
                        Find Match
                      </Button>
                    </div>
                  )}

                  {status === "searching" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Searching...</span>
                        <span className="font-semibold text-foreground">{searchProgress}%</span>
                      </div>
                      <Progress value={searchProgress} />
                      <p className="text-sm text-muted-foreground">
                        Looking for a partner with a similar level. Usually takes about 10 seconds.
                      </p>
                      <Button className="w-full" variant="outline" onClick={cancelMatching}>
                        Cancel Search
                      </Button>
                    </div>
                  )}

                  {status === "matched" && opponent && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/30">
                        <Zap className="w-5 h-5 text-success" />
                        <div>
                          <p className="font-semibold text-foreground">Match Found!</p>
                          <p className="text-sm text-muted-foreground">You are paired with {opponent.name}</p>
                        </div>
                      </div>

                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{opponent.name}</p>
                            <p className="text-sm text-muted-foreground">{opponent.level}</p>
                          </div>
                          <Badge variant="outline">Rating {opponent.rating}</Badge>
                        </div>
                      </div>

                      <Button className="w-full" variant="success" onClick={onMatchReady}>
                        Start Practice Session
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
                Back to Mode Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default MultiplayerLobby;
