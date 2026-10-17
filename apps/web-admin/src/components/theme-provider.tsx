"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { MotionConfig } from "framer-motion";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <MotionConfig reducedMotion="user">
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </MotionConfig>
  );
}
