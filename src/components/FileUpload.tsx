import { useCallback, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { openDropboxChooser, openGoogleDrivePicker, openOneDrivePicker } from "@/lib/cloudPickers";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onFilesChange: (files: File[]) => void;
  files: File[];
  label?: string;
}

/* ── Brand SVG logos ─────────────────────────────────────────────────────── */

const GoogleDriveLogo = () => (
  <svg viewBox="0 0 87.3 78" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H1.2c0 1.55.4 3.1 1.2 4.5l4.2 9.35z" fill="#0066DA"/>
    <path d="M43.65 25.15L29.9 1.35c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 00-1.2 4.5h27.5l16.15-28z" fill="#00AC47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.85L53.3 65.3l-9.65 11.5h29.9z" fill="#EA4335"/>
    <path d="M43.65 25.15L57.4 1.35C56.05.55 54.5 0 52.85 0H34.44c-1.65 0-3.2.55-4.55 1.35l13.76 23.8z" fill="#00832D"/>
    <path d="M59.85 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.55 1.2h36.7c1.65 0 3.2-.45 4.55-1.2L59.85 53z" fill="#2684FC"/>
    <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25.15 59.85 53h27.45c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00"/>
  </svg>
);

const DropboxLogo = () => (
  <svg viewBox="0 0 43 40" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.6 0L0 8.3l8.9 7.1 12.6-7.8L12.6 0zM0 22.5l12.6 8.3 8.9-7.6-12.6-7.8L0 22.5zm21.5.7l8.9 7.6 12.6-8.3-8.9-7.1-12.6 7.8zm21.5-14.9L30.4 0l-8.9 7.6 12.6 7.8 8.9-7.1zM12.7 32.4l8.8 7.6 8.9-7.6-8.9-7.5-8.8 7.5z" fill="#0061FF"/>
  </svg>
);

const OneDriveLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M10.5 18.5l-3-1.5-5.5 3c-.6.3-.4 1.2.3 1.2h12.4c.5 0 .8-.3 1-.7l1.3-3.5-6.5 1.5z" fill="#0364B8"/>
    <path d="M14.2 9.2c-.4-.1-.8-.2-1.2-.2-1.4 0-2.6.7-3.5 1.7L2 15l5.5 2 7-1.5 3.5-2.3c-.7-2.4-2.4-4.2-3.8-4.8z" fill="#0078D4"/>
    <path d="M7 7.5C7.6 7.2 8.3 7 9 7c1.8 0 3.4 1 4.2 2.5.4-.2.9-.3 1.3-.3.3 0 .5 0 .7.1C14.4 7.3 12 6 9.5 6c-2 0-3.8.8-5 2l5 7L7 7.5z" fill="#1490DF"/>
    <path d="M18 14.2l-3.8-5c-.3-.1-.5-.1-.8-.2-.4 0-.9.1-1.2.3l-2.7 5.7 5 2 5.2-1.2c-.3-.7-.9-1.3-1.7-1.6z" fill="#28A8EA"/>
  </svg>
);

/* ── Component ───────────────────────────────────────────────────────────── */

const FileUpload = ({ accept = ".pdf", multiple = false, maxSize = 100, onFilesChange, files, label = "Select files" }: FileUploadProps) => {
  const [dragging, setDragging] = useState(false);
  const [cloudLoading, setCloudLoading] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.size <= maxSize * 1024 * 1024);
    onFilesChange(multiple ? [...files, ...dropped] : dropped.slice(0, 1));
  }, [files, maxSize, multiple, onFilesChange]);

  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).filter(f => f.size <= maxSize * 1024 * 1024);
    onFilesChange(multiple ? [...files, ...selected] : selected.slice(0, 1));
    e.target.value = "";
  }, [files, maxSize, multiple, onFilesChange]);

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const addCloudFiles = (newFiles: File[]) => {
    const valid = newFiles.filter(f => f.size <= maxSize * 1024 * 1024);
    onFilesChange(multiple ? [...files, ...valid] : valid.slice(0, 1));
  };

  const handleCloudPick = async (service: "google" | "dropbox" | "onedrive") => {
    setCloudLoading(service);
    try {
      let picked: File[] = [];
      switch (service) {
        case "dropbox":
          picked = await openDropboxChooser(accept, multiple);
          break;
        case "google":
          picked = await openGoogleDrivePicker(accept, multiple);
          break;
        case "onedrive":
          picked = await openOneDrivePicker(accept, multiple);
          break;
      }
      if (picked.length > 0) {
        addCloudFiles(picked);
        toast.success(`Imported ${picked.length} file${picked.length > 1 ? "s" : ""} from ${service === "google" ? "Google Drive" : service === "dropbox" ? "Dropbox" : "OneDrive"}`);
      }
    } catch (err: any) {
      console.error(`${service} picker error:`, err);
      toast.error(err?.message || `Failed to import from ${service}`);
    } finally {
      setCloudLoading(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isImage = (file: File) => file.type.startsWith("image/");

  const cloudButtons = [
    { id: "google" as const, label: "Google Drive", Logo: GoogleDriveLogo },
    { id: "dropbox" as const, label: "Dropbox", Logo: DropboxLogo },
    { id: "onedrive" as const, label: "OneDrive", Logo: OneDriveLogo },
  ];

  return (
    <div className="w-full space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-200",
          dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/40 hover:bg-secondary/50"
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Upload className="h-7 w-7 text-primary" />
        </div>
        <p className="font-display text-lg font-semibold text-foreground mb-1">{label}</p>
        <p className="text-sm text-muted-foreground mb-4">or drag and drop files here</p>
        <label>
          <input type="file" accept={accept} multiple={multiple} onChange={handleSelect} className="hidden" />
          <Button asChild variant="default" size="lg" className="cursor-pointer rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <span>Browse files</span>
          </Button>
        </label>
        <p className="mt-3 text-xs text-muted-foreground">Max {maxSize}MB per file</p>

        {/* ── Cloud storage buttons ─────────────────────────────── */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Or import from</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {cloudButtons.map(({ id, label: btnLabel, Logo }) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                size="sm"
                disabled={cloudLoading !== null}
                onClick={() => handleCloudPick(id)}
                className="gap-2 rounded-lg border-border bg-card hover:bg-secondary/80 text-foreground text-xs font-medium px-3 py-2 h-auto"
              >
                {cloudLoading === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Logo />}
                {btnLabel}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                {isImage(file) ? <ImageIcon className="h-5 w-5 text-muted-foreground" /> : <FileText className="h-5 w-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeFile(i)} className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
