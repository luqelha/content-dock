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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export default function TenantSettingsPage() {
  const { activeTenant } = useTenant();

  if (!activeTenant) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight mb-4">Settings</h1>
        <p>No active tenant selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenant Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage settings for {activeTenant.name}
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Details</CardTitle>
              <CardDescription>
                Update your tenant name and configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-name">Tenant Name</Label>
                <Input
                  id="tenant-name"
                  defaultValue={activeTenant.name}
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-domain">Custom Domain</Label>
                <Input
                  id="tenant-domain"
                  defaultValue={activeTenant.domain || ""}
                  placeholder="e.g. app.acme.com"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Public Access</Label>
                  <p className="text-[13px] text-muted-foreground">
                    Allow content to be viewed publicly without authentication.
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button>
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Manage your subscription and billing details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4 bg-muted/40 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Pro Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    $49/month. Next billing date: Oct 1, 2026.
                  </p>
                </div>
                <Button variant="outline">Manage Subscription</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between rounded-lg border border-destructive/20 p-4">
                <div className="space-y-0.5">
                  <h4 className="font-semibold text-sm">Delete Tenant</h4>
                  <p className="text-[13px] text-muted-foreground">
                    Permanently delete this tenant and all of its data.
                  </p>
                </div>
                <Button variant="destructive">Delete Tenant</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
