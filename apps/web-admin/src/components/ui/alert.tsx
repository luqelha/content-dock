import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
} from "lucide-react";

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 text-sm transition-colors [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default:
          "bg-card text-card-foreground border-border/80 shadow-sm dark:bg-neutral-900/90 dark:border-neutral-700/80",
        destructive:
          "border-destructive/40 text-destructive bg-destructive/10 dark:bg-destructive/15 dark:border-destructive/50 dark:text-red-400 [&>svg]:text-destructive dark:[&>svg]:text-red-400",
        success:
          "border-emerald-500/30 text-emerald-700 bg-emerald-500/10 dark:bg-emerald-950/30 dark:border-emerald-500/40 dark:text-emerald-400 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400",
        warning:
          "border-amber-500/30 text-amber-800 bg-amber-500/10 dark:bg-amber-950/30 dark:border-amber-500/40 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        info:
          "border-blue-500/30 text-blue-800 bg-blue-500/10 dark:bg-blue-950/30 dark:border-blue-500/40 dark:text-blue-400 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconMap = {
  default: Info,
  destructive: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  showIcon?: boolean;
}

function Alert({
  className,
  variant = "default",
  showIcon = true,
  children,
  ...props
}: AlertProps) {
  const IconComponent = iconMap[variant || "default"];

  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {showIcon && <IconComponent className="h-4 w-4" />}
      {children}
    </div>
  );
}

function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn("text-sm opacity-90 leading-relaxed [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
