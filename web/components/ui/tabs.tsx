"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tabsVariants = cva(
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-muted-foreground",
        secondary: "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-muted-foreground",
      },
      size: {
        default: "h-9",
        sm: "h-8 rounded-md px-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? "div" : "div";
    return (
      <Comp
        className={cn("inline-flex", className)}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Tabs.displayName = "Tabs";

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? "div" : "div";
    return (
      <Comp
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-lg bg-muted/50 p-1 text-muted-foreground",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
TabsList.displayName = "TabsList";

interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tabsVariants> {
  asChild?: boolean;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? "button" : "button";
    return (
      <Comp
        className={cn(
          tabsVariants({ variant, size, className }),
          "data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
          "data-[state=inactive]:hover:bg-muted/80 data-[state=inactive]:hover:text-muted-foreground"
        )}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? "div" : "div";
    return (
      <Comp
        className={cn("mt-2", className)}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
