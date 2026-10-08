import data from './floorplan.json';

export const floorPlan = data;
export type Floor = (typeof floorPlan.floors)[number];
export type Room = Floor['rooms'][number];
export type RoomResult = { floor: Floor; room: Room };

export function findRoom(floorId: string, roomId: string): RoomResult | null {
  const floor = floorPlan.floors.find((item) => item.id === floorId);
  const room = floor?.rooms.find((item) => item.id === roomId);
  return floor && room ? { floor, room } : null;
}

export function searchRooms(query: string, limit = 8): RoomResult[] {
  const value = query.trim().normalize('NFKC').toLocaleLowerCase('ja');
  if (!value || limit <= 0) return [];
  return floorPlan.floors
    .flatMap((floor) => floor.rooms.map((room) => ({ floor, room })))
    .filter(({ room }) =>
      [room.name, ...room.aliases].some((name) =>
        name.normalize('NFKC').toLocaleLowerCase('ja').includes(value),
      ),
    )
    .slice(0, limit);
}
