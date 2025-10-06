export const formatDate = (date: Date | "") => {
  if (date === "") return;
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short", // Monday
    day: "2-digit", // 03
    month: "short", // March
    year: "numeric", // 2025
  });
};

export const formatTime = (date: Date | string) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export function timeElapsed(date: Date): string {
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000; // difference in seconds

  if (diff < 60) {
    const seconds = Math.floor(diff);
    return `${seconds}s ago`;
  } else if (diff < 3600) {
    const minutes = Math.floor(diff / 60);
    return `${minutes}m ago`;
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours}hr ago`;
  } else if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days}d ago`;
  } else {
    // Format as MM/DD/YYYY
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
}
