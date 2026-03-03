"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";

interface ImageUploaderProps {
  onImageSelect: (base64: string, mimeType: "image/jpeg" | "image/png") => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

export function ImageUploader({ onImageSelect, disabled }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("JPEG または PNG 形式の画像をアップロードしてください");
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setError("画像サイズは10MB以下にしてください");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setPreview(dataUrl);
        // Extract base64 part (remove "data:image/...;base64,")
        const base64 = dataUrl.split(",")[1]!;
        onImageSelect(base64, file.type as "image/jpeg" | "image/png");
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleClear = useCallback(() => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="w-full space-y-4">
      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-all duration-200 ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-primary/40 hover:bg-muted"
          } ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <svg
            className="mb-4 h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-sm font-medium text-foreground">
            画像をドラッグ&ドロップ または クリックして選択
          </p>
          <p className="mt-1 text-xs text-muted-foreground">JPEG / PNG 形式、10MB以下</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border border-border bg-surface-raised">
            <Image src={preview} alt="プレビュー" width={400} height={320} className="mx-auto max-h-80 object-contain" unoptimized />
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={disabled}>
              画像を変更
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    </div>
  );
}
