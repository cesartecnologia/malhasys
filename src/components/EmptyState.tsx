import type { ReactNode } from "react";

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <p>{title}</p>
      {action}
    </div>
  );
}
