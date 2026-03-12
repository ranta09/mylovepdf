import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Image as ImageIcon, GripVertical, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

export interface FilePreviewListProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    onRemove: (index: number) => void;
    reorderable?: boolean;
}

const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// --- Preview Component for a Single File ---
const ThumbnailPreview = ({ file }: { file: File }) => {
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isWord = file.name.endsWith('.docx') || file.name.endsWith('.doc');
    const isPpt = file.name.endsWith('.pptx') || file.name.endsWith('.ppt');

    // Internal state for Object URLs to prevent memory leaks
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isImage || isPdf) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file, isImage, isPdf]);

    if (isImage && previewUrl) {
        return (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/50 border border-border/50">
                <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
            </div>
        );
    }

    if (isPdf && previewUrl) {
        return (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/50 border border-border/50">
                <div className="w-full flex justify-center transform scale-[0.35] origin-center -translate-y-2">
                    <Document file={previewUrl} loading={<FileText className="h-6 w-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[2.8]" />}>
                        <Page pageNumber={1} width={120} renderTextLayer={false} renderAnnotationLayer={false} />
                    </Document>
                </div>
            </div>
        );
    }

    // Fallbacks for other file types
    return (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary/80 border border-border">
            {isExcel && <div className="text-green-600 font-bold text-xs uppercase bg-green-100 rounded px-1">XLS</div>}
            {isWord && <div className="text-blue-600 font-bold text-xs uppercase bg-blue-100 rounded px-1">DOC</div>}
            {isPpt && <div className="text-orange-600 font-bold text-xs uppercase bg-orange-100 rounded px-1">PPT</div>}
            {(!isExcel && !isWord && !isPpt) && <FileIcon className="h-5 w-5 text-muted-foreground" />}
        </div>
    );
};

export const FilePreviewList: React.FC<FilePreviewListProps> = ({
    files,
    onFilesChange,
    onRemove,
    reorderable = true
}) => {

    const handleDragEnd = useCallback((result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(files);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        onFilesChange(items);
    }, [files, onFilesChange]);

    if (files.length === 0) return null;

    if (!reorderable || files.length === 1) {
        // Simple non-draggable list
        return (
            <div className="space-y-3 w-full">
                <AnimatePresence>
                    {files.map((file, index) => (
                        <motion.div
                            key={`${file.name}-${file.lastModified}-${index}`}
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <ThumbnailPreview file={file} />

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <p className="truncate text-sm font-semibold text-foreground leading-tight">{file.name}</p>
                                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{formatSize(file.size)}</p>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onRemove(index)}
                                className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        );
    }

    // Draggable list using @hello-pangea/dnd
    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="file-preview-list">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3 w-full"
                    >
                        {files.map((file, index) => (
                            <Draggable key={`${file.name}-${file.lastModified}-${index}`} draggableId={`${file.name}-${index}`} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={cn(
                                            "group flex items-center gap-4 rounded-xl border p-3 transition-colors duration-200",
                                            snapshot.isDragging
                                                ? "bg-secondary/50 border-primary shadow-lg z-50 rotate-[1deg] scale-[1.02]"
                                                : "bg-card border-border shadow-sm hover:border-primary/30"
                                        )}
                                        style={provided.draggableProps.style}
                                    >
                                        <div
                                            {...provided.dragHandleProps}
                                            className="flex h-full items-center justify-center px-1 text-muted-foreground/40 hover:text-foreground cursor-grab active:cursor-grabbing"
                                        >
                                            <GripVertical className="h-5 w-5" />
                                        </div>

                                        <ThumbnailPreview file={file} />

                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <p className="truncate text-sm font-semibold text-foreground leading-tight">{file.name}</p>
                                            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{formatSize(file.size)}</p>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onRemove(index)}
                                            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};

export default FilePreviewList;
