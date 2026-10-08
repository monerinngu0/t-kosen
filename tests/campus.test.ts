import { describe, expect, it } from 'vitest';
import {
  findRoom,
  floorPlan,
  searchRooms,
} from '../src/features/campus/shared/model';

describe('構内案内', () => {
  it('部屋名・番号・別名から階をまたいで候補を検索する', () => {
    expect(searchRooms('教室').map((x) => x.floor.id)).toContain('1F');
    expect(searchRooms('教室').map((x) => x.floor.id)).toContain('2F');
    expect(searchRooms('２０４')[0]).toMatchObject({
      floor: { id: '2F' },
      room: { id: 'room204' },
    });
    expect(searchRooms('pc室')[0].room.id).toBe('pc');
    expect(searchRooms('   ')).toEqual([]);
    expect(searchRooms('存在しない部屋')).toEqual([]);
    expect(searchRooms('教室', 2)).toHaveLength(2);
  });

  it('階と部屋IDから正しい部屋を選び、仮図の座標を範囲内に保つ', () => {
    expect(findRoom('2F', 'room204')?.room.name).toContain('204');
    expect(findRoom('1F', 'room204')).toBeNull();
    expect(findRoom('3F', 'room204')).toBeNull();
    for (const floor of floorPlan.floors) {
      const ids = new Set(floor.rooms.map((room) => room.id));
      expect(ids.size).toBe(floor.rooms.length);
      for (const room of floor.rooms) {
        expect(room.x).toBeGreaterThanOrEqual(0);
        expect(room.y).toBeGreaterThanOrEqual(0);
        expect(room.x + room.w).toBeLessThanOrEqual(100);
        expect(room.y + room.h).toBeLessThanOrEqual(100);
      }
    }
  });
});
