export function Avatar({ name, src }: { name: string; src?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return src ? <img className="avatar" src={src} alt={name} /> : <span className="avatar">{initials || "M"}</span>;
}
