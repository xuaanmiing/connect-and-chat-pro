import { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { airportCheckInScenario, Checkpoint } from "@/data/airportScenario";
import { scenarios } from "@/data/scenarios";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import CameraFeed from "@/components/CameraFeed";
import MascotAvatar from "@/components/MascotAvatar";
import { getProfile } from "@/lib/userProfile";
import { analyzeCheckpointWithAgent, AgentMode } from "@/lib/aiAgent";
import { ArrowLeft, Mic, MicOff, Lightbulb, RotateCcw, Star, Loader2 } from "lucide-react";

interface AirportCheckInProps {
  onBack: () => void;
  mode?: "voice" | "aac";
  scenarioId?: string;
}

const tokenize = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);

const toCardId = (input: string, index: number) =>
  `${input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "option"}-${index}`;

const pickEmoji = (label: string) => {
  const lower = label.toLowerCase();
  if (lower.includes("yes")) return "✅";
  if (lower.includes("no")) return "❌";
  if (lower.includes("help")) return "🆘";
  if (lower.includes("please")) return "🙏";
  if (lower.includes("thank")) return "🙏";
  if (lower.includes("donut")) return "🍩";
  if (lower.includes("bathroom")) return "🚻";
  if (lower.includes("left")) return "⬅️";
  if (lower.includes("right")) return "➡️";
  if (lower.includes("apple")) return "🍎";
  if (lower.includes("bag")) return "🛍️";
  if (lower.includes("friend")) return "👋";
  if (lower.includes("ice cream")) return "🍦";
  if (lower.includes("hello") || lower.includes("hi")) return "👋";
  return "💬";
};

const buildCheckpointsFromScenario = (scenarioId: string): { title: string; icon: string; checkpoints: Checkpoint[] } => {
  if (scenarioId === "airport-checkin") {
    return {
      title: "Airport Check-in",
      icon: "✈️",
      checkpoints: airportCheckInScenario,
    };
  }

  const sourceScenario = scenarios.find((scenario) => scenario.id === scenarioId);
  if (!sourceScenario) {
    return {
      title: "Airport Check-in",
      icon: "✈️",
      checkpoints: airportCheckInScenario,
    };
  }

  const checkpoints: Checkpoint[] = sourceScenario.steps.map((step) => {
    const preferredOptions = step.options.filter((option) => option.isCorrect);
    const options = preferredOptions.length > 0 ? preferredOptions : step.options;
    const responseCards = options.map((option, index) => ({
      id: toCardId(option.label, index),
      label: option.label,
      emoji: option.icon || "💬",
    }));
    const supportLabels = [
      "yes",
      "no",
      "please",
      "thank you",
      "I need help",
      ...tokenize(step.prompt).slice(0, 4),
      ...tokenize(step.context).slice(0, 4),
    ];
    const supportCards = Array.from(new Set(supportLabels))
      .filter((label) => label.length >= 2)
      .slice(0, 8)
      .map((label, index) => ({
        id: `support-${toCardId(label, index)}`,
        label,
        emoji: pickEmoji(label),
      }))
      .filter((card) => !responseCards.some((existing) => existing.label.toLowerCase() === card.label.toLowerCase()));
    const cards = [...responseCards, ...supportCards];

    const keywords = Array.from(
      new Set(
        options.flatMap((option) => [option.label.toLowerCase(), ...tokenize(option.label)])
      )
    );
    const firstOption = options[0];

    return {
      id: step.id,
      mascotPrompt: step.prompt,
      hintPrompt: firstOption ? `Try saying: "${firstOption.label}"` : "Try a short response.",
      aacHintPrompt: firstOption ? `Try tapping: ${firstOption.label}` : "Try selecting one response card.",
      keywords,
      aacPictureCards: cards,
      validAacCombinations: responseCards.map((card) => [card.id]),
      successResponse: firstOption?.feedback || "Great response. Let's continue.",
      extractField: step.id,
    };
  });

  checkpoints.push({
    id: "complete",
    mascotPrompt: `Great work! You completed ${sourceScenario.title}.`,
    hintPrompt: "",
    keywords: [],
    aacPictureCards: [],
    successResponse: "",
  });

  return {
    title: sourceScenario.title,
    icon: sourceScenario.icon,
    checkpoints,
  };
};

const AirportCheckIn = ({ onBack, mode = "voice", scenarioId = "airport-checkin" }: AirportCheckInProps) => {
  const profile = getProfile();
  const effectiveProfile = profile || {
    name: "Traveler",
    age: "18",
    role: "learner" as const,
    preferredLanguage: "en-US",
    createdAt: new Date().toISOString(),
  };
  const userLanguage = profile?.preferredLanguage || "en-US";
  const scenarioData = buildCheckpointsFromScenario(scenarioId);
  const checkpoints = scenarioData.checkpoints;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [mascotMessage, setMascotMessage] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintTimer, setHintTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [coachingTip, setCoachingTip] = useState("");
  const [capturedAnswers, setCapturedAnswers] = useState<Record<string, string>>({});
  const [selectedMode, setSelectedMode] = useState<AgentMode>("coaching");
  const [aacStrip, setAacStrip] = useState<string[]>([]);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const lastProcessedTranscriptRef = useRef("");

  const {
    isListening,
    isTranscribing,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error: speechError,
  } = useSpeechRecognition();
  const { speak, isSpeaking, stop: stopSpeaking } = useSpeechSynthesis();

  const lastCheckpointIndex = checkpoints.length - 1;
  const safeIndex = Math.min(Math.max(currentIndex, 0), lastCheckpointIndex);
  const checkpoint = checkpoints[safeIndex];
  const isLastCheckpoint = safeIndex === lastCheckpointIndex;
  const progress = lastCheckpointIndex > 0 ? (safeIndex / lastCheckpointIndex) * 100 : 100;
  const availableCards = checkpoint?.aacPictureCards.filter(Boolean) ?? [];

  const getCardById = useCallback(
    (cardId: string) => availableCards.find((card) => card.id === cardId),
    [availableCards]
  );

  const isValidAacSelection = useCallback(
    (selectedIds: string[]) => {
      if (!checkpoint || selectedIds.length === 0) return false;

      if (!checkpoint.validAacCombinations?.length) return false;
      const normalized = [...selectedIds].sort();
      const exactMatch = checkpoint.validAacCombinations.some((combo) => {
        const sortedCombo = [...combo].sort();
        if (sortedCombo.length !== normalized.length) return false;
        return sortedCombo.every((id, idx) => id === normalized[idx]);
      });

      if (exactMatch) return true;

      // Relaxed AAC check: allow short but meaningful answers (e.g., only "Tokyo")
      // by matching selected labels against checkpoint keywords.
      const selectedMessage = selectedIds
        .map((id) => getCardById(id)?.label?.toLowerCase().trim() || "")
        .filter(Boolean)
        .join(" ");
      if (!selectedMessage) return false;

      return checkpoint.keywords.some((keyword) =>
        selectedMessage.includes(keyword.toLowerCase().trim())
      );
    },
    [checkpoint, getCardById]
  );

  useEffect(() => {
    setCurrentIndex(0);
    setIsComplete(false);
    setCapturedAnswers({});
    setCoachingTip("");
    setAacStrip([]);
    setWaitingForResponse(false);
    stopListening();
    stopSpeaking();
    resetTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId, mode]);

  useEffect(() => {
    if (!checkpoint) return;
    setMascotMessage(checkpoint.mascotPrompt);
    setShowHint(false);
    setWaitingForResponse(false);
    setCoachingTip("");
    setAacStrip([]);
    lastProcessedTranscriptRef.current = "";
    resetTranscript();

    const speakAndWait = async () => {
      const firstName = profile?.name?.split(" ")[0] || "there";
      const personalizedPrompt =
        checkpoint.id === "greeting"
          ? `Hi ${firstName}. ${checkpoint.mascotPrompt}`
          : checkpoint.mascotPrompt;
      setMascotMessage(personalizedPrompt);
      await speak(personalizedPrompt, userLanguage);
      if (!isLastCheckpoint) {
        setWaitingForResponse(true);
        setIsAdvancing(false);
      } else {
        setTimeout(() => setIsComplete(true), 1600);
      }
    };

    speakAndWait();

    return () => {
      if (hintTimer) clearTimeout(hintTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    if (!waitingForResponse || isLastCheckpoint || selectedMode === "realistic") return;
    const timer = setTimeout(() => setShowHint(true), 9000);
    setHintTimer(timer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForResponse, selectedMode]);

  useEffect(() => {
    if (selectedMode === "realistic") {
      setShowHint(false);
    }
  }, [selectedMode]);

  const processResponse = useCallback(
    async (userSpeech: string) => {
      if (!checkpoint || isLastCheckpoint) return;

      flushSync(() => setIsAnalyzing(true));
      const result = await analyzeCheckpointWithAgent(checkpoint, userSpeech, effectiveProfile, selectedMode);
      setIsAnalyzing(false);

      if (result.coachingTip) {
        setCoachingTip(result.coachingTip);
      }

      if (result.accepted) {
        setShowHint(false);
        setWaitingForResponse(false);
        setIsAdvancing(true);

        if (checkpoint.extractField) {
          setCapturedAnswers((prev) => ({
            ...prev,
            [checkpoint.extractField!]: result.extractedValue || userSpeech,
          }));
        }

        setMascotMessage(result.feedback);
        await speak(result.feedback, userLanguage);

        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 700);
      } else {
        setMascotMessage(result.feedback || checkpoint.hintPrompt);
        await speak(result.feedback || checkpoint.hintPrompt, userLanguage);
        setWaitingForResponse(true);
      }
    },
    [checkpoint, effectiveProfile, isLastCheckpoint, selectedMode, speak, userLanguage]
  );

  useEffect(() => {
    const cleaned = transcript.trim();
    if (!cleaned) return;
    if (!waitingForResponse || isAnalyzing || isTranscribing || isListening) return;
    if (cleaned === lastProcessedTranscriptRef.current) return;

    lastProcessedTranscriptRef.current = cleaned;
    processResponse(cleaned);
  }, [isAnalyzing, isListening, isTranscribing, processResponse, transcript, waitingForResponse]);

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      lastProcessedTranscriptRef.current = "";
      resetTranscript();
      startListening(userLanguage);
    }
  };

  const handleAacCardSelect = (cardId: string) => {
    if (!waitingForResponse || isSpeaking) return;
    setAacStrip((prev) => {
      if (prev.includes(cardId)) return prev;
      return [...prev, cardId].slice(-6);
    });
  };

  const handleAacUndo = () => {
    setAacStrip((prev) => prev.slice(0, -1));
  };

  const handleAacSend = () => {
    if (!checkpoint || !waitingForResponse || aacStrip.length === 0 || isAdvancing) return;
    if (isValidAacSelection(aacStrip)) {
      const selectedMessage = aacStrip
        .map((cardId) => getCardById(cardId)?.label || "")
        .filter(Boolean)
        .join(" ");
      processResponse(selectedMessage);
      setAacStrip([]);
      return;
    }
    const fallbackMessage =
      selectedMode === "realistic"
        ? "Sorry, I didn't catch that. Could you answer again?"
        : checkpoint.hintPrompt;
    setMascotMessage(fallbackMessage);
    void speak(fallbackMessage, userLanguage);
    setWaitingForResponse(true);
  };

  const handleRestart = () => {
    stopListening();
    stopSpeaking();
    setCurrentIndex(0);
    setIsComplete(false);
    setCapturedAnswers({});
    setCoachingTip("");
    setAacStrip([]);
    resetTranscript();
  };

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto text-center py-12 px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-8xl mb-6"
        >
          {scenarioData.icon}
        </motion.div>
        <h2 className="font-display text-3xl font-bold text-foreground mb-3">
          Scenario Complete!
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Nice work, {profile?.name || "traveler"}. You completed "{scenarioData.title}".
        </p>
        <div className="mb-8 bg-card border-2 border-border rounded-xl p-4 text-left">
          <p className="text-sm font-semibold text-muted-foreground mb-2">Session summary</p>
          {Object.keys(capturedAnswers).length === 0 && (
            <p className="text-foreground text-sm">No responses were captured.</p>
          )}
          {Object.entries(capturedAnswers).map(([field, value]) => (
            <p key={field} className="text-foreground text-sm">
              {field.replace(/-/g, " ")}: {value || "Not captured"}
            </p>
          ))}
        </div>
        <div className="flex items-center justify-center gap-2 mb-8">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
            >
              <Star className="w-8 h-8 fill-accent text-accent" />
            </motion.div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="accent" size="lg" onClick={handleRestart}>
            <RotateCcw className="w-5 h-5" /> Try Again
          </Button>
          <Button variant="outline" size="lg" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" /> Back
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!checkpoint) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-muted-foreground mb-4">Something went wrong with this step. Please restart.</p>
        <Button variant="accent" onClick={handleRestart}>
          <RotateCcw className="w-4 h-4" /> Restart Scenario
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-display text-xl font-bold text-foreground">
            {scenarioData.icon} {scenarioData.title} {mode === "aac" ? "(AAC Mode)" : "(Voice Mode)"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Step {currentIndex + 1} of {checkpoints.length}
          </p>
        </div>
      </div>

      <Progress value={progress} className="mb-4 h-3" />

      {/* AI mode selector */}
      <div className="mb-6 rounded-xl border bg-card p-3">
        <p className="text-sm font-medium mb-2">Conversation mode</p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedMode === "coaching" ? "accent" : "outline"}
            onClick={() => setSelectedMode("coaching")}
            disabled={isListening || isAnalyzing || isTranscribing}
          >
            Coaching
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selectedMode === "realistic" ? "accent" : "outline"}
            onClick={() => setSelectedMode("realistic")}
            disabled={isListening || isAnalyzing || isTranscribing}
          >
            Realistic
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {selectedMode === "coaching"
            ? "AI guides you and gives tips."
            : "AI behaves like real check-in staff with less guidance."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: input area */}
        <div className="space-y-4">
          {mode === "voice" && <CameraFeed />}

          {/* Voice mic button */}
          {mode === "voice" && waitingForResponse && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Button
                size="xl"
                variant={isListening ? "destructive" : "accent"}
                className="w-full"
                onClick={handleMicToggle}
                disabled={!isSupported || isSpeaking || isAnalyzing || isTranscribing}
              >
                {isListening ? (
                  <><MicOff className="w-6 h-6" /> Stop Recording</>
                ) : (
                  <><Mic className="w-6 h-6" /> Tap to Speak</>
                )}
              </Button>
              {!isSupported && (
                <p className="text-sm text-destructive text-center mt-2">
                  Speech recognition is not supported in this browser.
                </p>
              )}
              {speechError && (
                <p className="text-sm text-destructive text-center mt-2">{speechError}</p>
              )}
            </motion.div>
          )}

          {/* AAC picture cards */}
          {mode === "aac" && waitingForResponse && (
            <div className="space-y-3">
              {/* AAC strip (selected cards) */}
              <div className="min-h-14 bg-muted rounded-xl p-2 flex flex-wrap gap-2 items-center">
                {aacStrip.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2">Tap cards below to build your response</p>
                ) : (
                  aacStrip.map((cardId) => {
                    const card = getCardById(cardId);
                    return card ? (
                      <span key={cardId} className="bg-card border rounded-lg px-2 py-1 text-sm flex items-center gap-1">
                        <span>{card.emoji}</span> {card.label}
                      </span>
                    ) : null;
                  })
                )}
              </div>
              {/* Card grid */}
              <div className="grid grid-cols-4 gap-2">
                {availableCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handleAacCardSelect(card.id)}
                    className="flex flex-col items-center gap-1 rounded-xl border bg-card p-2 hover:border-primary transition-colors text-center"
                  >
                    <span className="text-2xl">{card.emoji}</span>
                    <span className="text-xs text-foreground leading-tight">{card.label}</span>
                  </button>
                ))}
              </div>
              {/* AAC actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleAacUndo} disabled={aacStrip.length === 0}>
                  Undo
                </Button>
                <Button variant="accent" size="sm" onClick={handleAacSend} disabled={aacStrip.length === 0 || isAdvancing}>
                  Send
                </Button>
              </div>
            </div>
          )}

          {/* Transcript (voice mode) */}
          {transcript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-card border-2 border-border rounded-xl p-4"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">You said:</p>
              <p className="text-foreground text-lg">"{transcript}"</p>
            </motion.div>
          )}

          {isAnalyzing && (
            <div className="bg-muted border rounded-xl p-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> AI agent is analyzing your response...
            </div>
          )}

          {isTranscribing && (
            <div className="bg-muted border rounded-xl p-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Transcribing speech with Whisper...
            </div>
          )}
        </div>

        {/* Right: mascot + hints */}
        <div className="flex flex-col items-center justify-center gap-6">
          <MascotAvatar isSpeaking={isSpeaking} message={mascotMessage} />

          <AnimatePresence>
            {selectedMode !== "realistic" && showHint && checkpoint?.hintPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-accent/10 border-2 border-accent/20 rounded-xl p-4 flex items-start gap-3 max-w-sm"
              >
                <Lightbulb className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  {mode === "aac" ? (checkpoint.aacHintPrompt || checkpoint.hintPrompt) : checkpoint.hintPrompt}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {coachingTip && (
            <div className="max-w-sm rounded-xl border bg-card p-3 text-sm text-muted-foreground">
              Coach tip: {coachingTip}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AirportCheckIn;
