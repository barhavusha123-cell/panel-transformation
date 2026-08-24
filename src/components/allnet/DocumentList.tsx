import { useState } from "react";
import { Download, Eye, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAllNet } from "@/lib/allnet/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FileRecord } from "@/lib/allnet/types";

export function DocumentList({
  projectFilter,
  isAdmin = false,
}: {
  projectFilter?: string | null;
  isAdmin?: boolean;
}) {
  const { state, setState } = useAllNet();
  const [preview, setPreview] = useState<FileRecord | null>(null);

  const files = state.files.filter((f) =>
    projectFilter ? f.project === projectFilter || f.project === "כללי" : true,
  );

  if (!state.files.length)
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
        לא הועלו קבצים למערכת עדיין.
      </p>
    );

  if (!files.length)
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
        אין קבצים זמינים עבור מסנן פרויקט זה.
      </p>
    );

  const remove = (id: string, name: string) => {
    setState((prev) => ({ ...prev, files: prev.files.filter((f) => f.id !== id) }));
    toast.success(`הקובץ '${name}' הוסר בהצלחה.`);
  };

  return (
    <div className="space-y-2">
      {files.map((file, i) => (
        <div
          key={file.id}
          style={{ animationDelay: `${i * 40}ms` }}
          className="animate-rise hover-lift flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/70 p-3"
        >
          <span className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-lg text-primary-foreground">
            <FileText className="size-5" />
          </span>
          <div className="min-w-40 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{file.name}</span>
              <Badge variant="outline" className="text-xs">
                {file.project}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {file.size} · הועלה ע״י {file.uploadedBy} · {file.uploadedAt}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPreview(file)}>
              <Eye className="size-4" />
              צפייה
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a href={file.dataUrl} download={file.name}>
                <Download className="size-4" />
                הורד
              </a>
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => remove(file.id, file.name)}
              >
                <Trash2 className="size-4" />
                הסר
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
