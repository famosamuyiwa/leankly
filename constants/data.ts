import { Leank, LeankRequest, User } from "@/interfaces";
import { FilterOptions, LeankStatus, NavbarOptions, Screens } from "./enums";

export const user: User = {
  avatar:
    "https://nyc.cloud.appwrite.io/v1/storage/buckets/68cb2bb6002b3b62070d/files/68d74390000e5794550f/view?project=68cb274e000a797620ce",
  name: "Olu",
  email: "nenling19@gmail.com",
  age: 23,
};

export const user2: User = {
  avatar: "https://picsum.photos/200/300",
  name: "Ayo Balogun",
  email: "nanling19@gmail.com",
  age: 21,
};

export const navbarOptions = [
  {
    title: NavbarOptions.HOSTED,
    screen: Screens.PROFILE,
  },
  {
    title: NavbarOptions.JOINED,
    screen: Screens.PROFILE,
  },
  {
    title: NavbarOptions.REQUESTS,
    screen: Screens.CHAT,
  },
  {
    title: NavbarOptions.CHATS,
    screen: Screens.CHAT,
  },
];

export const filterCategories = [
  {
    title: FilterOptions.TODAY,
    screen: Screens.HOME,
  },
  {
    title: FilterOptions.CATEGORY,
    screen: Screens.HOME,
  },
  {
    title: FilterOptions.AGE,
    screen: Screens.HOME,
  },
  {
    title: FilterOptions.DATE,
    screen: Screens.HOME,
  },
];

export const dummyBooking: Leank[] = [
  {
    $id: "1",
    title: "Run With me ! ",
    cover: "https://picsum.photos/200/300", // sample image url
    location: "Syracuse",
    date: "2025-10-10T12:00:00.000Z",
    time: "2:00 PM",
    description:
      "Looking for a running buddy for my daily 5K route around the park.",
    status: LeankStatus.ACTIVE,
    peopleRequired: 2,
    owner: user,
    participants: [JSON.stringify(user)],
  },
  {
    $id: "2",
    title: "Early morning gym sesh? ",
    cover: "https://picsum.photos/200/300", // sample image url
    location: "NYC",
    date: "2025-10-10T12:00:00.000Z",
    time: "2:00 PM",
  },
  {
    $id: "3",
    title: "Hospital trip",
    cover: "https://picsum.photos/200/300", // sample image url
    location: "Newark",
    date: "2025-10-10T12:00:00.000Z",
    time: "2:00 PM",
  },
  {
    $id: "4",
    title: "Hospital trip",
    cover: "https://picsum.photos/200/300", // sample image url
    location: "Newark",
    date: "2025-10-10T12:00:00.000Z",
    time: "2:00 PM",
  },
  {
    $id: "5",
    title: "Hospital trip",
    cover: "https://picsum.photos/200/300", // sample image url
    location: "Newark",
    date: "2025-10-10T12:00:00.000Z",
    time: "2:00 PM",
  },
];

export const dummyRequests: LeankRequest = {
  user: user2,
  leank: dummyBooking[2],
  dateCreated: new Date("2025-10-04T12:00:00.000Z"),
  dateUpdated: new Date("2025-10-04T12:00:00.000Z"),
};
