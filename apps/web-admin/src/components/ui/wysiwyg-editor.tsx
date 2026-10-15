"use client";

import { useEffect, useState } from "react";
import { privateContentImages } from "@/lib/files";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Button } from "@/components/ui/button";
import { ImagePickerModal } from "@/components/ui/image-picker-modal";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  ImageIcon,
  Code,
  Quote,
  Undo,
  Redo,
} from "lucide-react";

interface WYSIWYGEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-labelledby"?: string;
}

interface MenuBarProps {
  editor: Editor | null;
  onOpenImageModal: () => void;
}

const MenuBar = ({ editor, onOpenImageModal }: MenuBarProps) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-muted/40 dark:bg-neutral-900/50 rounded-t-xl">
      {/* Undo / Redo */}
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Undo"
      >
        <Undo className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Redo"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border/80 dark:bg-neutral-700 mx-1 self-center" />

      {/* Headings */}
      <Button
        type="button"
        size="icon-xs"
        variant={
          editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"
        }
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-label="Heading 2"
        aria-pressed={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        variant={
          editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"
        }
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        aria-label="Heading 3"
        aria-pressed={editor.isActive("heading", { level: 3 })}
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border/80 dark:bg-neutral-700 mx-1 self-center" />

      {/* Text Formatting */}
      <Button
        type="button"
        size="icon-xs"
        aria-pressed={editor.isActive("bold")}
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleBold().run()}
        aria-label="Toggle bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        aria-pressed={editor.isActive("italic")}
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Toggle italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        aria-pressed={editor.isActive("strike")}
        variant={editor.isActive("strike") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Toggle strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        aria-pressed={editor.isActive("code")}
        variant={editor.isActive("code") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleCode().run()}
        aria-label="Toggle code"
      >
        <Code className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border/80 dark:bg-neutral-700 mx-1 self-center" />

      {/* Lists & Blockquote */}
      <Button
        type="button"
        size="icon-xs"
        aria-pressed={editor.isActive("bulletList")}
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Toggle bullet list"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        aria-pressed={editor.isActive("orderedList")}
        variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Toggle ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="icon-xs"
        aria-pressed={editor.isActive("blockquote")}
        variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        aria-label="Toggle blockquote"
      >
        <Quote className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border/80 dark:bg-neutral-700 mx-1 self-center" />

      {/* Image Picker */}
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        onClick={onOpenImageModal}
        aria-label="Add image"
        className="text-primary hover:text-primary hover:bg-primary/10"
      >
        <ImageIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

export function WYSIWYGEditor({
  value,
  onChange,
  readOnly = false,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  "aria-labelledby": labelledBy,
}: WYSIWYGEditorProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: privateContentImages(value),
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Content body",
        class:
          "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none min-h-[260px] max-w-none p-4",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: {
          ...(editor.options.editorProps.attributes as Record<string, string>),
          id: id || "",
          "aria-describedby": describedBy || "",
          "aria-invalid": String(Boolean(invalid)),
          ...(labelledBy ? { "aria-labelledby": labelledBy } : {}),
        },
      },
    });
  }, [editor, id, describedBy, invalid, labelledBy]);

  const handleSelectImage = (url: string, alt?: string) => {
    if (editor && url) {
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt: alt || "" })
        .run();
    }
  };

  return (
    <>
      <div className="border border-border/80 dark:border-neutral-700/80 rounded-xl overflow-hidden flex flex-col bg-card dark:bg-neutral-900 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
        {!readOnly && (
          <MenuBar
            editor={editor}
            onOpenImageModal={() => setIsImageModalOpen(true)}
          />
        )}
        <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
      </div>

      <ImagePickerModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelectImage={handleSelectImage}
      />
    </>
  );
}
