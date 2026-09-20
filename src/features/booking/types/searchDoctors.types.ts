/**
 * Doctor search view model.
 *
 * This type is built solely by `mapDoctorToSearchDoctor` from the backend
 * `DoctorPublicSummary` (`doctorId`, `fullName`, `specialty`,
 * `onDemandAvailable`) plus that doctor's real availability slots. It previously
 * also declared `role`, `location`, `hospital`, `rating`, `reviewCount`,
 * `experience`, `price`, `avatarUrl`, `personality`, `languages`, `isFeatured`,
 * and `isTopRated`, along with a `Location` interface carrying `distanceKm`.
 *
 * The platform stores none of those. Nothing populated them, so every card that
 * read one rendered a hard-coded fallback instead — fabricated hospital
 * affiliations, a 4.9 rating, 312 reviews, 14 years of experience — which is why
 * those renders were removed (ADR-20260806-02). The declarations are removed
 * too: an optional field on the view model is an open invitation to supply a
 * plausible default for it, and doctor credentials are the worst possible place
 * for one. If the backend ever holds these values, re-add the field in the same
 * change that sources it.
 */
export interface SearchDoctor {
  id: number;
  /** Backend doctor user id (Cognito sub), used for navigation and schedules. */
  doctorId?: string;
  name: string;
  specialty?: string;
  /** Earliest available slot date (YYYY-MM-DD), from the schedules endpoint. */
  nextAvailable?: string;
  /** Real available slots, formatted `YYYY-MM-DD · HH:MM`. */
  scheduleSpace?: string[];
}

export type DoctorSearchResult = {
  recommendations: SearchDoctor[];
  searchResults: SearchDoctor[];
};
