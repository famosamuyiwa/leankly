import {
  FilterOptions,
  LeankCategory,
  MascotPoses,
  NavbarOptions,
  Screens,
} from "./enums";

export const defaultCover =
  "https://nyc.cloud.appwrite.io/v1/storage/buckets/68e93c64002537fc5626/files/68e93cda001c2a4367c4/view?project=68e45dc0001e074ea36a&mode=admin";

export const leankCategories: LeankCategory[] = [
  LeankCategory.FITNESS,
  LeankCategory.STUDY,
  LeankCategory.SOCIAL,
  LeankCategory.VOLUNTEERING,
  LeankCategory.HEALTH,
  LeankCategory.CREATIVE,
  LeankCategory.FOOD,
  LeankCategory.TRAVEL,
  LeankCategory.CAREER,
  LeankCategory.GAMING,
  LeankCategory.OTHER,
];

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
    title: FilterOptions.LOCATION,
    screen: Screens.HOME,
    opensBottomSheet: true,
    requiresPro: false,
  },
  {
    title: FilterOptions.CATEGORY,
    screen: Screens.HOME,
    opensBottomSheet: true,
    requiresPro: true,
  },
  {
    title: FilterOptions.AGE,
    screen: Screens.HOME,
    opensBottomSheet: true,
    requiresPro: true,
  },
  {
    title: FilterOptions.TODAY,
    screen: Screens.HOME,
    opensBottomSheet: false,
    requiresPro: true,
  },
  {
    title: FilterOptions.THIS_WEEK,
    screen: Screens.HOME,
    opensBottomSheet: false,
    requiresPro: true,
  },
  // {
  //   title: FilterOptions.CATEGORY,
  //   screen: Screens.HOME,
  //  opensBottomSheet: true
  // },

  // {
  //   title: FilterOptions.SEX,
  //   screen: Screens.HOME,
  //opensBottomSheet: true

  // },

  // {
  //   title: FilterOptions.DATE,
  //   screen: Screens.HOME,
  //opensBottomSheet: true

  // },
];

export const filterDescriptions = {
  [FilterOptions.TODAY]: "",
  [FilterOptions.THIS_WEEK]: "",
  [FilterOptions.CATEGORY]: "Pick the types of leanks you want to see first",
  [FilterOptions.DATE]: "",
  [FilterOptions.AGE]: "Select host's age range you're open to leanking",
  [FilterOptions.SEX]: "Select host's sex you're open to leanking",
  [FilterOptions.LOCATION]:
    "Mix nearby radius with online meetups if you’d like",
};

export const defaultCovers = [
  "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/691e20d00037f52f1934/view?project=691cc816003116a83a09",
  "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/691e20c800326fa5037c/view?project=691cc816003116a83a09",
  "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/691e20c10013191cc2df/view?project=691cc816003116a83a09",
  "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/691e20b90010fa9220cf/view?project=691cc816003116a83a09",
];

export const emptyScreenImages = {
  [NavbarOptions.REQUESTS]:
    "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/691e20970036c05c83f7/view?project=691cc816003116a83a09",
  [NavbarOptions.CHATS]:
    "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/691e20a1000f1908d19a/view?project=691cc816003116a83a09",
};

export const mascotPoses = {
  [MascotPoses.SMILE_THUMBS_UP]:
    // "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/6930bd290022ed94561c/view?project=691cc816003116a83a09",
    "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/6930c2da0001e7a360de/view?project=691cc816003116a83a09",
  [MascotPoses.REFER]:
    "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/6930cd3800002e5fa1f8/view?project=691cc816003116a83a09",
  [MascotPoses.POWER_UP]:
    "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/6930d22500095f44f771/view?project=691cc816003116a83a09",
};

export const noResultImage =
  "https://nyc.cloud.appwrite.io/v1/storage/buckets/691cd29c001a80b6d29f/files/69332ced000de60c935c/view?project=691cc816003116a83a09";
