import { timetableRoutes } from '../../features/timetable/server/routes';
// Add API modules here; business logic stays inside features.
export const serverFeatures = [
  { path: '/api/timetables', routes: timetableRoutes },
];
