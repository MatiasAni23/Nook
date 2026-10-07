import { studyPlaces, workPlaces } from "./mockData";
import type { AppPlace } from "../services/placeService";

// Give demo records the same shape as database records in every view.
export const demoPlaces: AppPlace[] = [
  ...studyPlaces.map((place): AppPlace => ({
    ...place, category: "study", planType: "basic", address: "",
    images: [], amenities: [], spaces: [],
  })),
  ...workPlaces.map((place): AppPlace => ({
    ...place, category: "work", planType: "basic", address: "", outlets: false,
    images: [], amenities: [], spaces: [],
  })),
];
