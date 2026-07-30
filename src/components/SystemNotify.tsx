import { AlertTriangle } from "lucide-react";

export function SystemNotify({
  title,
  message,
  onClose
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="notify error" role="alertdialog" aria-modal="true" aria-labelledby="system-notify-title">
      <div>
        <strong id="system-notify-title">
          <AlertTriangle size={18} /> {title}
        </strong>
        <p>{message}</p>
      </div>
      <div className="notify-actions">
        <button className="compact-button" type="button" onClick={onClose}>Entendi</button>
      </div>
    </div>
  );
}
