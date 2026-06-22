export const formatDate = (date: Date | string | "") => {
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

export function timeElapsed(date: string): string {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return "";
  }
  const now = new Date();
  const diff = (now.getTime() - dateObj.getTime()) / 1000; // difference in seconds

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
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${month}/${day}/${year}`;
  }
}

export function generateRandomUsername(prefix: string = "user"): string {
  const randomNumber = Math.floor(100000 + Math.random() * 900000); // 6 digits
  const timestamp = Date.now().toString().slice(-4); // last 4 digits of timestamp
  return `${prefix}${randomNumber}${timestamp}`;
}
