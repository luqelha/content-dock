"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeClosed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PasswordInput({
  className,
  disabled,
  readOnly,
  visibilityLabel = "password",
  ...props
}: Omit<ComponentProps<"input">, "type"> & { visibilityLabel?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setVisible(false);
      }}
    >
      <Input
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        readOnly={readOnly}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        aria-label={`${visible ? "Hide" : "Show"} ${visibilityLabel}`}
        aria-controls={props.id}
        aria-pressed={visible}
        disabled={disabled || readOnly}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-zinc-500 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 dark:hover:text-white"
      >
        {visible ? (
          <Eye className="size-4" aria-hidden="true" />
        ) : (
          <EyeClosed className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
