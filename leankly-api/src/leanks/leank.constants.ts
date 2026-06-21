import { LeankCategory, LeankStatus } from "@prisma/client";

export const CATEGORY_VALUES: Record<LeankCategory, string> = {
  FITNESS: "Fitness & Sports",
  STUDY: "Study & Learning",
  SOCIAL: "Social & Nightlife",
  VOLUNTEERING: "Volunteering & Causes",
  HEALTH: "Health & Wellness",
  CREATIVE: "Creative & Arts",
  FOOD: "Food & Drinks",
  TRAVEL: "Travel & Outdoors",
  CAREER: "Career & Networking",
  GAMING: "Gaming & Esports",
  OTHER: "Other",
};

export const STATUS_VALUES: Record<LeankStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

export const CATEGORY_KEYS = Object.keys(CATEGORY_VALUES) as LeankCategory[];

export function categoryFromValue(value: string): LeankCategory | null {
  const entry = Object.entries(CATEGORY_VALUES).find(
    ([, label]) => label === value,
  );
  return (entry?.[0] as LeankCategory | undefined) || null;
}
