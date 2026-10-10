import { createAdminDataCache } from "./adminDataCache";
import {
  getPlacesCacheRemaining,
  listPlaces,
  type AppPlace,
} from "./placeService";
import {
  listAdminReportTickets,
  getAdminReportsCacheRemaining,
  type ReportTicket,
} from "./reportTicketService";
import {
  listAdminReservationMetrics,
  type AdminReservationMetric,
} from "./adminStatsService";
import {
  listAdminPlaceAnalyticsEvents,
  type PlaceAnalyticsEvent,
} from "./placeAnalyticsService";

type Overview = { places: AppPlace[]; reports: ReportTicket[] };
type Statistics = Overview & {
  reservations: AdminReservationMetric[];
  events: PlaceAnalyticsEvent[];
};
const overview = createAdminDataCache<Overview>();
const statistics = createAdminDataCache<Statistics>();
const remaining = (cache: { remaining: () => number }) =>
  Math.min(
    cache.remaining(),
    getPlacesCacheRemaining(),
    getAdminReportsCacheRemaining(),
  );

export const adminOverviewSource = {
  peek: overview.peek,
  remaining: () => remaining(overview),
  load: (options?: { forceRefresh?: boolean }) => {
    const refresh = {
      forceRefresh: Boolean(
        options?.forceRefresh || (overview.peek() && remaining(overview) === 0),
      ),
    };
    return overview.read(async () => {
      const [places, reports] = await Promise.all([
        listPlaces(refresh),
        listAdminReportTickets(refresh),
      ]);
      return { places, reports };
    }, refresh);
  },
};
export const adminStatisticsSource = {
  peek: statistics.peek,
  remaining: () => remaining(statistics),
  load: (options?: { forceRefresh?: boolean }) => {
    const refresh = {
      forceRefresh: Boolean(
        options?.forceRefresh ||
          (statistics.peek() && remaining(statistics) === 0),
      ),
    };
    return statistics.read(async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const [places, reports, reservations, events] = await Promise.all([
        listPlaces(refresh),
        listAdminReportTickets(refresh),
        listAdminReservationMetrics(since),
        listAdminPlaceAnalyticsEvents(since),
      ]);
      return { places, reports, reservations, events };
    }, refresh);
  },
};
