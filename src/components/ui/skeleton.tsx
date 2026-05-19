import { cn } from "@/lib/utils"

function Skeleton({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-50", className)}
      style={style}
      {...props}
    />
  )
}

export { Skeleton }
