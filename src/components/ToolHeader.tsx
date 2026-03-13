import React, { ReactNode } from "react";
import { Info, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolHeaderProps {
    title: string;
    description: string;
    icon: ReactNode;
    info?: string;
    className?: string;
    iconBgClass?: string;
}

const ToolHeader = ({
    title,
    description,
    icon,
    info,
    className,
    iconBgClass,
}: ToolHeaderProps) => {
    return (
        <div className={cn("rounded-2xl border border-border p-6", className || "bg-secondary/30")}>
            <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm", iconBgClass)}>
                    {icon}
                </div>
                <div className="flex-1">
                    <h1 className="font-display text-xl font-bold text-foreground">{title}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    {info && (
                        <div className="mt-1.5 flex items-start gap-1">
                            <Info className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/70" />
                            <span className="text-xs text-muted-foreground/70">{info}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToolHeader;
