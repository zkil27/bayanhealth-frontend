"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrushCleaning, Save } from "lucide-react";
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
    context.moveTo(point.x * 500, point.y * 200);
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
    context.lineWidth = 2;
    context.lineCap = "round";
    context.strokeStyle = "#111827";
    context.lineTo(point.x * 500, point.y * 200);
    context.stroke();
  };

  const stopDrawing = () => {
    const stroke = activeStrokeRef.current;
    if (stroke && stroke.length >= 2 && strokesRef.current.length < 32) {
      strokesRef.current.push(stroke);
    }
    activeStrokeRef.current = null;
  };

  const saveSignature = () => {
    if (strokesRef.current.length === 0) {
      setError("Draw your signature before saving it.");
      return;
    }
    onSave(strokesRef.current.map((stroke) => stroke.map((point) => ({ ...point }))));
    setError(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    strokesRef.current = [];
    activeStrokeRef.current = null;
    onSave([]);
    setError(null);
  };

  return (
    <div className="flex flex-col gap-y-1">
      <span className="text-sm font-semibold">Doctor&apos;s Signature</span>
      <canvas
        ref={canvasRef}
        width={500}
        height={200}
        aria-label="Draw electronic signature"
        style={{ backgroundColor: "#ffffff", touchAction: "none" }}
        className="h-full w-full rounded-md border border-secondary"
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={clearCanvas} aria-label="Clear signature">
          <BrushCleaning />
        </Button>
        <Button type="button" onClick={saveSignature} aria-label="Save signature">
          <Save />
        </Button>
      </div>
    </div>
  );
}
