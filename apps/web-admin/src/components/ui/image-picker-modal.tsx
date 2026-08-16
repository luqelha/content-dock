"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadMedia, getMediaList, MediaItem } from "@/actions/media";
import {
  Upload,
  Link as LinkIcon,
  FolderOpen,
  X,
  Loader2,
  ImageIcon,
  Check,
  FileImage,
} from "lucide-react";

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string, alt?: string) => void;
}

type TabType = "upload" | "library" | "url";

export function ImagePickerModal({
  isOpen,
  onClose,
  onSelectImage,
}: ImagePickerModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("upload");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Upload Tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL Tab state
  const [directUrl, setDirectUrl] = useState("");
  const [altText, setAltText] = useState("");

  // Library Tab state
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedLibraryUrl, setSelectedLibraryUrl] = useState<string | null>(null);

  const loadMediaLibrary = useCallback(async () => {
    try {
      setLoadingMedia(true);
      setErrorMsg(null);
      const res = await getMediaList();
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.data) {
        setMediaList(res.data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load media library.");
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setErrorMsg(null);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setDirectUrl("");
    setAltText("");
    setSelectedLibraryUrl(null);
    setActiveTab("upload");
    onClose();
  }, [previewUrl, onClose]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setErrorMsg(null);
    if (tab === "library") {
      loadMediaLibrary();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please select a valid image file (PNG, JPG, WebP, GIF, SVG).");
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setErrorMsg("Please choose an image file to upload.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await uploadMedia(formData);

      if (res.error || !res.url) {
        setErrorMsg(res.error || "Failed to upload image.");
        return;
      }

      onSelectImage(res.url, altText || selectedFile.name);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg("An unexpected error occurred during upload.");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!directUrl.trim()) {
      setErrorMsg("Please enter a valid image URL.");
      return;
    }
    onSelectImage(directUrl.trim(), altText.trim());
    onClose();
  };

  const handleLibrarySubmit = () => {
    if (!selectedLibraryUrl) {
      setErrorMsg("Please select an image from the library.");
      return;
    }
    onSelectImage(selectedLibraryUrl, altText.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
          className="w-full max-w-xl rounded-2xl border border-border/80 dark:border-neutral-700/80 bg-card dark:bg-neutral-900 text-card-foreground shadow-2xl z-10 overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b p-5 bg-muted/30 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg leading-none">Insert Image</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload from local files, choose from library, or paste a link
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b px-5 bg-muted/10">
            <button
              type="button"
              onClick={() => handleTabChange("upload")}
              className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "upload"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Upload className="h-4 w-4" />
              Upload Local
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("library")}
              className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "library"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              Media Library
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("url")}
              className={`flex items-center gap-2 py-3 px-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "url"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <LinkIcon className="h-4 w-4" />
              Web URL
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-4">
            {errorMsg && (
              <Alert variant="destructive">
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {/* TAB 1: LOCAL UPLOAD */}
            {activeTab === "upload" && (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {!previewUrl ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/80 dark:border-neutral-700 hover:border-primary/60 dark:hover:border-primary/60 rounded-xl p-8 text-center cursor-pointer transition-all bg-muted/20 hover:bg-muted/40 group"
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Click to browse or drag & drop</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, WebP, GIF, SVG (Up to 10MB)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative rounded-xl border border-border/80 dark:border-neutral-700/80 overflow-hidden bg-black/5 dark:bg-neutral-950 flex items-center justify-center h-48">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                        className="absolute top-2 right-2 h-7 px-2 text-xs bg-background/80 backdrop-blur-sm"
                      >
                        Change Image
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileImage className="h-4 w-4" />
                      <span>{selectedFile?.name}</span>
                      <span>•</span>
                      <span>{selectedFile ? (selectedFile.size / 1024).toFixed(1) + " KB" : ""}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="upload-alt" className="text-xs">
                    Alt Text (Description for accessibility & SEO)
                  </Label>
                  <Input
                    id="upload-alt"
                    placeholder="e.g. Dashboard analytics preview screenshot"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: MEDIA LIBRARY */}
            {activeTab === "library" && (
              <div className="space-y-4">
                {loadingMedia ? (
                  <div className="flex flex-col items-center justify-center h-52 text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm">Loading media library...</span>
                  </div>
                ) : mediaList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 border border-dashed rounded-xl text-center p-6 text-muted-foreground gap-2">
                    <FolderOpen className="h-8 w-8 stroke-1" />
                    <p className="text-sm">No uploaded media found for this tenant.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("upload")}
                    >
                      Upload your first image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                      {mediaList.map((item) => {
                        const isSelected = selectedLibraryUrl === item.url;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedLibraryUrl(item.url)}
                            className={`group relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all bg-black/5 dark:bg-neutral-950 ${
                              isSelected
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-border/60 hover:border-primary/50"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.url}
                              alt="Media item"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/25 flex items-center justify-center">
                                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                                  <Check className="h-3.5 w-3.5" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="library-alt" className="text-xs">
                        Alt Text (Optional)
                      </Label>
                      <Input
                        id="library-alt"
                        placeholder="Image description"
                        value={altText}
                        onChange={(e) => setAltText(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: WEB URL */}
            {activeTab === "url" && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="direct-url">Image URL</Label>
                  <Input
                    id="direct-url"
                    placeholder="https://example.com/image.jpg"
                    value={directUrl}
                    onChange={(e) => setDirectUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="url-alt" className="text-xs">
                    Alt Text (Optional)
                  </Label>
                  <Input
                    id="url-alt"
                    placeholder="Image description"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                  />
                </div>

                {directUrl && (
                  <div className="rounded-xl border p-2 bg-muted/20 flex items-center justify-center h-32 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={directUrl}
                      alt="URL preview"
                      className="max-h-full max-w-full object-contain"
                      onError={() => setErrorMsg("Could not load preview. Please verify URL.")}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t p-4 bg-muted/20 dark:bg-neutral-900/50">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>

            {activeTab === "upload" && (
              <Button
                type="button"
                onClick={handleUploadSubmit}
                disabled={loading || !selectedFile}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Uploading..." : "Upload & Insert"}
              </Button>
            )}

            {activeTab === "library" && (
              <Button
                type="button"
                onClick={handleLibrarySubmit}
                disabled={!selectedLibraryUrl || loadingMedia}
              >
                Insert Selected
              </Button>
            )}

            {activeTab === "url" && (
              <Button
                type="button"
                onClick={handleUrlSubmit}
                disabled={!directUrl.trim()}
              >
                Insert Image
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
