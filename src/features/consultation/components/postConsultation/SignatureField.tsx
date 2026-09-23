"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, PenLine, RotateCcw } from "lucide-react";
import type { SignaturePoint } from "../../lib/api/consultationDocuments";

export function SignaturePadDialog({
  onSave,
}: {
  onSave: (strokes: SignaturePoint[][]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<SignaturePoint[][]>([]);
  const activeStrokeRef = useRef<SignaturePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const committedPoints = strokesRef.current.reduce(
      (total, stroke) => total + stroke.length,
      0,
    );
    if (strokesRef.current.length >= 32 || committedPoints >= 2_048) {
      setError("Signature limit reached. Clear the signature to draw again.");
      return;
    }

    const point = pointFromEvent(event);
    const context = canvasRef.current?.getContext("2d");
    if (!point || !context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activeStrokeRef.current = [point];
    context.beginPath();
    context.moveTo(point.x * 500, point.y * 180);
    setError(null);
  };

  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokeRef.current;
    const point = pointFromEvent(event);
    const context = canvasRef.current?.getContext("2d");
    if (!stroke || !point || !context) return;

    const committedPoints = strokesRef.current.reduce(
      (total, committedStroke) => total + committedStroke.length,
      0,
    );
    if (stroke.length >= 256 || committedPoints + stroke.length >= 2_048) {
      setError("Signature is too detailed. Save it now or clear and redraw.");
      return;
    }

    stroke.push(point);
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.strokeStyle = "#074972"; // BayanHealth Navy
    context.lineTo(point.x * 500, point.y * 180);
    context.stroke();
  };

  const stopDrawing = () => {
    const stroke = activeStrokeRef.current;
    if (stroke && stroke.length >= 2 && strokesRef.current.length < 32) {
      strokesRef.current.push(stroke);
      setHasStrokes(true);
      // Auto-commit immediately so the parent is updated as soon as the doctor finishes drawing
      onSave(strokesRef.current.map((s) => s.map((point) => ({ ...point }))));
    }
    activeStrokeRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
    activeStrokeRef.current = null;
    setHasStrokes(false);
    onSave([]);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-(--text-heading)">
          Physician Signature
        </span>
        {hasStrokes ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-(--teal-800)">
            <Check className="size-3.5 text-(--status-available-fg)" />
            Signature captured
          </span>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-(--border-default) bg-white transition-colors focus-within:border-(--action-primary)">
        {/* Subtle signature guideline baseline */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-7 flex items-center gap-1.5 border-b border-dashed border-(--border-subtle)"
        >
          <span className="text-[10px] font-bold text-(--text-subtle)/60">✕</span>
        </div>

        {!hasStrokes ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 text-xs text-(--text-subtle)/70">
            <PenLine className="size-3.5" />
            <span>Draw signature with mouse, pen, or touch</span>
          </div>
        ) : null}

        <canvas
          ref={canvasRef}
          width={500}
          height={180}
          aria-label="Draw electronic signature"
          style={{ touchAction: "none" }}
          className="h-28 w-full cursor-crosshair sm:h-32"
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
        />
      </div>

      {error ? <p className="text-xs text-(--danger-fg)">{error}</p> : null}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-(--text-subtle)">
          {hasStrokes ? "Auto-saved as you draw" : "Draw above on the line"}
        </span>
        {hasStrokes ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearCanvas}
            className="h-7 rounded-full px-2.5 text-xs text-(--text-muted) hover:bg-(--danger-bg) hover:text-(--danger-fg)"
          >
            <RotateCcw className="mr-1 size-3" />
            Clear &amp; redraw
          </Button>
        ) : null}
      </div>
    </div>
  );
}
