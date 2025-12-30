
import { Weapon, GamePass } from './types';

export const INITIAL_HEALTH = 100;
export const INITIAL_AMMO = 30;
export const MAX_AMMO = 30;
export const ZOMBIE_BASE_SPEED = 1.4;
export const PLAYER_BASE_SPEED = 4.2;
export const PLAYER_RADIUS = 16;
export const ALLY_RADIUS = 14;
export const ZOMBIE_RADIUS = 15;
export const BULLET_RADIUS = 3;
export const BULLET_SPEED = 14;

export const TANK_WIDTH = 60;
export const TANK_HEIGHT = 80;
export const TANK_FIRE_RATE = 3000;
export const TANK_EXPLOSION_RADIUS = 120;
export const TANK_SHELL_DAMAGE = 500;

export const COLORS = {
  PLAYER: '#60a5fa',
  ALLY: '#4ade80',
  ZOMBIE: '#f87171',
  BULLET: '#fde047',
  BLOOD: '#991b1b',
  UI_GREEN: '#22c55e',
  UI_RED: '#dc2626',
  NEON_BLUE: '#0ea5e9',
  GLOW_PURPLE: '#a855f7',
  RAILGUN: '#c084fc',
  TANK: '#3f6212', // Dark olive drab
  TANK_TRIM: '#14532d',
};

export const WEAPONS: Record<string, Weapon> = {
  Pistol: {
    type: 'Pistol',
    name: 'Tactical Sidearm',
    cost: 0,
    damage: 35,
    fireRate: 250,
    bulletSpeed: 14,
    description: 'Reliable semi-auto defense.',
    color: '#60a5fa'
  },
  SMG: {
    type: 'SMG',
    name: 'Vector-X SMG',
    cost: 1500,
    damage: 20,
    fireRate: 85,
    bulletSpeed: 16,
    description: 'High-RPM suppression tool.',
    color: '#4ade80'
  },
  Shotgun: {
    type: 'Shotgun',
    name: 'Breacher-12',
    cost: 3000,
    damage: 50,
    fireRate: 650,
    bulletSpeed: 12,
    description: 'Close-quarters devastating spread.',
    color: '#f97316'
  },
  Railgun: {
    type: 'Railgun',
    name: 'Nexus Railgun',
    cost: 6500,
    damage: 200,
    fireRate: 900,
    bulletSpeed: 35,
    description: 'Electromagnetic piercing bolt.',
    color: '#c084fc'
  }
};

export const GAME_PASSES: GamePass[] = [
  { id: 'regen', name: 'Nano-Regen', cost: 2500, description: 'Passively heals 1 HP every 1.5s.', icon: '💉', rarity: 'Common' },
  { id: 'double_credits', name: 'Credit Multiplier', cost: 5000, description: 'Earn 50% more from all missions.', icon: '💰', rarity: 'Rare' },
  { id: 'kinetic_shield', name: 'Kinetic Shield', cost: 4000, description: '35% chance to dodge damage.', icon: '🛡️', rarity: 'Epic' },
  { id: 'tank_support', name: 'Heavy Tank Pass', cost: 12000, description: 'Deploy an automated M1-Nexus Heavy Tank.', icon: '🚜', rarity: 'Legendary' },
  { id: 'overdrive', name: 'System Overdrive', cost: 8000, description: 'Extreme boost to speed & power.', icon: '⚡', rarity: 'Legendary' }
];
