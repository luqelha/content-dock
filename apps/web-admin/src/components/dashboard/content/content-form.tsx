"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createContent, updateContent } from "@/actions/contents";
import { WYSIWYGEditor } from "@/components/ui/wysiwyg-editor";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  FileText,
  Globe,
  Archive,
  Loader2,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  body: z.string().min(1, "Content body is required"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  categoryId: z.string().optional(),
});

export type ContentFormValues = z.infer<typeof contentSchema>;

export interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
}

export interface ContentInitialData {
  id?: string;
  title?: string;
  slug?: string;
  body?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryId?: string | null;
}

interface ContentFormProps {
  initialData?: ContentInitialData | null;
  categories: CategoryItem[];
  isEdit?: boolean;
}

const STATUS_DETAILS = {
  DRAFT: {
    label: "Draft",
    icon: FileText,
    variant: "secondary" as const,
    description: "Only visible to editors. Not accessible on public site.",
    buttonLabel: "Save Draft",
    ButtonIcon: Save,
  },
  PUBLISHED: {
    label: "Published",
    icon: Globe,
    variant: "default" as const,
    description: "Live immediately. Accessible by all visitors and APIs.",
    buttonLabel: "Publish Now",
    ButtonIcon: Send,
  },
  ARCHIVED: {
    label: "Archived",
    icon: Archive,
    variant: "outline" as const,
    description: "Hidden from public feeds. Preserved for your records.",
    buttonLabel: "Save & Archive",
    ButtonIcon: Archive,
  },
} as const;

type StatusKey = keyof typeof STATUS_DETAILS;

export function ContentForm({
  initialData,
  categories,
  isEdit,
}: ContentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      slug: initialData?.slug ?? "",
      body: initialData?.body ?? "",
      status: initialData?.status ?? "DRAFT",
      categoryId: initialData?.categoryId ?? undefined,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedStatus = form.watch("status");
  const currentStatus: StatusKey =
    watchedStatus && watchedStatus in STATUS_DETAILS
      ? (watchedStatus as StatusKey)
      : "DRAFT";
  const currentStatusInfo = STATUS_DETAILS[currentStatus];

  const getPrimaryButtonLabel = () => {
    if (
      isEdit &&
      initialData?.status === "PUBLISHED" &&
      currentStatus === "PUBLISHED"
    ) {
      return "Save & Update";
    }
    return currentStatusInfo.buttonLabel;
  };

  const PrimaryButtonIcon = currentStatusInfo.ButtonIcon;
  const CurrentBadgeIcon = currentStatusInfo.icon;

  const handleSave = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    const values = form.getValues();
    try {
      setLoading(true);
      setErrorMsg(null);

      const payload = { ...values };
      if (!payload.slug) {
        delete payload.slug;
      }

      let result;
      if (isEdit && initialData?.id) {
        result = await updateContent(initialData.id, payload);
      } else {
        result = await createContent(payload);
      }

      if (result.error) {
        setErrorMsg(result.error);
        return;
      }

      router.push("/dashboard/content");
      router.refresh();
    } catch (error) {
      console.error("Failed to save content", error);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSlug = () => {
    const title = form.getValues("title");
    if (title) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      form.setValue("slug", slug, { shouldValidate: true });
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/content"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEdit ? "Edit Content" : "Create Content"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                Current state:
              </span>
              <Badge
                variant={currentStatusInfo.variant}
                className="text-xs flex items-center gap-1"
              >
                <CurrentBadgeIcon className="h-3 w-3" />
                {currentStatusInfo.label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="min-w-35"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PrimaryButtonIcon className="mr-2 h-4 w-4" />
            )}
            {getPrimaryButtonLabel()}
          </Button>
        </div>
      </div>

      {/* Error message banner */}
      {errorMsg && (
        <Alert variant="destructive">
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Form {...form}>
        <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content column (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Title
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. 10 Best Practices for Cloud Architecture"
                        className="text-base py-5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Content Body
                    </FormLabel>
                    <FormControl>
                      <WYSIWYGEditor
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sidebar Publishing Card (1 col) */}
            <div className="space-y-8 lg:mt-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Publishing Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Status selection */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => {
                      const selectedKey: StatusKey =
                        field.value && field.value in STATUS_DETAILS
                          ? (field.value as StatusKey)
                          : "DRAFT";
                      const selectedInfo = STATUS_DETAILS[selectedKey];
                      const SelectedIcon = selectedInfo.icon;

                      return (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select status">
                                  <div className="flex items-center gap-2">
                                    <SelectedIcon className="h-4 w-4 text-muted-foreground" />
                                    <span>{selectedInfo.label}</span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="DRAFT">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span>Draft</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="PUBLISHED">
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-emerald-500" />
                                  <span>Published</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="ARCHIVED">
                                <div className="flex items-center gap-2">
                                  <Archive className="h-4 w-4 text-amber-500" />
                                  <span>Archived</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            {selectedInfo.description}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {/* Category selection */}
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a category">
                                {field.value
                                  ? categories.find((c) => c.id === field.value)
                                      ?.name
                                  : undefined}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.length === 0 ? (
                              <div className="p-2 text-xs text-muted-foreground text-center">
                                No categories created yet.
                              </div>
                            ) : (
                              categories.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
                                  {category.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Custom Slug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center">
                          <FormLabel>Slug (URL)</FormLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs text-primary hover:underline"
                            onClick={handleGenerateSlug}
                          >
                            Auto-generate
                          </Button>
                        </div>
                        <FormControl>
                          <Input
                            placeholder="my-awesome-post"
                            {...field}
                            onChange={(e) => {
                              const formatted = e.target.value
                                .toLowerCase()
                                .replace(/\s+/g, "-");
                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Custom URL identifier for this content.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
