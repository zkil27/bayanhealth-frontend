"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState, useEffect } from "react";
import {
  Bold,
  Italic,
  Undo,
  Redo,
  List,
  ListOrdered,
  Mic,
  Unlock,
  Wand,
  Lock,
} from "lucide-react";
import AppButton from "@/components/primitives/AppButton";
import { Separator } from "@/components/ui/separator";
import { SOAPTextEditorGeneralTypes } from "../../../doctor/types/soapTextEditor.types";
import { cn } from "@/lib/utils";


interface SOAPTextEditorProps {
  title: SOAPTextEditorGeneralTypes["soapTitle"];
  aiPregeneratedDoc?: SOAPTextEditorGeneralTypes["aiPregeneratedDoc"];
  value?: string;
  onChange?: (value: string) => void;
}

export function SOAPTextEditor({
  title,
  aiPregeneratedDoc = "",
  value,
  onChange,
}: SOAPTextEditorProps) {
  const [isUsingWand, setIsUsingWand] = useState(false);
  const [isUsingMic, setIsUsingMic] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const [forceUpdate, setForceUpdate] = useState(0);

  const editor = useEditor({
    extensions: [StarterKit.configure({ bulletList: {}, orderedList: {} })],
    editorProps: {
      handleKeyDown: (view, event) => {
        if (isLocked) return true;

        if (event.key === "Tab") {
          event.preventDefault();

          view.dispatch(view.state.tr.insertText("    "));
          return true;
        }

        return false;
      },
    },
    content: value ?? aiPregeneratedDoc,
    editable: !isLocked,
    onUpdate: ({ editor: updatedEditor }) => {
      setForceUpdate((prev) => prev + 1);
      onChange?.(updatedEditor.getHTML());
    },
    onSelectionUpdate: () => {
      setForceUpdate((prev) => prev + 1);
    },
  });

  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands?.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "i")) {
        setTimeout(() => {
          setForceUpdate((prev) => prev + 1);
        }, 10);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleWand() {
    setIsUsingWand(!isUsingWand);
  }
  function handleMic() {
    setIsUsingMic(!isUsingMic);
  }
  function handleLock() {
    setIsLocked(!isLocked);
  }

  if (!editor) return null;
  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");
  const isBulletList = editor.isActive("bulletList");
  const isOrderedList = editor.isActive("orderedList");

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex justify-between border-b">
        <div className="flex items-center gap-2 p-2 text-xs">
          <span className="font-semibold capitalize">{title}</span>
        </div>
        <div className="flex flex-wrap gap-1 p-2">
          <AppButton
            key={`bold-${forceUpdate}-${isBold}`}
            size="xs"
            variant={isBold ? "business" : "ghost"}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className="transition-all duration-200"
            title="Bold (Ctrl+B)"
            disabled={isLocked}
          >
            <Bold className="h-4 w-4" />
          </AppButton>
          <AppButton
            key={`italic-${forceUpdate}-${isItalic}`}
            size="xs"
            variant={isItalic ? "business" : "ghost"}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className="transition-all duration-200"
            title="Italic (Ctrl+I)"
            disabled={isLocked}
          >
            <Italic className="h-4 w-4" />
          </AppButton>
          <AppButton
            key={`bullet-${forceUpdate}-${isBulletList}`}
            size="xs"
            variant={isBulletList ? "business" : "ghost"}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="transition-all duration-200"
            title="Bullet List (- Space)"
            disabled={isLocked}
          >
            <List className="h-4 w-4" />
          </AppButton>
          <AppButton
            key={`ordered-${forceUpdate}-${isOrderedList}`}
            size="xs"
            variant={isOrderedList ? "business" : "ghost"}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className="transition-all duration-200"
            title="Numbered List (1. Space)"
            disabled={isLocked}
          >
            <ListOrdered className="h-4 w-4" />
          </AppButton>
          <div className="mx-1 h-6 w-px bg-border" />
          <AppButton
            size="xs"
            variant="ghost"
            onClick={() => editor.chain().focus().undo().run()}
            className="transition-all duration-200"
            title="Undo (Ctrl+Z)"
            disabled={isLocked}
          >
            <Undo className="h-4 w-4" />
          </AppButton>
          <AppButton
            size="xs"
            variant="ghost"
            onClick={() => editor.chain().focus().redo().run()}
            className="transition-all duration-200"
            title="Redo (Ctrl+Shift+Z)"
            disabled={isLocked}
          >
            <Redo className="h-4 w-4" />
          </AppButton>
          <Separator orientation="vertical" />
          <div className="ml-auto flex gap-1">
            <AppButton
              variant={isUsingWand ? "business" : "ghost"}
              size="icon-xs"
              onClick={handleWand}
              className="transition-all duration-200"
              title="AI Generate"
              disabled={isLocked}
            >
              <Wand className="size-3" />
            </AppButton>
            <AppButton
              variant={isUsingMic ? "business" : "ghost"}
              size="icon-xs"
              onClick={handleMic}
              className="transition-all duration-200"
              title="Voice Input"
              disabled={isLocked}
            >
              <Mic className="size-3" />
            </AppButton>
            <AppButton
              variant={isLocked ? "business" : "ghost"}
              size="icon-xs"
              onClick={handleLock}
              className="transition-all duration-200"
              title={isLocked ? "Unlock Editor" : "Lock Editor"}
            >
              {isLocked ? (
                <Lock className="size-3" />
              ) : (
                <Unlock className="size-3" />
              )}
            </AppButton>
          </div>
        </div>
      </div>

      <div className="relative max-h-72 scroll-fade-y scroll-fade-b overflow-y-auto">
        <EditorContent
          editor={editor}
          className={cn(
            "prose prose-sm max-w-none text-xs [&_.ProseMirror]:p-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6",
            isLocked && "pointer-events-none cursor-default",
          )}
        />
      </div>
    </div>
  );
}
