import React, { createContext, useContext, useState, ReactNode } from "react";
import { PdfTool } from "@/lib/tools";

interface GlobalUploadContextType {
    // Information about the tool context
    activeTool: PdfTool | null;
    setActiveTool: (tool: PdfTool | null) => void;

    // Persisted files uploaded on standard non-tool pages
    globalFiles: File[];
    setGlobalFiles: React.Dispatch<React.SetStateAction<File[]>>;
    clearGlobalFiles: () => void;

    // What files the current tool accepts
    acceptedTypes: string[];
    setAcceptedTypes: (types: string[]) => void;
}

const GlobalUploadContext = createContext<GlobalUploadContextType | undefined>(undefined);

export const GlobalUploadProvider = ({ children }: { children: ReactNode }) => {
    const [activeTool, setActiveTool] = useState<PdfTool | null>(null);
    const [globalFiles, setGlobalFiles] = useState<File[]>([]);
    const [acceptedTypes, setAcceptedTypes] = useState<string[]>([".pdf"]);

    const clearGlobalFiles = () => setGlobalFiles([]);

    return (
        <GlobalUploadContext.Provider
            value={{
                activeTool,
                setActiveTool,
                globalFiles,
                setGlobalFiles,
                clearGlobalFiles,
                acceptedTypes,
                setAcceptedTypes,
            }}
        >
            {children}
        </GlobalUploadContext.Provider>
    );
};

export const useGlobalUpload = () => {
    const context = useContext(GlobalUploadContext);
    if (context === undefined) {
        throw new Error("useGlobalUpload must be used within a GlobalUploadProvider");
    }
    return context;
};
