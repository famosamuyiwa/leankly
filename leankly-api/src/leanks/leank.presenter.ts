import { Leank, Participant, User } from "@prisma/client";
import { CATEGORY_VALUES, STATUS_VALUES } from "./leank.constants";

type LeankWithOwner = Leank & {
  owner: Pick<User, "id" | "name" | "age" | "avatarUrl">;
  participants?: Pick<Participant, "userId">[];
};

export function presentLeank(leank: LeankWithOwner) {
  return {
    id: leank.id,
    cover: leank.coverUrl,
    coverFileId: leank.coverFileId,
    title: leank.title,
    description: leank.description,
    status: STATUS_VALUES[leank.status],
    category: CATEGORY_VALUES[leank.category],
    peopleRequired: leank.peopleRequired,
    date: leank.eventDate,
    time: leank.time,
    location: leank.location,
    locationLat: leank.locationLat,
    locationLng: leank.locationLng,
    isOnline: leank.isOnline,
    ownerId: leank.ownerId,
    owner: {
      id: leank.owner.id,
      name: leank.owner.name,
      age: leank.owner.age,
      avatar: leank.owner.avatarUrl || "",
    },
    participantIds:
      leank.participants?.map((participant) => participant.userId) || [],
    lastMessageAt: leank.lastMessageAt,
    createdAt: leank.createdAt,
    updatedAt: leank.updatedAt,
  };
}
