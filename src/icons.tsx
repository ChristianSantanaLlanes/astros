import type { Priority, Status } from "./types";

type IconProps = { size?: number; className?: string };

const iconStyle = { display: "block", flexShrink: 0, overflow: "visible" } as const;

export function StatusIcon({
  status,
  size = 14,
  outline = false,
}: {
  status: Status;
  size?: number;
  outline?: boolean;
}) {
  const s = size;
  if (status === "backlog") {
    return (
      <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
        <circle
          cx="7"
          cy="7"
          r="6"
          stroke="#62666d"
          strokeWidth="1.5"
          strokeDasharray="1.4 1.74"
          strokeDashoffset="0.65"
        />
      </svg>
    );
  }
  if (status === "todo") {
    return (
      <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
        <circle cx="7" cy="7" r="6" stroke="#c9ced6" strokeWidth="1.5" />
      </svg>
    );
  }
  if (status === "in_progress") {
    return (
      <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
        <circle cx="7" cy="7" r="6" stroke="#f2c94c" strokeWidth="1.5" />
        <path d="M7 7V1A6 6 0 0 1 13 7Z" fill="#f2c94c" />
      </svg>
    );
  }
  if (status === "done") {
    if (outline) {
      return (
        <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
          <circle cx="7" cy="7" r="6" stroke="#5e6ad2" strokeWidth="1.5" />
          <path
            fill="none"
            stroke="#5e6ad2"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.2 7.1 6.15 9.05 9.8 5.1"
          />
        </svg>
      );
    }
    return (
      <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
        <circle cx="7" cy="7" r="7" fill="#5e6ad2" />
        <path
          fill="#fff"
          d="M10.95 4.25a.75.75 0 0 1 0 1.06L6.62 9.64a.75.75 0 0 1-1.06 0L3.05 7.13a.75.75 0 1 1 1.06-1.06l2 2 3.78-3.78a.75.75 0 0 1 1.06 0Z"
        />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
      <circle cx="7" cy="7" r="6" stroke="#62666d" strokeWidth="1.5" />
      <path d="M5 5l4 4M9 5l-4 4" stroke="#62666d" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PriorityIcon({ priority, size = 14 }: { priority: Priority; size?: number }) {
  const s = size;
  if (priority === 0) {
    return (
      <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
        <rect x="1.2" y="6.25" width="2.6" height="1.5" rx="0.5" fill="#3e4146" />
        <rect x="5.7" y="6.25" width="2.6" height="1.5" rx="0.5" fill="#3e4146" />
        <rect x="10.2" y="6.25" width="2.6" height="1.5" rx="0.5" fill="#3e4146" />
      </svg>
    );
  }
  if (priority === 1) {
    return (
      <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
        <path
          d="M7 1.55 13.2 12.7H.8L7 1.55Z"
          fill="#eb5757"
          stroke="#eb5757"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  const on = "#8a8f98";
  const off = "#2e3238";
  const lit = priority === 4 ? 1 : priority === 3 ? 2 : 3;
  const heights = [4.5, 7.5, 10.5];
  return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
      {heights.map((h, i) => (
        <rect
          key={h}
          x={2.5 + i * 3.2}
          y={12.2 - h}
          width="2"
          height={h}
          rx="0.5"
          fill={i < lit ? on : off}
        />
      ))}
    </svg>
  );
}

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5 13.5 13.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function InboxIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M2.5 9.2 4.2 3.8A1.2 1.2 0 0 1 5.35 3h5.3c.5 0 .95.3 1.14.76L13.5 9.2v2.3c0 .66-.54 1.2-1.2 1.2H3.7c-.66 0-1.2-.54-1.2-1.2V9.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path d="M2.6 9.2h3.1l.7 1.4h3.2l.7-1.4h3.1" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function ViewsIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3 4.2h10M3 8h10M3 11.8h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronIcon({ size = 12, open, className }: IconProps & { open?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      className={className}
      style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
      aria-hidden
    >
      <path d="M4.2 2.4 8.2 6 4.2 9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function ForgeMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#5e6ad2" />
      <path d="M9 22.5 16 8.5 23 22.5H9Z" stroke="#f7f8f8" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12.2 17.2h7.6" stroke="#f7f8f8" strokeWidth="1.8" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M4 4l8 8M12 4 4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} aria-hidden>
      <path
        d="M3.2 7.2 5.7 9.7 10.8 4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GitPullIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} aria-hidden>
      <circle cx="3.5" cy="3.2" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="3.5" cy="10.8" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10.5" cy="10.8" r="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 4.8v4.4M10.5 9.2V6.4A2.9 2.9 0 0 0 7.6 3.5H6.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function FilterIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M2.5 4h11M4.5 8h7M6.5 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
