import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentUser,
  useUpdateCurrentUser,
  useChangePassword,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/PageHeader";
import { LabelWithHelp } from "@/components/LabelWithHelp";
import { InfoTooltip } from "@/components/InfoTooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { HELP } from "@/lib/field-help";
import { formatRole } from "@workspace/rbac";
import { User, Shield, Bell, Eye, EyeOff, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileForm {
  name: string;
  username: string;
  email: string;
}

export function SettingsPage() {
  const qc = useQueryClient();
  const { data: user } = useGetCurrentUser();
  const updateProfile = useUpdateCurrentUser();
  const changePassword = useChangePassword();

  const [profile, setProfile] = useState<ProfileForm>({ name: "", username: "", email: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name,
        username: user.username,
        email: user.email,
      });
    }
  }, [user]);

  const initials = user
    ? `${user.name.split(" ")[0]?.[0] ?? ""}${user.name.split(" ")[1]?.[0] ?? ""}`.toUpperCase()
    : "U";

  const profileDirty =
    !!user &&
    (profile.name !== user.name ||
      profile.username !== user.username ||
      profile.email !== user.email);

  const invalidateUser = () =>
    qc.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!profile.username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!profile.email.trim()) {
      toast.error("Email is required");
      return;
    }

    updateProfile.mutate(
      {
        data: {
          name: profile.name.trim(),
          username: profile.username.trim(),
          email: profile.email.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success("Profile updated");
          invalidateUser();
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : "Failed to update profile";
          toast.error(message);
        },
      }
    );
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Current password is required");
      return;
    }
    if (!newPassword) {
      toast.error("New password is required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    changePassword.mutate(
      {
        data: {
          currentPassword,
          newPassword,
        },
      },
      {
        onSuccess: () => {
          toast.success("Password changed successfully");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : "Failed to change password";
          toast.error(message);
        },
      }
    );
  };

  const passwordField = (
    id: string,
    label: string,
    help: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    onToggle: () => void,
    autoComplete: string
  ) => (
    <div className="space-y-1.5">
      <LabelWithHelp htmlFor={id} help={help} className="text-xs">
        {label}
      </LabelWithHelp>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 pr-10"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        help={HELP.settings}
      />

      {user?.companyName && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Organization</h2>
          </div>
          <Separator />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{user.companyName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your workspace on CallReady AI
              </p>
              <span className="inline-block mt-1.5 text-xs bg-muted text-muted-foreground rounded px-2 py-0.5 font-medium capitalize">
                {formatRole(user.role)} access
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Profile */}
      <form
        onSubmit={handleProfileSubmit}
        className="bg-card border border-border rounded-xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Profile</h2>
        </div>
        <Separator />
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarFallback className="bg-primary text-white text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <span className="inline-block mt-1 text-xs bg-primary/10 text-primary rounded px-2 py-0.5 font-medium capitalize">
              {user?.role}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <LabelWithHelp help={HELP.fullNameSetting} className="text-xs">
              Full Name
            </LabelWithHelp>
            <Input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <LabelWithHelp help={HELP.username} className="text-xs">
              Username
            </LabelWithHelp>
            <Input
              value={profile.username}
              onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value }))}
              className="h-9"
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5 col-span-2">
            <LabelWithHelp help={HELP.email} className="text-xs">
              Email
            </LabelWithHelp>
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
              className="h-9"
              autoComplete="email"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!profileDirty || updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </div>
      </form>

      {/* Security */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Security</h2>
        </div>
        <Separator />
        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-foreground inline-flex items-center gap-1">
              JWT Authentication
              <InfoTooltip content={HELP.jwtAuth} />
            </p>
            <p className="text-xs text-muted-foreground">Token-based session management</p>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full px-2.5 py-1 font-medium">
            Active
          </span>
        </div>
        <Separator />
        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <p className="text-sm font-medium text-foreground">Change Password</p>
          {passwordField(
            "current-password",
            "Current Password",
            HELP.currentPassword,
            currentPassword,
            setCurrentPassword,
            showCurrentPassword,
            () => setShowCurrentPassword((v) => !v),
            "current-password"
          )}
          <div className="grid grid-cols-2 gap-3">
            {passwordField(
              "new-password",
              "New Password",
              HELP.newPassword,
              newPassword,
              setNewPassword,
              showNewPassword,
              () => setShowNewPassword((v) => !v),
              "new-password"
            )}
            {passwordField(
              "confirm-password",
              "Confirm Password",
              HELP.confirmPassword,
              confirmPassword,
              setConfirmPassword,
              showConfirmPassword,
              () => setShowConfirmPassword((v) => !v),
              "new-password"
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                changePassword.isPending
              }
            >
              {changePassword.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Notifications */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-1">
            Notifications
            <InfoTooltip content={HELP.notifications} />
          </h2>
        </div>
        <Separator />
        <p className="text-sm text-muted-foreground">Notification preferences coming soon.</p>
      </div>
    </div>
  );
}
