import { Timetable } from '../../features/timetable/client/Timetable';
import { Bus } from '../../features/bus/client/Bus';
import { Admin } from '../../features/timetable/client/Admin';
import { CampusMap } from '../../features/campus/client/CampusMap';
export const clientFeatures = [
  { id: 'timetable', label: '時間割', component: Timetable },
  { id: 'bus', label: 'バス', component: Bus },
  { id: 'campus', label: '構内', component: CampusMap },
  { id: 'admin', label: '管理', component: Admin },
];
