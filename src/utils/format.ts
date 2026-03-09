import { formatDistanceToNow, format, parseISO } from "date-fns";

export function timeAgo(date: string): string {
  return formatDistanceToNow(parseISO(date), { addSuffix: true });
}

export function formatDate(date: string): string {
  return format(parseISO(date), "MMM d, yyyy");
}

export function formatDateTime(date: string): string {
  return format(parseISO(date), "MMM d, yyyy 'at' h:mm a");
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
