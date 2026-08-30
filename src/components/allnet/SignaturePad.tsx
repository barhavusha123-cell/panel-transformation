import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * לוח חתימה — תומך בעכבר ובמגע (טלפונים/טאבלטים).
 * מחזיר תמונת PNG כ-dataURL בעת שמירה.
 */
export function SignaturePad({
  value,
  onSave,
  onClear,
}: {
  value?: string | undefined;
  onSave: (dataUrl: string) => void;
  onClear?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
    setDirty(true);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDirty(false);
    onClear?.();
  };

  if (value) {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-border bg-white p-2">
          <img src={value} alt="חתימת הלקוח" className="h-28 w-full object-contain" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          <Eraser className="size-4" />
          חתימה מחדש
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-32 w-full touch-none rounded-xl border border-dashed border-border bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="brand"
          size="sm"
          disabled={!dirty}
          onClick={() => {
            const url = canvasRef.current?.toDataURL("image/png");
            if (url) onSave(url);
          }}
        >
          <PenLine className="size-4" />
          שמור חתימה
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          <Eraser className="size-4" />
          נקה
        </Button>
      </div>
    </div>
  );
}
