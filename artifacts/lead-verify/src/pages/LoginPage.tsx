import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { LabelWithHelp } from "@/components/LabelWithHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoTooltip } from "@/components/InfoTooltip";
import { HELP } from "@/lib/field-help";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LoginPage() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) { setError("Username is required"); return; }
    if (!password) { setError("Password is required"); return; }

    login.mutate(
      { data: { username, password, rememberMe } },
      {
        onSuccess: (data) => {
          setToken(data.token);
          const org = data.user.companyName ? ` · ${data.user.companyName}` : "";
          toast.success(`Welcome back, ${data.user.name}${org}`);
          navigate("/dashboard");
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : "Invalid username or password";
          setError(message);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">CallReady AI</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered lead verification platform</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-md p-6">
          <h2 className="text-base font-semibold text-foreground mb-5">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <LabelWithHelp htmlFor="username" help={HELP.loginUsername} className="text-sm font-medium">
                Username
              </LabelWithHelp>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <LabelWithHelp htmlFor="password" help={HELP.loginPassword} className="text-sm font-medium">
                Password
              </LabelWithHelp>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(v) => setRememberMe(Boolean(v))}
              />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer inline-flex items-center gap-1">
                Remember me
                <InfoTooltip content={HELP.rememberMe} />
              </Label>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Demo: <span className="font-mono text-foreground">admin</span>,{" "}
          <span className="font-mono text-foreground">agent</span>, or{" "}
          <span className="font-mono text-foreground">retailai</span> /{" "}
          <span className="font-mono text-foreground">password123</span>
        </p>
      </div>
    </div>
  );
}
