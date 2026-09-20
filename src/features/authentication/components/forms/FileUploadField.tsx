"use client";

import { useRef, useState } from "react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { FieldContent } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { XIcon, UploadIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadFieldProps {
  value?: File | FileList | null;
  onChange?: (value: File | FileList | null) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;

  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  previewUrl?: string | null;
  state?: "idle" | "uploading" | "processing" | "error" | "done";
  errorMessage?: string;
  description?: string;
}

export function FileUploadField({
  // RHF props
  value,
  onChange,
  onBlur,
  name,
  disabled = false,

  accept = "image/*",
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  previewUrl = null,
  state = "idle",
  errorMessage,

  description,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getFiles = (): File[] => {
    if (!value) return [];
    if (value instanceof File) return [value];
    if (value instanceof FileList) return Array.from(value);
    return [];
  };

  const files = getFiles();
  const hasFile = files.length > 0;
  const file = files[0] || null;

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const fileArray = Array.from(selectedFiles);
    const oversized = fileArray.some((f) => f.size > maxSize);
    if (oversized) return;

    if (multiple) {
      // ✅ Merge with existing files
      const existingFiles = getFiles();
      const allFiles = [...existingFiles, ...fileArray];

      // ✅ Create new FileList
      const dataTransfer = new DataTransfer();
      allFiles.forEach((file) => dataTransfer.items.add(file));
      onChange?.(dataTransfer.files);
    } else {
      onChange?.(selectedFiles[0]);
    }

    onBlur?.();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };
  const handleRemoveFile = (fileToRemove: File) => {
    if (!multiple) {
      handleRemove();
      return;
    }

    const currentFiles = getFiles();
    const updatedFiles = currentFiles.filter((f) => f !== fileToRemove);

    if (updatedFiles.length === 0) {
      onChange?.(null);
    } else {
      const dataTransfer = new DataTransfer();
      updatedFiles.forEach((file) => dataTransfer.items.add(file));
      onChange?.(dataTransfer.files);
    }
    onBlur?.();
  };
  const handleRemove = () => {
    onChange?.(null);
    onBlur?.();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const displayState = errorMessage ? "error" : state;

  return (
    <FieldContent
      className={cn(
        "relative rounded-lg border-2 border-dashed transition-all",
        hasFile && "border-primary",
        isDragging && "border-primary bg-primary/5",
        errorMessage && "border-destructive bg-destructive/10",
        disabled && "cursor-not-allowed opacity-50",
        !errorMessage &&
          !isDragging &&
          "border-border hover:border-primary/50",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {multiple ? (
        <>
          <div className="flex animate-in items-center justify-center gap-2 p-3 transition duration-300 slide-in-from-bottom-1">
            <UploadIcon className="size-5 text-muted-foreground" />
            <p className="text-sm text-secondary">
              {description || "Drag files or browse"}
            </p>
            <Input
              ref={inputRef}
              id={name}
              type="file"
              accept={accept}
              multiple={multiple}
              disabled={disabled}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => handleFileSelect(e.target.files)}
              onBlur={onBlur}
            />
          </div>

          {hasFile && (
            <div className="space-y-2 px-3 pb-3">
              {files.map((f) => (
                <Attachment
                  key={f.name + f.size + f.lastModified}
                  state={displayState}
                  className="w-full animate-in border transition duration-300 slide-in-from-top-1"
                >
                  <AttachmentContent>
                    <AttachmentTitle>{f.name}</AttachmentTitle>
                    <AttachmentDescription>
                      {`${(f.size / 1024).toFixed(0)} KB`}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Remove ${f.name}`}
                      onClick={() => handleRemoveFile(f)}
                      disabled={disabled}
                    >
                      <XIcon />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            </div>
          )}
        </>
      ) : !hasFile ? (
        <div className="flex items-center justify-center gap-2 p-3">
          <UploadIcon className="size-5 text-muted-foreground" />
          <p className="text-sm text-secondary">
            {description || "Drag file or browse"}
          </p>
          <Input
            ref={inputRef}
            id={name}
            type="file"
            accept={accept}
            multiple={false}
            disabled={disabled}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => handleFileSelect(e.target.files)}
            onBlur={onBlur}
          />
        </div>
      ) : (
        <Attachment
          state={displayState}
          className="w-full animate-in border-0 transition duration-500 slide-in-from-top-1"
        >
          {previewUrl && (
            <AttachmentMedia variant="image">
              <img src={previewUrl} alt={file.name} />
            </AttachmentMedia>
          )}
          <AttachmentContent>
            <AttachmentTitle>{file.name}</AttachmentTitle>
            <AttachmentDescription>
              {displayState === "error"
                ? errorMessage || "Upload failed. Try again."
                : displayState === "uploading"
                  ? "Uploading…"
                  : displayState === "processing"
                    ? "Processing…"
                    : `${(file.size / 1024).toFixed(0)} KB`}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            {displayState === "uploading" || displayState === "processing" ? (
              <div className="flex items-center justify-center px-2">
                <Loader2Icon className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <AttachmentAction
                aria-label={`Remove ${file.name}`}
                onClick={handleRemove}
                disabled={disabled}
              >
                <XIcon />
              </AttachmentAction>
            )}
          </AttachmentActions>
        </Attachment>
      )}
    </FieldContent>
  );
}
