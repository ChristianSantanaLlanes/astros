import type { Priority, Status } from "./types";

type IconProps = { size?: number; className?: string };

const iconStyle = { display: "block", flexShrink: 0 } as const;

export function StatusIcon({ status, size = 14 }: { status: Status; size?: number }) {
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
        <circle cx="7" cy="7" r="6" stroke="#8a8f98" strokeWidth="1.5" />
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
    return (
      <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
        <circle cx="7" cy="7" r="7" fill="#5e6ad2" />
        <path
          d="M4.2 7.1 6.1 9.1 9.9 4.8"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
      <circle cx="7" cy="7" r="6" stroke="#62666d" strokeWidth="1.5" />
      <path d="M4.8 4.8 9.2 9.2M9.2 4.8 4.8 9.2" stroke="#62666d" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function PriorityIcon({ priority, size = 14 }: { priority: Priority; size?: number }) {
  const s = size;
  if (priority === 1) {
    return (
      <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
        <path
          d="M7 1.6 13.15 12.6H.85L7 1.6Z"
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
  const lit = priority === 0 ? 0 : priority === 4 ? 1 : priority === 3 ? 2 : 3;
  const heights = [3.8, 6.4, 9];
  return (
    <svg width={s} height={s} viewBox="0 0 14 14" fill="none" aria-hidden style={iconStyle}>
      {heights.map((h, i) => (
        <rect
          key={h}
          x={2.7 + i * 3.1}
          y={11.6 - h}
          width="1.9"
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

export function FilterIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M2.5 4h11M4.5 8h7M6.5 12h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
