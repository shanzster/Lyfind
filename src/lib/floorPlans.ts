export interface FloorPlan {
  id: string;
  name: string;
  building: string;
  floor: string;
  imageUrl: string;
  width: number;
  height: number;
}

export const floorPlans: FloorPlan[] = [
  {
    id: 'ground-floor',
    name: 'Ground Floor',
    building: 'Main Building',
    floor: 'Ground',
    imageUrl: '/floor-plans/ground_floor.png',
    width: 1920,
    height: 1080,
  },
  {
    id: '2nd-floor',
    name: '2nd Floor',
    building: 'Main Building',
    floor: '2',
    imageUrl: '/floor-plans/2nd_floor.png',
    width: 1920,
    height: 1080,
  },
  {
    id: '3rd-4th-floor',
    name: '3rd & 4th Floor',
    building: 'Main Building',
    floor: '3-4',
    imageUrl: '/floor-plans/3rd_4th_floor.png',
    width: 1920,
    height: 1080,
  },
];

export function getFloorPlan(id: string): FloorPlan | undefined {
  return floorPlans.find(plan => plan.id === id);
}

export function getFloorPlansByBuilding(building: string): FloorPlan[] {
  return floorPlans.filter(plan => plan.building === building);
}

export function getAllBuildings(): string[] {
  return Array.from(new Set(floorPlans.map(fp => fp.building)));
}
