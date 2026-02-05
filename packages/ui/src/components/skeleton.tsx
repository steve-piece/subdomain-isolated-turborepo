import { cn } from "@workspace/ui/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden bg-accent/50 rounded-md",
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-linear-to-r",
        "before:from-transparent before:via-white/10 before:to-transparent",
        "isolate",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
