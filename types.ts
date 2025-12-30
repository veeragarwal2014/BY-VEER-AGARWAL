
export interface Vector2 {
  x: number;
  y: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  reward: number;
  difficulty: 'Low' | 'Medium' | 'High' | 'EXTREME';
}

export type WeaponType = 'Pistol' | 'SMG' | 'Shotgun' | 'Railgun';

export interface Weapon {
  type: WeaponType;
  name: string;
  cost: number;
  damage: number;
  fireRate: number;
  bulletSpeed: number;
  description: string;
  color: string;
}

export interface GamePass {
  id: string;
  name: string;
  cost: number;
  description: string;
  icon: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
}

export interface GameState {
  health: number;
  maxHealth: number;
  score: number;
  money: number;
  ammo: number;
  maxAmmo: number;
  level: number;
  isGameOver: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentMission: Mission | null;
  squadSize: number;
  ownedWeapons: WeaponType[];
  activePasses: string[];
  hasTank: boolean;
}

export interface PlayerStats {
  speed: number;
  damage: number;
  fireRate: number;
  bulletSpeed: number;
  weaponType: WeaponType;
}

export interface Ally {
  id: string;
  pos: Vector2;
  target: Vector2 | null;
  lastShot: number;
  health: number;
}

export interface Tank {
  pos: Vector2;
  rotation: number;
  turretRotation: number;
  lastShot: number;
}

export interface BloodSplat {
  x: number;
  y: number;
  size: number;
  alpha: number;
  rotation: number;
}
