"use client";

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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Save, Lock } from "lucide-react";

export default function UserProfilePage() {
  const { user } = useTenant();

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
        <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] lg:grid-cols-[1fr_2fr] md:h-full">
          {/* Left Column: Avatar & Security */}
          <div className="flex flex-col gap-6">
            <Card className="shrink-0">
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>
                  Your avatar visible to other users.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="text-2xl bg-foreground text-background">
                    {user.email?.substring(0, 2).toUpperCase() || "US"}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="w-full">
                  Change Avatar
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Recommended: 400x400px. Max 2MB.
                </p>
              </CardContent>
            </Card>

            <Card className="shrink-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Security
                </CardTitle>
                <CardDescription>Update your password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button variant="secondary" className="w-full">
                  Update Password
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column: Personal Information */}
          <div className="md:h-full flex flex-col pb-6 md:pb-0">
            <Card className="md:h-full flex flex-col flex-1">
              <CardHeader className="shrink-0">
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your basic profile information and contact details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col">
                <div className="grid gap-4 md:grid-cols-2 shrink-0">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input id="first-name" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input id="last-name" placeholder="Doe" />
                  </div>
                </div>
                <div className="space-y-2 shrink-0">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    defaultValue={user.email}
                    disabled
                  />
                  <p className="text-[13px] text-muted-foreground">
                    Your email address is used for login and cannot be changed
                    here.
                  </p>
                </div>

                <div className="space-y-1 h-full flex flex-col flex-1 min-h-30">
                  <Label htmlFor="bio">Biography</Label>
                  <Textarea
                    id="bio"
                    className="flex-1 resize-none mt-2"
                    placeholder="Tell us a little bit about yourself..."
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4 shrink-0 mt-auto">
                <Button className="ml-auto">
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
