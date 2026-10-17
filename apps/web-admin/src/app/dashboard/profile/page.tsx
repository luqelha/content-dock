"use client";

import { useActionState, useEffect, useState } from "react";
import { useTenant } from "@/components/providers/tenant-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PASSWORD_HINT } from "@/lib/auth-validation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Lock, Loader2, Check, Camera } from "lucide-react";
import { updateUserProfile, updateUserPassword } from "@/actions/profile";

import { useRouter } from "next/navigation";

export default function UserProfilePage() {
  const { user } = useTenant();
  const [state, formAction, isPending] = useActionState(
    updateUserProfile,
    null,
  );
  const [showSuccess, setShowSuccess] = useState(false);

  const [passwordState, passwordFormAction, isPasswordPending] = useActionState(
    updateUserPassword,
    null,
  );
  const [showPasswordSuccess, setShowPasswordSuccess] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSuccess(true);
      setPreviewUrl(null);
      router.refresh();
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [state, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (passwordState?.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowPasswordSuccess(true);
      const timer = setTimeout(() => setShowPasswordSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [passwordState]);

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight mb-4">Profile</h1>
          <p className="text-muted-foreground">You are not logged in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-56px)] md:h-[calc(100dvh-56px)] flex flex-col p-4 sm:p-6 max-w-6xl mx-auto w-full md:overflow-hidden">
      <div className="flex-none mb-6">
        <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information and security preferences.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="mb-6 grid w-full max-w-400px grid-cols-2">
            <TabsTrigger value="general">General Information</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent
            value="general"
            className="focus-visible:outline-none focus-visible:ring-0"
          >
            <form action={formAction}>
              <input
                type="hidden"
                name="userId"
                value={user.id || user.userId || ""}
              />
              <div className="grid gap-6 md:grid-cols-2 items-start">
                {/* Left Column: Avatar */}
                <div className="flex flex-col gap-6">
                  <Card className="shrink-0">
                    <CardHeader>
                      <CardTitle>Profile Picture</CardTitle>
                      <CardDescription>
                        Your avatar visible to other users.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-5 pt-6 pb-8">
                      <div className="relative group">
                        <Label
                          htmlFor="avatarFile"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Avatar className="avatar-container h-28 w-28 border-4 border-background shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:border-primary/5">
                            {(previewUrl ||
                              state?.avatarUrl ||
                              user.avatarUrl) && (
                              <AvatarImage
                                className="avatar-preview rounded-full"
                                src={
                                  previewUrl ||
                                  state?.avatarUrl ||
                                  user.avatarUrl ||
                                  undefined
                                }
                                alt="Profile Picture"
                              />
                            )}
                            <AvatarFallback className="avatar-fallback text-3xl bg-muted text-muted-foreground font-medium">
                              {user.firstName && user.lastName
                                ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                                : user.email?.substring(0, 2).toUpperCase() ||
                                  "US"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ring-offset-background group-focus-within:ring-2 group-focus-within:ring-ring group-focus-within:ring-offset-2">
                            <Camera className="w-8 h-8 text-white drop-shadow-sm" />
                          </div>
                        </Label>
                        <Input
                          key={`avatarFile-${user.avatarUrl || ""}`}
                          id="avatarFile"
                          name="avatarFile"
                          type="file"
                          accept="image/png, image/jpeg, image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPreviewUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Profile Picture
                        </p>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG or WebP. Max 2MB. Click Save Changes to
                          upload.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Personal Information */}
                <div className="flex flex-col pb-6 md:pb-0">
                  <Card className="flex flex-col">
                    <CardHeader className="shrink-0">
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>
                        Update your basic profile information and contact
                        details.
                      </CardDescription>
                      {state?.error && (
                        <div className="mt-2 text-sm text-red-500">
                          {state.error}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-6 flex-1 flex flex-col">
                      <div className="grid gap-4 md:grid-cols-2 shrink-0">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input
                            key={`fn-${user.firstName || ""}`}
                            id="firstName"
                            name="firstName"
                            defaultValue={user.firstName || ""}
                            placeholder="John"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input
                            key={`ln-${user.lastName || ""}`}
                            id="lastName"
                            name="lastName"
                            defaultValue={user.lastName || ""}
                            placeholder="Doe"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 shrink-0">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          key={`email-${user.email}`}
                          id="email"
                          type="email"
                          defaultValue={user.email}
                          disabled
                        />
                        <p className="text-[13px] text-muted-foreground">
                          Your email address is used for login and cannot be
                          changed here.
                        </p>
                      </div>

                      <div className="space-y-1 flex flex-col">
                        <Label htmlFor="bio">Biography</Label>
                        <Textarea
                          key={`bio-${user.bio || ""}`}
                          id="bio"
                          name="bio"
                          defaultValue={user.bio || ""}
                          className="min-h-120px resize-none mt-2"
                          placeholder="Tell us a little bit about yourself..."
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4 shrink-0 mt-auto bg-muted/20">
                      <Button
                        type="submit"
                        disabled={isPending}
                        className="ml-auto min-w-140px shadow-sm transition-all duration-300"
                      >
                        {isPending ? (
                          <Loader2
                            className="animate-spin"
                            data-icon="inline-start"
                          />
                        ) : showSuccess ? (
                          <Check data-icon="inline-start" />
                        ) : (
                          <Save data-icon="inline-start" />
                        )}
                        {isPending
                          ? "Saving..."
                          : showSuccess
                            ? "Saved!"
                            : "Save Changes"}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent
            value="security"
            className="focus-visible:outline-none focus-visible:ring-0"
          >
            <form action={passwordFormAction}>
              <input
                type="hidden"
                name="userId"
                value={user.id || user.userId || ""}
              />
              <div className="max-w-2xl">
                <Card className="shrink-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Security
                    </CardTitle>
                    <CardDescription>Update your password.</CardDescription>
                    {passwordState?.error && (
                      <div className="mt-2 text-sm text-red-500">
                        {passwordState.error}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <PasswordInput
                        id="currentPassword"
                        name="currentPassword"
                        autoComplete="current-password"
                        visibilityLabel="current password"
                        readOnly={isPasswordPending}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <PasswordInput
                        id="newPassword"
                        name="newPassword"
                        autoComplete="new-password"
                        visibilityLabel="new password"
                        readOnly={isPasswordPending}
                        aria-describedby="new-password-hint"
                        required
                        minLength={15}
                        maxLength={72}
                      />
                      <p id="new-password-hint" className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t px-6 py-4 bg-muted/20">
                    <Button
                      type="submit"
                      disabled={isPasswordPending}
                      variant="outline"
                      className="w-auto shadow-sm transition-all duration-300 min-w-150px"
                    >
                      {isPasswordPending ? (
                        <Loader2
                          className="animate-spin"
                          data-icon="inline-start"
                        />
                      ) : showPasswordSuccess ? (
                        <Check data-icon="inline-start" />
                      ) : null}
                      {isPasswordPending
                        ? "Updating..."
                        : showPasswordSuccess
                          ? "Updated!"
                          : "Update Password"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
