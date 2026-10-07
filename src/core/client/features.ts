import { Timetable } from '../../features/timetable/client/Timetable';
import { Bus } from '../../features/bus/client/Bus';
import { Admin } from '../../features/timetable/client/Admin';
export const clientFeatures = [
  { id: 'timetable', label: '時間割', component: Timetable },
  { id: 'bus', label: 'バス', component: Bus },
  { id: 'admin', label: '管理', component: Admin },
];
