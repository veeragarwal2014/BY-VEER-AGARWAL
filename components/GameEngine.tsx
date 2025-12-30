
import React, { useRef, useEffect } from 'react';
import { Vector2, PlayerStats, Ally, BloodSplat, Tank } from '../types';
import { 
  PLAYER_RADIUS, 
  ALLY_RADIUS,
  ZOMBIE_RADIUS, 
  BULLET_RADIUS, 
  ZOMBIE_BASE_SPEED, 
  COLORS,
  BULLET_SPEED,
  TANK_WIDTH,
  TANK_HEIGHT,
  TANK_FIRE_RATE,
  TANK_EXPLOSION_RADIUS,
  TANK_SHELL_DAMAGE
} from '../constants';

interface GameEngineProps {
  playerStats: PlayerStats;
  level: number;
  squadSize: number;
  activePasses: string[];
  hasTank: boolean;
  onGameOver: (score: number) => void;
  onWaveComplete: () => void;
  onUpdateAmmo: (ammo: number) => void;
  onUpdateHealth: (health: number) => void;
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;

  constructor(x: number, y: number, color: string, size: number = 2) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1.0;
    this.color = color;
    this.size = size;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.95;
    this.vy *= 0.95;
    this.life -= 0.025;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

interface Zombie {
  x: number;
  y: number;
  health: number;
  speed: number;
  maxHealth: number;
  flash: number;
  rotation: number;
  walkPhase: number;
  variant: number;
}

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const GameEngine: React.FC<GameEngineProps> = ({ 
  playerStats, 
  level, 
  squadSize,
  activePasses,
  hasTank,
  onGameOver, 
  onWaveComplete, 
  onUpdateAmmo, 
  onUpdateHealth 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const playerPos = useRef<Vector2>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const keys = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<Vector2>({ x: 0, y: 0 });
  const bullets = useRef<{ x: number, y: number, vx: number, vy: number, owner: 'player' | 'ally', type: string }[]>([]);
  const shells = useRef<Shell[]>([]);
  const zombies = useRef<Zombie[]>([]);
  const allies = useRef<Ally[]>([]);
  const tank = useRef<Tank | null>(null);
  const bloodSplats = useRef<BloodSplat[]>([]);
  const particles = useRef<Particle[]>([]);
  const lastShot = useRef<number>(0);
  const ammoRef = useRef<number>(30);
  const healthRef = useRef<number>(100);
  const scoreRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const spawnTimer = useRef<number>(0);
  const zombiesKilled = useRef<number>(0);
  const requiredKills = useRef<number>(20 + level * 10);
  const screenShake = useRef<number>(0);

  useEffect(() => {
    allies.current = Array.from({ length: squadSize }).map((_, i) => ({
      id: `ally-${i}`,
      pos: { 
        x: playerPos.current.x + (Math.random() - 0.5) * 200, 
        y: playerPos.current.y + (Math.random() - 0.5) * 200 
      },
      target: null,
      lastShot: 0,
      health: 100,
    }));
  }, [squadSize]);

  useEffect(() => {
    if (hasTank && !tank.current) {
      tank.current = {
        pos: { x: playerPos.current.x - 100, y: playerPos.current.y - 100 },
        rotation: 0,
        turretRotation: 0,
        lastShot: 0,
      };
    }
  }, [hasTank]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = true;
    const handleKeyUp = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseDown = () => keys.current['mousedown'] = true;
    const handleMouseUp = () => keys.current['mousedown'] = false;

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    
    handleResize();

    const spawnZombie = () => {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      if (side === 0) { x = Math.random() * window.innerWidth; y = -100; }
      else if (side === 1) { x = window.innerWidth + 100; y = Math.random() * window.innerHeight; }
      else if (side === 2) { x = Math.random() * window.innerWidth; y = window.innerHeight + 100; }
      else { x = -100; y = Math.random() * window.innerHeight; }

      const baseHp = 70 + level * 25;
      zombies.current.push({
        x, y,
        health: baseHp,
        maxHealth: baseHp,
        speed: ZOMBIE_BASE_SPEED + (Math.random() * level * 0.15),
        flash: 0,
        rotation: 0,
        walkPhase: Math.random() * Math.PI * 2,
        variant: Math.floor(Math.random() * 3)
      });
    };

    const loop = (time: number) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;

      // 1. Movement Logic
      const moveX = (keys.current['d'] || keys.current['arrowright'] ? 1 : 0) - (keys.current['a'] || keys.current['arrowleft'] ? 1 : 0);
      const moveY = (keys.current['s'] || keys.current['arrowdown'] ? 1 : 0) - (keys.current['w'] || keys.current['arrowup'] ? 1 : 0);
      
      const mag = Math.sqrt(moveX * moveX + moveY * moveY);
      if (mag > 0) {
        playerPos.current.x += (moveX / mag) * playerStats.speed;
        playerPos.current.y += (moveY / mag) * playerStats.speed;
      }

      playerPos.current.x = Math.max(PLAYER_RADIUS, Math.min(window.innerWidth - PLAYER_RADIUS, playerPos.current.x));
      playerPos.current.y = Math.max(PLAYER_RADIUS, Math.min(window.innerHeight - PLAYER_RADIUS, playerPos.current.y));

      // Tank Logic
      if (tank.current) {
        const targetX = playerPos.current.x - 80;
        const targetY = playerPos.current.y - 80;
        const tdx = targetX - tank.current.pos.x;
        const tdy = targetY - tank.current.pos.y;
        const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
        
        if (tdist > 40) {
          tank.current.rotation = Math.atan2(tdy, tdx);
          tank.current.pos.x += (tdx / tdist) * 1.5;
          tank.current.pos.y += (tdy / tdist) * 1.5;
        }

        // Targeting
        let nearestZ: any = null;
        let minDist = 800;
        zombies.current.forEach(z => {
          const zdx = z.x - tank.current!.pos.x;
          const zdy = z.y - tank.current!.pos.y;
          const zdist = Math.sqrt(zdx * zdx + zdy * zdy);
          if (zdist < minDist) {
            minDist = zdist;
            nearestZ = z;
          }
        });

        if (nearestZ) {
          const targetTurretRot = Math.atan2(nearestZ.y - tank.current.pos.y, nearestZ.x - tank.current.pos.x);
          tank.current.turretRotation = targetTurretRot;

          if (time - tank.current.lastShot > TANK_FIRE_RATE) {
            shells.current.push({
              x: tank.current.pos.x + Math.cos(targetTurretRot) * 40,
              y: tank.current.pos.y + Math.sin(targetTurretRot) * 40,
              vx: Math.cos(targetTurretRot) * 10,
              vy: Math.sin(targetTurretRot) * 10,
              life: 100
            });
            tank.current.lastShot = time;
            screenShake.current = 20;
          }
        }
      }

      // Shell Physics & AOE
      shells.current = shells.current.filter(s => {
        s.x += s.vx;
        s.y += s.vy;
        s.life--;
        
        let impact = false;
        zombies.current.forEach(z => {
          const dx = z.x - s.x;
          const dy = z.y - s.y;
          if (Math.sqrt(dx * dx + dy * dy) < ZOMBIE_RADIUS + 5) impact = true;
        });

        if (impact || s.life <= 0) {
          // Explosion
          for (let i = 0; i < 20; i++) particles.current.push(new Particle(s.x, s.y, '#f97316', 4));
          for (let i = 0; i < 15; i++) particles.current.push(new Particle(s.x, s.y, '#451a03', 6));
          
          zombies.current.forEach(z => {
            const dx = z.x - s.x;
            const dy = z.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < TANK_EXPLOSION_RADIUS) {
              z.health -= TANK_SHELL_DAMAGE * (1 - dist / TANK_EXPLOSION_RADIUS);
              z.flash = 1.0;
            }
          });
          return false;
        }
        return true;
      });

      // Allies Behavior
      allies.current.forEach((ally, i) => {
        const offset = { x: Math.sin(time / 1200 + i) * 100, y: Math.cos(time / 1200 + i) * 100 };
        const targetX = playerPos.current.x + offset.x;
        const targetY = playerPos.current.y + offset.y;
        const dx = targetX - ally.pos.x;
        const dy = targetY - ally.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 20) {
          ally.pos.x += (dx / dist) * (playerStats.speed * 0.8);
          ally.pos.y += (dy / dist) * (playerStats.speed * 0.8);
        }

        if (time - ally.lastShot > playerStats.fireRate * 3.5) {
          let nearestZ: any = null;
          let minDist = 450;
          zombies.current.forEach(z => {
            const zdx = z.x - ally.pos.x;
            const zdy = z.y - ally.pos.y;
            const zdist = Math.sqrt(zdx * zdx + zdy * zdy);
            if (zdist < minDist) {
              minDist = zdist;
              nearestZ = z;
            }
          });

          if (nearestZ) {
            const angle = Math.atan2(nearestZ.y - ally.pos.y, nearestZ.x - ally.pos.x);
            bullets.current.push({
              x: ally.pos.x,
              y: ally.pos.y,
              vx: Math.cos(angle) * playerStats.bulletSpeed,
              vy: Math.sin(angle) * playerStats.bulletSpeed,
              owner: 'ally',
              type: 'Pistol'
            });
            ally.lastShot = time;
          }
        }
      });

      // Player Shooting
      if ((keys.current['mousedown'] || keys.current[' ']) && time - lastShot.current > playerStats.fireRate && ammoRef.current > 0) {
        const angle = Math.atan2(mousePos.current.y - playerPos.current.y, mousePos.current.x - playerPos.current.x);
        
        if (playerStats.weaponType === 'Shotgun') {
          for (let i = -2; i <= 2; i++) {
            const spreadAngle = angle + (i * 0.12);
            bullets.current.push({
              x: playerPos.current.x + Math.cos(spreadAngle) * 25,
              y: playerPos.current.y + Math.sin(spreadAngle) * 25,
              vx: Math.cos(spreadAngle) * playerStats.bulletSpeed,
              vy: Math.sin(spreadAngle) * playerStats.bulletSpeed,
              owner: 'player',
              type: 'Shotgun'
            });
          }
        } else {
          bullets.current.push({
            x: playerPos.current.x + Math.cos(angle) * 25,
            y: playerPos.current.y + Math.sin(angle) * 25,
            vx: Math.cos(angle) * playerStats.bulletSpeed,
            vy: Math.sin(angle) * playerStats.bulletSpeed,
            owner: 'player',
            type: playerStats.weaponType
          });
        }

        lastShot.current = time;
        ammoRef.current--;
        onUpdateAmmo(ammoRef.current);
        screenShake.current = playerStats.weaponType === 'Railgun' ? 15 : 6;
        for(let i=0; i<3; i++) particles.current.push(new Particle(playerPos.current.x, playerPos.current.y, COLORS.BULLET, 2));
      }

      // Auto Reload
      if (ammoRef.current <= 0 && time - lastShot.current > 1300) {
        ammoRef.current = 30;
        onUpdateAmmo(ammoRef.current);
      }

      // Spawning
      spawnTimer.current++;
      if (spawnTimer.current > Math.max(6, 45 - level * 4)) {
        if (zombies.current.length < 35 + level * 3) {
            spawnZombie();
        }
        spawnTimer.current = 0;
      }

      // Bullet Physics
      bullets.current = bullets.current.filter(b => {
        b.x += b.vx;
        b.y += b.vy;
        return b.x > -100 && b.x < window.innerWidth + 100 && b.y > -100 && b.y < window.innerHeight + 100;
      });

      // Zombie AI & Collisions
      zombies.current.forEach(z => {
        let target = playerPos.current;
        let minDist = Math.sqrt((playerPos.current.x - z.x)**2 + (playerPos.current.y - z.y)**2);
        allies.current.forEach(a => {
          const adist = Math.sqrt((a.pos.x - z.x)**2 + (a.pos.y - z.y)**2);
          if (adist < minDist) {
            minDist = adist;
            target = a.pos;
          }
        });

        const dx = target.x - z.x;
        const dy = target.y - z.y;
        z.rotation = Math.atan2(dy, dx);
        z.walkPhase += 0.08;
        
        z.x += (dx / minDist) * z.speed;
        z.y += (dy / minDist) * z.speed;
        z.flash = Math.max(0, z.flash - 0.1);

        // Damage Player
        const pdist = Math.sqrt((playerPos.current.x - z.x)**2 + (playerPos.current.y - z.y)**2);
        if (pdist < PLAYER_RADIUS + ZOMBIE_RADIUS) {
          let dmg = 0.9;
          if (activePasses.includes('kinetic_shield') && Math.random() < 0.35) {
            dmg = 0;
            for(let i=0; i<3; i++) particles.current.push(new Particle(playerPos.current.x, playerPos.current.y, '#fff', 3));
          }
          healthRef.current -= dmg;
          onUpdateHealth(healthRef.current);
          screenShake.current = dmg > 0 ? 10 : 2;
          if (healthRef.current <= 0) onGameOver(scoreRef.current);
        }

        // Bullet Hit
        bullets.current.forEach((b, bi) => {
          const bdx = b.x - z.x;
          const bdy = b.y - z.y;
          const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
          if (bdist < ZOMBIE_RADIUS + BULLET_RADIUS + (b.type === 'Railgun' ? 6 : 0)) {
            const dmg = b.owner === 'player' ? playerStats.damage : playerStats.damage * 0.35;
            z.health -= dmg;
            z.flash = 1.0;
            if (b.type !== 'Railgun') {
               bullets.current.splice(bi, 1);
            }
            if (Math.random() > 0.45) {
              bloodSplats.current.push({
                x: z.x + (Math.random() - 0.5) * 15,
                y: z.y + (Math.random() - 0.5) * 15,
                size: 8 + Math.random() * 20,
                alpha: 0.25 + Math.random() * 0.5,
                rotation: Math.random() * Math.PI * 2
              });
            }
            for(let i=0; i<6; i++) particles.current.push(new Particle(z.x, z.y, COLORS.BLOOD, Math.random() * 3 + 1));
          }
        });
      });

      // Death Processing
      const aliveZombies = zombies.current.filter(z => z.health > 0);
      const killed = zombies.current.length - aliveZombies.length;
      if (killed > 0) {
        zombiesKilled.current += killed;
        scoreRef.current += killed * 50;
        zombies.current = aliveZombies;
        if (zombiesKilled.current >= requiredKills.current) onWaveComplete();
      }

      particles.current.forEach(p => p.update());
      particles.current = particles.current.filter(p => p.life > 0);
      screenShake.current *= 0.88;

      // Rendering
      ctx.save();
      if (screenShake.current > 0.1) {
        ctx.translate((Math.random() - 0.5) * screenShake.current, (Math.random() - 0.5) * screenShake.current);
      }

      // Map
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < canvasRef.current.width; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, canvasRef.current.height); }
      for (let y = 0; y < canvasRef.current.height; y += 100) { ctx.moveTo(0, y); ctx.lineTo(canvasRef.current.width, y); }
      ctx.stroke();

      bloodSplats.current.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.fillStyle = COLORS.BLOOD;
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.ellipse(0, 0, s.size, s.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.globalAlpha = 1.0;

      particles.current.forEach(p => p.draw(ctx));

      // Tank Rendering
      if (tank.current) {
        ctx.save();
        ctx.translate(tank.current.pos.x, tank.current.pos.y);
        ctx.rotate(tank.current.rotation);
        
        // Treads
        ctx.fillStyle = '#111';
        ctx.fillRect(-TANK_HEIGHT/2, -TANK_WIDTH/2 - 2, TANK_HEIGHT, 10);
        ctx.fillRect(-TANK_HEIGHT/2, TANK_WIDTH/2 - 8, TANK_HEIGHT, 10);

        // Body
        ctx.fillStyle = COLORS.TANK;
        ctx.beginPath();
        ctx.roundRect(-TANK_HEIGHT/2 + 5, -TANK_WIDTH/2 + 5, TANK_HEIGHT - 10, TANK_WIDTH - 10, 5);
        ctx.fill();
        ctx.strokeStyle = COLORS.TANK_TRIM;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Details
        ctx.fillStyle = COLORS.TANK_TRIM;
        ctx.fillRect(-10, -15, 20, 30);

        // Turret
        ctx.restore();
        ctx.save();
        ctx.translate(tank.current.pos.x, tank.current.pos.y);
        ctx.rotate(tank.current.turretRotation);
        
        // Turret base
        ctx.fillStyle = COLORS.TANK;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Barrel
        ctx.fillStyle = '#111';
        ctx.fillRect(0, -4, 45, 8);
        ctx.fillStyle = COLORS.TANK_TRIM;
        ctx.fillRect(15, -6, 15, 12);

        ctx.restore();
      }

      // Shells
      shells.current.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.fillStyle = '#f97316';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#f97316';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Bullets
      ctx.globalCompositeOperation = 'lighter';
      bullets.current.forEach(b => {
        const isRail = b.type === 'Railgun';
        ctx.shadowBlur = isRail ? 30 : 12;
        ctx.shadowColor = isRail ? COLORS.RAILGUN : COLORS.BULLET;
        ctx.fillStyle = isRail ? COLORS.RAILGUN : COLORS.BULLET;
        ctx.beginPath();
        ctx.arc(b.x, b.y, isRail ? 6 : BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        if(isRail) {
           ctx.strokeStyle = COLORS.RAILGUN;
           ctx.lineWidth = 2;
           ctx.beginPath();
           ctx.moveTo(b.x - b.vx * 2, b.y - b.vy * 2);
           ctx.lineTo(b.x, b.y);
           ctx.stroke();
        }
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;

      // Hostiles (ZOMBIES) - REAL LIFE LOOK
      zombies.current.forEach(z => {
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.rotate(z.rotation);
        
        // Flash on hit
        if (z.flash > 0) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'white';
        }

        const armSwing = Math.sin(z.walkPhase) * 8;
        const bodyBob = Math.abs(Math.cos(z.walkPhase * 0.5)) * 2;

        // Base Skin Colors (Pallid/Decayed)
        const skinColors = ['#5a6a5a', '#4a5a4a', '#6a7a6a'];
        const clothColors = ['#334155', '#475569', '#1e293b'];
        
        ctx.fillStyle = clothColors[z.variant];
        
        // Arms (Reaching out)
        ctx.fillStyle = skinColors[z.variant];
        // Left Arm
        ctx.beginPath();
        ctx.roundRect(5, -12 + armSwing, 12, 6, 3);
        ctx.fill();
        // Right Arm
        ctx.beginPath();
        ctx.roundRect(5, 6 - armSwing, 12, 6, 3);
        ctx.fill();

        // Shoulders/Torso
        ctx.fillStyle = clothColors[z.variant];
        ctx.beginPath();
        ctx.ellipse(0, 0, 8 + bodyBob, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = skinColors[z.variant];
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // Blood stains on clothes
        ctx.fillStyle = 'rgba(153, 27, 27, 0.4)';
        ctx.beginPath();
        ctx.arc(-2, 4, 3, 0, Math.PI * 2);
        ctx.fill();

        // Glowing red eyes
        ctx.fillStyle = '#ef4444';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.arc(4, -2.5, 1.5, 0, Math.PI * 2);
        ctx.arc(4, 2.5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        ctx.restore();
        ctx.save();
        ctx.translate(z.x, z.y);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-15, -28, 30, 3);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-15, -28, (z.health / z.maxHealth) * 30, 3);
        ctx.restore();
      });

      // Squad
      allies.current.forEach(a => {
        ctx.save();
        ctx.translate(a.pos.x, a.pos.y);
        ctx.shadowBlur = 10; ctx.shadowColor = COLORS.ALLY;
        ctx.fillStyle = COLORS.ALLY;
        ctx.beginPath(); ctx.arc(0, 0, ALLY_RADIUS, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(0, -2, 7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // Operator
      ctx.save();
      ctx.translate(playerPos.current.x, playerPos.current.y);
      ctx.shadowBlur = 25; ctx.shadowColor = COLORS.PLAYER;
      ctx.fillStyle = COLORS.PLAYER;
      ctx.beginPath(); ctx.arc(0, 0, PLAYER_RADIUS, 0, Math.PI * 2); ctx.fill();
      if (activePasses.includes('kinetic_shield')) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, PLAYER_RADIUS + 6, 0, Math.PI * 2); ctx.stroke();
      }
      const angle = Math.atan2(mousePos.current.y - playerPos.current.y, mousePos.current.x - playerPos.current.x);
      ctx.rotate(angle);
      ctx.strokeStyle = playerStats.weaponType === 'Railgun' ? COLORS.RAILGUN : COLORS.PLAYER;
      ctx.lineWidth = playerStats.weaponType === 'Railgun' ? 8 : 5;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(38, 0); ctx.stroke();
      ctx.restore();

      ctx.restore();

      // Mission Progress Overlay in Canvas
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(window.innerWidth/2 - 200, window.innerHeight - 50, 400, 10);
      ctx.fillStyle = COLORS.NEON_BLUE;
      ctx.fillRect(window.innerWidth/2 - 200, window.innerHeight - 50, (zombiesKilled.current / requiredKills.current) * 400, 10);
      ctx.font = '10px Orbitron'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(`THREAT NEUTRALIZATION: ${zombiesKilled.current} / ${requiredKills.current}`, window.innerWidth/2, window.innerHeight - 60);

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [level, playerStats, activePasses, onGameOver, onWaveComplete, onUpdateAmmo, onUpdateHealth, squadSize]);

  return (
    <div className="absolute inset-0 z-0 bg-black cursor-crosshair">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default GameEngine;
