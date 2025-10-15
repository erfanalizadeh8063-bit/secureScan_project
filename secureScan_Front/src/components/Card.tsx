import React from "react";

// Avoid conflict: remove 'title' from div attributes
type DivAttrs = Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "children">;

type CardProps = {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  onClick?: () => void;
} & DivAttrs;

export default function Card({
  children,
  title,
  subtitle,
  className = "",
  onClick,
  ...rest
}: CardProps) {
  const clickable = typeof onClick === "function";

  return (
    <div
      {...rest}
      onClick={onClick}
      className={[
        // subtle surface color + blur effect
        "rounded-2xl border border-neutral-800 bg-surface-1/70 backdrop-blur-safe",
        "shadow-soft transition-colors",
        clickable ? "cursor-pointer hover:bg-surface-2/70" : "",
        className,
      ].join(" ")}
      role={clickable ? "button" : rest.role}
      tabIndex={clickable ? 0 : (rest.tabIndex as number | undefined)}
    >
      {(title || subtitle) && (
        <div className="p-4 border-b border-neutral-800">
          {title && (
            <div className="text-neutral-100 font-medium tracking-tight">
              {title}
            </div>
          )}
          {subtitle && (
            <div className="text-sm text-neutral-500 mt-0.5">{subtitle}</div>
          )}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
