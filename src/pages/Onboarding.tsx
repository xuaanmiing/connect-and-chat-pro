import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSavedProfiles, saveProfile, signInProfile, UserProfile } from "@/lib/userProfile";
import { ArrowLeft, ArrowRight, LogIn, User, UserPlus } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const roles = [
  { value: "learner" as const, label: "I'm practising", icon: "🎓" },
  { value: "therapist" as const, label: "I'm a therapist", icon: "💼" },
];

const languages = [
  { value: "en-US" as const, label: "English" },
  { value: "zh-CN" as const, label: "Chinese (Simplified)" },
];

type AuthMode = "chooser" | "sign-in" | "register";

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [authMode, setAuthMode] = useState<AuthMode>("chooser");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [signInName, setSignInName] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [role, setRole] = useState<UserProfile["role"] | "">("");
  const [preferredLanguage, setPreferredLanguage] =
    useState<UserProfile["preferredLanguage"]>("en-US");
  const savedProfiles = getSavedProfiles();

  const resetRegistration = () => {
    setStep(0);
    setName("");
    setAge("");
    setRole("");
    setPreferredLanguage("en-US");
  };

  const handleChooseRegister = () => {
    resetRegistration();
    setSignInError("");
    setAuthMode("register");
  };

  const handleChooseSignIn = () => {
    setSignInName("");
    setPassword("");
    setSignInError("");
    setAuthMode("sign-in");
  };

  const handleFinish = () => {
    if (!name || !age || !role) return;
    saveProfile({
      name,
      age,
      role,
      preferredLanguage,
      createdAt: new Date().toISOString(),
    });
    onComplete();
  };

  const handleSignIn = (profile: UserProfile) => {
    signInProfile(profile);
    onComplete();
  };

  const handleSubmitFakeSignIn = () => {
    const normalizedName = signInName.trim().toLowerCase();
    if (!normalizedName || !password.trim()) {
      setSignInError("Enter both username and password.");
      return;
    }

    const matchedProfile = savedProfiles.find(
      (profile) => profile.name.trim().toLowerCase() === normalizedName
    );

    if (!matchedProfile) {
      setSignInError("No saved profile matches that username. Register first or try a saved name.");
      return;
    }

    setSignInError("");
    handleSignIn(matchedProfile);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/20 mx-auto flex items-center justify-center mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Welcome to CommPractice
          </h1>
          <p className="text-muted-foreground">
            {authMode === "chooser"
              ? "Sign in to continue or create a new profile"
              : authMode === "sign-in"
                ? "Use a fake username and password to continue"
                : "Create your profile to get started"}
          </p>
        </div>

        {authMode === "chooser" && (
          <motion.div
            key="chooser"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <motion.div whileTap={{ scale: 0.98 }}>
              <Card
                className="cursor-pointer border-2 hover:border-primary transition-colors"
                onClick={handleChooseSignIn}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <LogIn className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">Sign In</h2>
                    <p className="text-sm text-muted-foreground">
                      Continue with a saved local profile on this device.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileTap={{ scale: 0.98 }}>
              <Card
                className="cursor-pointer border-2 hover:border-primary transition-colors"
                onClick={handleChooseRegister}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-7 h-7 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">Register</h2>
                    <p className="text-sm text-muted-foreground">
                      Create a new learner or therapist profile.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <p className="text-center text-sm text-muted-foreground">
              {savedProfiles.length > 0
                ? `${savedProfiles.length} saved profile${savedProfiles.length === 1 ? "" : "s"} found on this device.`
                : "No saved profiles yet. Register to create your first one."}
            </p>
          </motion.div>
        )}

        {authMode === "sign-in" && (
          <motion.div
            key="sign-in"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Username</label>
                  <Input
                    type="text"
                    value={signInName}
                    onChange={(e) => setSignInName(e.target.value)}
                    placeholder="Enter your username"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="h-12 rounded-xl"
                  />
                </div>

                {signInError && <p className="text-sm text-destructive">{signInError}</p>}

                <Button
                  variant="accent"
                  className="w-full"
                  disabled={!signInName.trim() || !password.trim()}
                  onClick={handleSubmitFakeSignIn}
                >
                  Sign In
                </Button>
              </CardContent>
            </Card>

            {savedProfiles.length === 0 && (
              <Card>
                <CardContent className="p-5 text-center space-y-3">
                  <p className="text-foreground font-semibold">No saved profiles found</p>
                  <p className="text-sm text-muted-foreground">
                    Register a new profile first, then sign in with that username.
                  </p>
                  <Button variant="accent" onClick={handleChooseRegister}>
                    Create Profile
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                setSignInError("");
                setAuthMode("chooser");
              }}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </motion.div>
        )}

        {authMode === "register" && step === 0 && (
          <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <label className="block text-sm font-semibold text-foreground">What's your name?</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="h-14 rounded-xl border-2 border-border bg-card px-4 text-lg"
            />
            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setAuthMode("chooser")}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button size="lg" className="flex-1" disabled={!name.trim()} onClick={() => setStep(1)}>
                Next <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {authMode === "register" && step === 1 && (
          <motion.div key="age" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <label className="block text-sm font-semibold text-foreground">How old are you?</label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter your age"
              min="1"
              max="120"
              className="h-14 rounded-xl border-2 border-border bg-card px-4 text-lg"
            />
            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep(0)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button size="lg" className="flex-1" disabled={!age} onClick={() => setStep(2)}>
                Next <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {authMode === "register" && step === 2 && (
          <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <label className="block text-sm font-semibold text-foreground">What best describes you?</label>
            <div className="space-y-3">
              {roles.map((r) => (
                <Button
                  key={r.value}
                  variant="aac"
                  className={`w-full justify-start ${role === r.value ? "border-primary ring-2 ring-primary bg-primary/5" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <span className="text-2xl mr-3">{r.icon}</span>
                  {r.label}
                </Button>
              ))}
            </div>
            <div className="pt-2">
              <label className="block text-sm font-semibold text-foreground mb-2">Preferred language</label>
              <div className="grid grid-cols-2 gap-2">
                {languages.map((language) => (
                  <Button
                    key={language.value}
                    type="button"
                    variant="outline"
                    className={`w-full ${
                      preferredLanguage === language.value
                        ? "border-primary ring-2 ring-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setPreferredLanguage(language.value)}
                  >
                    {language.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button size="lg" variant="accent" className="flex-1" disabled={!role} onClick={handleFinish}>
                Get Started
              </Button>
            </div>
          </motion.div>
        )}

        {authMode === "register" && (
          <div className="flex justify-center gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === step ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Onboarding;
