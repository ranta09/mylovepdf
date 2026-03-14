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

    // Flag to disable global drop/paste/double-click (e.g. after a file is uploaded)
    disableGlobalFeatures: boolean;
    setDisableGlobalFeatures: (disabled: boolean) => void;
}

const GlobalUploadContext = createContext<GlobalUploadContextType | undefined>(undefined);

export const GlobalUploadProvider = ({ children }: { children: ReactNode }) => {
    const [activeTool, setActiveTool] = useState<PdfTool | null>(null);
    const [globalFiles, setGlobalFiles] = useState<File[]>([]);
    const [acceptedTypes, setAcceptedTypes] = useState<string[]>([]);
    const [disableGlobalFeatures, setDisableGlobalFeatures] = useState<boolean>(false);

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
                disableGlobalFeatures,
                setDisableGlobalFeatures,
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
