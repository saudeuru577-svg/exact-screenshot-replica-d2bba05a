import { useEffect, useImperativeHandle, useRef, forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export type SignaturePadHandle = {
  isEmpty: () => boolean;
  toBlob: () => Promise<Blob | null>;
  clear: () => void;
};

export const SignaturePad = forwardRef<SignaturePadHandle | null, { label: string }>(
  function SignaturePad({ label }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const empty = useRef(true);
    const [, setTick] = useState(0);

    useEffect(() => {
      const canvas = canvasRef.current!;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#0f172a";
    }, []);

    const pos = (e: PointerEvent | React.PointerEvent) => {
      const r = canvasRef.current!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const start = (e: React.PointerEvent) => {
      drawing.current = true;
      const ctx = canvasRef.current!.getContext("2d")!;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
      (e.target as Element).setPointerCapture(e.pointerId);
    };
    const move = (e: React.PointerEvent) => {
      if (!drawing.current) return;
      const ctx = canvasRef.current!.getContext("2d")!;
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      empty.current = false;
    };
    const end = () => {
      drawing.current = false;
      setTick((t) => t + 1);
    };

    const clear = () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      empty.current = true;
      setTick((t) => t + 1);
    };

    useImperativeHandle(ref, () => ({
      isEmpty: () => empty.current,
      clear,
      toBlob: () =>
        new Promise((resolve) => canvasRef.current!.toBlob((b) => resolve(b), "image/png")),
    }));

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <Button type="button" size="sm" variant="ghost" onClick={clear}>
            <Eraser className="size-4" /> Limpar
          </Button>
        </div>
        <canvas
          ref={canvasRef}
          className="w-full h-40 border rounded-md bg-background touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
    );
  },
);
