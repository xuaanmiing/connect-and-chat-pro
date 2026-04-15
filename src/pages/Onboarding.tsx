import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { saveProfile, UserProfile } from "@/lib/userProfile";
import { User, ArrowRight, ArrowLeft } from "lucide-react";
import { auth, db } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

interface OnboardingProps {
  onComplete: () => void;
}

const roles = [
  { value: "learner" as const, label: "I'm practising", icon: "🎓" },
  { value: "caregiver" as const, label: "I'm a caregiver", icon: "🤝" },
  { value: "therapist" as const, label: "I'm a therapist", icon: "💼" },
];

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [view, setView] = useState<"initial" | "login" | "register">("initial");
  const [step, setStep] = useState(0);
  
  // Form State
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [role, setRole] = useState<UserProfile["role"] | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Status State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Save local profile so the app knows we are logged in
      saveProfile({ name: email.split('@')[0], age: "25", role: "learner", createdAt: new Date().toISOString() });
      onComplete();
    } catch (err: any) {
      setError("Invalid email or password.");
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !role || !email || !password) return;
    setError("");
    setIsLoading(true);

    try {
      // 1. Create the Auth account
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Fire-and-forget Firestore save. (Removing 'await' prevents the infinite freeze!)
      setDoc(doc(db, "users", cred.user.uid), {
        name, age, role, email, createdAt: new Date()
      }).catch(err => console.error("Database save delayed:", err));

      // 3. Save to local storage to trigger the ModeSelect screen
      saveProfile({ name, age, role: role as UserProfile["role"], createdAt: new Date().toISOString() });
      
      // 4. Trigger the app to move forward!
      onComplete();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
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
            {view === 'initial' ? "Let's get started" : view === 'login' ? "Welcome back" : "Let's set up your profile"}
          </p>
        </div>

        {/* --- VIEW: INITIAL CHOICE --- */}
        {view === "initial" && (
          <motion.div key="initial" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Button size="lg" className="w-full" onClick={() => setView("login")}>
              Log In
            </Button>
            <div className="text-center text-sm text-muted-foreground my-2">or</div>
            <Button size="lg" variant="outline" className="w-full" onClick={() => setView("register")}>
              Create a New Profile
            </Button>
          </motion.div>
        )}

        {/* --- VIEW: LOGIN --- */}
        {view === "login" && (
          <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
                className="w-full h-14 rounded-xl border-2 border-border bg-card px-4 text-lg focus:border-primary focus:outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full h-14 rounded-xl border-2 border-border bg-card px-4 text-lg focus:border-primary focus:outline-none"
              />
              <Button size="lg" className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Log In"}
              </Button>
            </form>
            <Button variant="ghost" className="w-full mt-2" onClick={() => setView("initial")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </motion.div>
        )}

        {/* --- VIEW: REGISTER (Original Lovable Steps) --- */}
        {view === "register" && step === 0 && (
          <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <label className="block text-sm font-semibold text-foreground">What's your name?</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full h-14 rounded-xl border-2 border-border bg-card px-4 text-lg focus:border-primary focus:outline-none"
            />
            <Button size="lg" className="w-full" disabled={!name.trim()} onClick={() => setStep(1)}>
              Next <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setView("initial")}>Back</Button>
          </motion.div>
        )}

        {view === "register" && step === 1 && (
          <motion.div key="age" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <label className="block text-sm font-semibold text-foreground">How old are you?</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter your age"
              min="1"
              max="120"
              className="w-full h-14 rounded-xl border-2 border-border bg-card px-4 text-lg focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2">
              <Button size="lg" variant="outline" onClick={() => setStep(0)}>Back</Button>
              <Button size="lg" className="flex-1" disabled={!age} onClick={() => setStep(2)}>
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {view === "register" && step === 2 && (
          <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <label className="block text-sm font-semibold text-foreground">What best describes you?</label>
            <div className="space-y-3">
              {roles.map((r) => (
                <Button
                  key={r.value}
                  variant="outline"
                  className={`w-full justify-start h-14 ${role === r.value ? "border-primary ring-2 ring-primary bg-primary/5" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <span className="text-2xl mr-3">{r.icon}</span>
                  {r.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="lg" variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button size="lg" className="flex-1" disabled={!role} onClick={() => setStep(3)}>
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* NEW STEP 3: FIREBASE CREDENTIALS */}
        {view === "register" && step === 3 && (
          <motion.div key="credentials" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <label className="block text-sm font-semibold text-foreground">Secure your account</label>
            {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
            <form onSubmit={handleRegister} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                required
                className="w-full h-14 rounded-xl border-2 border-border bg-card px-4 text-lg focus:border-primary focus:outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                required
                minLength={6}
                className="w-full h-14 rounded-xl border-2 border-border bg-card px-4 text-lg focus:border-primary focus:outline-none"
              />
              <div className="flex gap-2">
                <Button size="lg" variant="outline" type="button" onClick={() => setStep(2)}>Back</Button>
                <Button size="lg" className="flex-1" type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Finish 🚀"}
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {view === "register" && (
          <div className="flex justify-center gap-2 mt-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`w-3 h-3 rounded-full ${i === step ? "bg-primary" : "bg-border"}`} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Onboarding;