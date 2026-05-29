import React, { useState } from "react";
import { Mail, Lock, User, RefreshCw, Github, Chrome, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  initialMode?: "login" | "register";
}

export default function AuthModal({ onClose, onSuccess, initialMode = "login" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" ? { email, password } : { name, email, password };

    try {
      if (mode === "forgot") {
        // Mock forgot password workflow
        await new Promise((res) => setTimeout(res, 1200));
        alert("A password recovery link has been sent to your email address (Simulated).");
        setMode("login");
        setLoading(false);
        return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please check your credentials.");
      }

      onSuccess(data.token, data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (platform: string) => {
    setLoading(true);
    setError("");
    // Simulate social sign on directly with a beautiful demo account
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@example.com", password: "demo" }),
      });
      
      // Fallback custom register in case db was reset
      if (!res.ok) {
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${platform} User`,
            email: `${platform.toLowerCase()}_user@example.com`,
            password: "socialpassword",
          }),
        });
        const regData = await regRes.json();
        onSuccess(regData.token, regData.user);
      } else {
        const data = await res.json();
        onSuccess(data.token, data.user);
      }
      onClose();
    } catch (err: any) {
      setError("Social login simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-2xl"
      >
        {/* Banner header glow */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-605" />
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              {mode === "login" && "Welcome Back"}
              {mode === "register" && "Create Developer Account"}
              {mode === "forgot" && "Reset Password"}
            </h2>
            <button
              id="auth-close-btn"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-650 transition-colors p-1 hover:bg-slate-100 rounded-lg text-lg font-bold"
            >
              &times;
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 text-xs font-semibold rounded-lg bg-red-50 border border-red-200 text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 font-display">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    id="reg-name-field"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Girish Yadav"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 rounded-xl text-sm text-slate-800 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 font-display">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  id="auth-email-field"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 rounded-xl text-sm text-slate-800 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 font-display">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock size={16} />
                  </span>
                  <input
                    id="auth-password-field"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 rounded-xl text-sm text-slate-800 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer shadow-sm"
            >
              {loading && <RefreshCw size={16} className="animate-spin" />}
              {mode === "login" && "Sign In to Account"}
              {mode === "register" && "Create Developer Account"}
              {mode === "forgot" && "Generate Password Link"}
            </button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs text-slate-400 font-medium">
                  <span className="px-3 bg-white">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  id="auth-google-btn"
                  onClick={() => handleSocialLogin("Google")}
                  disabled={loading}
                  className="flex items-center justify-center gap-2.5 py-2 px-4 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  <Chrome size={16} className="text-slate-500" />
                  <span>Google</span>
                </button>
                <button
                  id="auth-github-btn"
                  onClick={() => handleSocialLogin("GitHub")}
                  disabled={loading}
                  className="flex items-center justify-center gap-2.5 py-2 px-4 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  <Github size={16} className="text-slate-500" />
                  <span>GitHub</span>
                </button>
              </div>
            </>
          )}

          <div className="text-center">
            {mode === "login" && (
              <p className="text-xs text-slate-500 font-medium">
                Don't have an account yet?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Sign Up &rarr;
                </button>
              </p>
            )}
            {mode === "register" && (
              <p className="text-xs text-slate-500 font-medium">
                Already registered?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Log In &rarr;
                </button>
              </p>
            )}
            {mode === "forgot" && (
              <p className="text-xs text-slate-500 font-medium">
                Remember your password?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Back to Log In
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
