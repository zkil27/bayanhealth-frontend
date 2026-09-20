"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import { useState, useCallback, useRef, useEffect } from "react";
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
  Search,
} from "lucide-react";
import {
  MedicalCodeSuggestionCommandList,
  type MedicalCodeSuggestionHandle,
} from "./MedicalCodeSuggestionCommandList";
import AppButton from "@/components/primitives/AppButton";
import { Separator } from "@/components/ui/separator";
import { Editor, Range } from "@tiptap/react";
import {
  MEDICAL_CODES,
  SUGGESTION_CODES,
} from "../../../doctor/lib/postConsultationDate";
import { SOAPTextEditorGeneralTypes } from "../../../doctor/types/soapTextEditor.types";
import { cn } from "@/lib/utils";

interface SOAPTextEditorProps {
  aiPregeneratedDoc?: SOAPTextEditorGeneralTypes["aiPregeneratedDoc"];
  value?: string;
  onChange?: (value: string) => void;
}

export function AssessmentTextEditor({
  aiPregeneratedDoc = "",
  value,
  onChange,
}: SOAPTextEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isUsingWand, setIsUsingWand] = useState(false);
  const [isUsingMic, setIsUsingMic] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const activeRangeRef = useRef<{ from: number; to: number } | null>(null);
  const listRef = useRef<MedicalCodeSuggestionHandle>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: {}, orderedList: {} }),
      Mention.configure({
        suggestion: {
          char: "/med",
          items: ({ query }: { query: string }) => {
            const filtered = MEDICAL_CODES.filter((c) =>
              c.toLowerCase().includes(query.toLowerCase()),
            ).slice(0, 8);
            setItems(filtered);
            return filtered;
          },
          render: () => ({
            onStart: (props: {
              editor: Editor;
              range: Range;
              command: (props: { id: string }) => void;
            }) => {
              activeRangeRef.current = props.range;
              setIsOpen(true);
            },
            onUpdate: (props: { editor: Editor; range: Range }) => {
              activeRangeRef.current = props.range;
            },
            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (listRef.current) {
                return listRef.current.forwardKeyDown(props.event);
              }
              return false;
            },
            onExit: () => {
              setIsOpen(false);
              activeRangeRef.current = null;
            },
          }),
        },
      }),
    ],
    editorProps: {
      handleKeyDown: (view, event) => {
        if (isLocked) return true;

        if (event.key === "Tab" && !isOpen) {
          event.preventDefault();

          view.dispatch(view.state.tr.insertText("    "));
          return true;
        }

        if (event.key === "Tab" && isOpen) {
          return false;
        }

        return false;
      },
    },
    immediatelyRender: false,
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

  const handleSelect = useCallback(
    (codeText: string) => {
      if (!editor || !activeRangeRef.current) return;

      const targetRange = activeRangeRef.current;

      editor
        .chain()
        .focus()
        .deleteRange(targetRange)
        .insertContent({
          type: "text",
          marks: [{ type: "bold" }],
          text: codeText,
        })
        .insertContent(" ")
        .unsetMark("bold")
        .run();

      setIsOpen(false);
    },
    [editor],
  );

  const handleOpenCodeSearch = useCallback(() => {
    if (!editor || isLocked) return;

    // Get current cursor position
    const { from } = editor.state.selection;

    // Set the range at cursor position
    activeRangeRef.current = { from, to: from };

    // Set initial items (show all codes when opened)
    setItems(MEDICAL_CODES.slice(0, 8));
    setIsOpen(true);
  }, [editor, isLocked]);

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
          <span className="font-semibold capitalize">assessment</span>
        </div>
        <div className="flex flex-wrap gap-1 p-2">
          <AppButton
            size="xs"
            variant="outline"
            onClick={handleOpenCodeSearch}
            className="border-gray-300 transition-all duration-200"
            title="Insert Medical Code"
            disabled={isLocked}
          >
            <Search className="h-4 w-4" />
            CPG
          </AppButton>
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

      {isOpen && (items.length > 0 || SUGGESTION_CODES.length > 0) && (
        <MedicalCodeSuggestionCommandList
          ref={listRef}
          items={items}
          suggestionCodes={SUGGESTION_CODES}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
