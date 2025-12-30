
import React, { useState, useEffect, useCallback } from 'react';
import { GameState, PlayerStats, Mission, WeaponType } from './types';
import { INITIAL_HEALTH, INITIAL_AMMO, MAX_AMMO, WEAPONS, GAME_PASSES } from './constants';
import GameEngine from './components/GameEngine';
import { generateMission } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    health: INITIAL_HEALTH,
    maxHealth: INITIAL_HEALTH,
    score: 0,
    money: 2000, // Higher starting money for easier tank access
    ammo: MAX_AMMO,
    maxAmmo: MAX_AMMO,
    level: 1,
    isGameOver: false,
    isPlaying: false,
    isPaused: false,
    currentMission: null,
    squadSize: 0,
    ownedWeapons: ['Pistol'],
    activePasses: [],
    hasTank: false,
  });

  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    speed: 4.2,
    damage: WEAPONS.Pistol.damage,
    fireRate: WEAPONS.Pistol.fireRate,
    bulletSpeed: WEAPONS.Pistol.bulletSpeed,
    weaponType: 'Pistol',
  });

  const [isLoadingMission, setIsLoadingMission] = useState(false);
  const [activeTab, setActiveTab] = useState<'mission' | 'shop' | 'passes'>('mission');

  // Passive Health Regen
  useEffect(() => {
    let interval: number;
    if (gameState.isPlaying && gameState.activePasses.includes('regen')) {
      interval = window.setInterval(() => {
        setGameState(prev => ({
          ...prev,
          health: Math.min(prev.maxHealth, prev.health + 1)
        }));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [gameState.isPlaying, gameState.activePasses]);

  const startNewMission = useCallback(async () => {
    setIsLoadingMission(true);
    const mission = await generateMission(gameState.level);
    setGameState(prev => ({
      ...prev,
      currentMission: mission,
      isPlaying: true,
      isGameOver: false,
      health: prev.maxHealth,
      ammo: prev.maxAmmo,
    }));
    setIsLoadingMission(false);
  }, [gameState.level, gameState.maxHealth, gameState.maxAmmo]);

  const handleGameOver = useCallback((finalScore: number) => {
    setGameState(prev => ({
      ...prev,
      isGameOver: true,
      isPlaying: false,
      score: prev.score + finalScore,
    }));
  }, []);

  const handleWaveComplete = useCallback(() => {
    const multiplier = gameState.activePasses.includes('double_credits') ? 1.5 : 1.0;
    setGameState(prev => ({
      ...prev,
      level: prev.level + 1,
      money: Math.floor(prev.money + (prev.currentMission?.reward || 200) * multiplier),
      isPlaying: false,
    }));
  }, [gameState.activePasses]);

  const buyWeapon = (type: WeaponType) => {
    const weapon = WEAPONS[type];
    if (gameState.money >= weapon.cost && !gameState.ownedWeapons.includes(type)) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - weapon.cost,
        ownedWeapons: [...prev.ownedWeapons, type]
      }));
    }
  };

  const equipWeapon = (type: WeaponType) => {
    if (gameState.ownedWeapons.includes(type)) {
      const weapon = WEAPONS[type];
      const overdrive = gameState.activePasses.includes('overdrive') ? 1.3 : 1.0;
      setPlayerStats(prev => ({
        ...prev,
        weaponType: type,
        damage: weapon.damage * overdrive,
        fireRate: weapon.fireRate,
        bulletSpeed: weapon.bulletSpeed,
      }));
    }
  };

  const buyPass = (id: string) => {
    const pass = GAME_PASSES.find(p => p.id === id);
    if (pass && gameState.money >= pass.cost && !gameState.activePasses.includes(id)) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - pass.cost,
        activePasses: [...prev.activePasses, id],
        hasTank: id === 'tank_support' ? true : prev.hasTank
      }));
      if (id === 'overdrive') {
        setPlayerStats(prev => ({
          ...prev,
          speed: prev.speed * 1.3,
          damage: prev.damage * 1.3
        }));
      }
    }
  };

  const hireMercenary = () => {
    const cost = (gameState.squadSize + 1) * 1000;
    if (gameState.money >= cost && gameState.squadSize < 4) {
      setGameState(prev => ({
        ...prev,
        money: prev.money - cost,
        squadSize: prev.squadSize + 1
      }));
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden flex flex-col items-center justify-center font-inter select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 bg-gradient-to-tr from-blue-950/20 via-black to-red-950/10"></div>
      <div className="scanline z-10 opacity-20"></div>

      {gameState.isPlaying && (
        <GameEngine
          playerStats={playerStats}
          level={gameState.level}
          squadSize={gameState.squadSize}
          activePasses={gameState.activePasses}
          hasTank={gameState.hasTank}
          onGameOver={handleGameOver}
          onWaveComplete={handleWaveComplete}
          onUpdateAmmo={(ammo) => setGameState(prev => ({ ...prev, ammo }))}
          onUpdateHealth={(health) => setGameState(prev => ({ ...prev, health }))}
        />
      )}

      {/* Persistent HUD during gameplay */}
      {gameState.isPlaying && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col p-8">
          <div className="flex justify-between items-start w-full animate-in fade-in slide-in-from-top duration-700">
            <div className="space-y-4">
              <div className="bg-black/60 backdrop-blur-xl border border-blue-500/30 p-4 rounded-xl shadow-2xl pointer-events-auto">
                <p className="text-[10px] uppercase text-blue-400 font-bold tracking-[0.2em] mb-1">Sector Progress</p>
                <p className="text-2xl font-orbitron text-white leading-none uppercase">NEXUS-{gameState.level}</p>
              </div>

              <div className="bg-black/60 backdrop-blur-xl border border-red-500/30 p-4 rounded-xl shadow-2xl pointer-events-auto w-72">
                <div className="flex justify-between items-end mb-2">
                  <p className="text-[10px] uppercase text-red-400 font-bold">Structural Integrity</p>
                  <p className="text-sm font-orbitron text-white">{Math.ceil(gameState.health)}%</p>
                </div>
                <div className="w-full h-2.5 bg-red-950/40 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300 rounded-full"
                    style={{ width: `${(gameState.health / gameState.maxHealth) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="space-y-4 items-end flex flex-col">
              <div className="bg-black/60 backdrop-blur-xl border border-yellow-500/30 p-4 rounded-xl shadow-2xl pointer-events-auto text-right min-w-[180px]">
                <p className="text-[10px] uppercase text-yellow-500 font-bold tracking-widest">Neural Credits</p>
                <p className="text-3xl font-orbitron text-white">${gameState.money}</p>
              </div>
              <div className="bg-black/60 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-xl shadow-2xl pointer-events-auto text-right min-w-[180px]">
                <p className="text-[10px] uppercase text-emerald-500 font-bold tracking-widest">Charge Status</p>
                <p className="text-2xl font-orbitron text-white">{gameState.ammo} / {gameState.maxAmmo}</p>
                <p className="text-[9px] font-orbitron text-emerald-400/80 mt-1 uppercase">{playerStats.weaponType}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Menu / Shop / Passes / Squad Screens */}
      {!gameState.isPlaying && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#020617]/95 backdrop-blur-2xl p-6 md:p-12 overflow-y-auto animate-in fade-in duration-500">
          <div className="max-w-7xl w-full flex flex-col space-y-8">
            {/* Header Branding */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/5 pb-8">
              <div className="text-left">
                <h1 className="text-7xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-white to-red-500 tracking-tighter leading-none mb-3">
                  ZOMBIE NEXUS
                </h1>
                <p className="text-blue-400/50 font-orbitron text-xs tracking-[0.5em] uppercase">Advanced Tactical Purge Protocol</p>
              </div>
              <div className="flex items-center space-x-6 mt-6 md:mt-0">
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Wallet Balance</p>
                  <p className="text-3xl font-orbitron text-emerald-400">${gameState.money}</p>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-4 border-b border-white/10">
              {(['mission', 'shop', 'passes'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-4 font-orbitron text-sm tracking-[0.2em] transition-all uppercase relative ${
                    activeTab === tab ? 'text-blue-400' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>}
                </button>
              ))}
            </div>

            {/* Dynamic Content */}
            <div className="min-h-[500px]">
              {activeTab === 'mission' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-500">
                  {/* Left: Mission Board */}
                  <div className="lg:col-span-2 flex flex-col space-y-6">
                    {gameState.isGameOver ? (
                      <div className="bg-red-500/10 border border-red-500/30 p-10 rounded-3xl space-y-6 text-center shadow-2xl">
                        <h2 className="text-5xl font-orbitron text-red-500 animate-pulse">KIA DETECTED</h2>
                        <p className="text-gray-400 text-sm">Vital signs flatlined in Tier {gameState.level}. Nexus stability compromised.</p>
                        <button onClick={() => window.location.reload()} className="px-12 py-4 border-2 border-red-500/50 hover:bg-red-500/10 text-red-500 font-orbitron rounded-2xl tracking-widest transition-all">REBOOT SYSTEM</button>
                      </div>
                    ) : (
                      <div className="bg-blue-500/5 border border-blue-500/20 p-10 rounded-3xl flex flex-col justify-between h-full relative overflow-hidden group">
                        <div className="relative z-10 space-y-6">
                          <div className="flex justify-between items-center">
                            <h2 className="text-3xl font-orbitron text-blue-400">READY ROOM</h2>
                            <span className="px-4 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full tracking-widest">NETWORK LINK: ACTIVE</span>
                          </div>
                          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
                            Intelligence reports massive biological clusters in Tier {gameState.level}. Deployment is mandatory to preserve Nexus core stability. Equip high-yield ordinance.
                          </p>
                          <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/5">
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Target Zone</p>
                              <p className="text-xl font-orbitron text-white">NEXUS ALPHA-{gameState.level}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Primary Tool</p>
                              <p className="text-xl font-orbitron text-blue-400 uppercase">{playerStats.weaponType}</p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={startNewMission}
                          disabled={isLoadingMission}
                          className="relative z-10 mt-8 w-full py-6 bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white font-orbitron tracking-[0.4em] rounded-2xl transition-all shadow-[0_20px_40px_rgba(37,99,235,0.4)] hover:-translate-y-1 active:scale-95 text-xl disabled:opacity-50"
                        >
                          {isLoadingMission ? 'INITIALIZING...' : 'DEPLOY SQUAD'}
                        </button>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/20 transition-all duration-1000"></div>
                      </div>
                    )}
                  </div>

                  {/* Right: Squad Management */}
                  <div className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl flex flex-col space-y-8">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-orbitron text-emerald-400 tracking-widest">SQUAD HUB</h2>
                      <p className="text-sm font-orbitron text-white">{gameState.squadSize}/4 UNITS</p>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="p-6 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-4">
                        <p className="text-xs text-gray-400 leading-relaxed italic uppercase tracking-tighter">AI Mercenaries provide covering fire and defensive patterns. Critical for high-tier survival.</p>
                        <button
                          disabled={gameState.squadSize >= 4 || gameState.money < (gameState.squadSize + 1) * 1000}
                          onClick={hireMercenary}
                          className="w-full py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-xl font-orbitron tracking-widest transition-all disabled:opacity-10 text-xs"
                        >
                          {gameState.squadSize >= 4 ? 'FULL SQUAD' : `HIRE MERC ($${(gameState.squadSize + 1) * 1000})`}
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className={`h-16 rounded-lg border flex items-center justify-center transition-all ${i < gameState.squadSize ? 'bg-emerald-500/20 border-emerald-500/50 shadow-glow' : 'bg-white/5 border-white/10 opacity-30'}`}>
                            {i < gameState.squadSize ? <span className="text-xl">🤖</span> : <span className="text-xl">🔒</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'shop' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-bottom duration-500">
                  {Object.values(WEAPONS).map(weapon => (
                    <div 
                      key={weapon.type} 
                      className={`relative p-8 rounded-3xl border flex flex-col justify-between transition-all group ${
                        playerStats.weaponType === weapon.type 
                        ? 'bg-blue-500/10 border-blue-500/50 ring-2 ring-blue-500/20 shadow-2xl' 
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <h3 className="font-orbitron text-xl text-white tracking-widest uppercase">{weapon.name}</h3>
                          <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor]`} style={{ color: weapon.color, backgroundColor: weapon.color }}></div>
                        </div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold border-l-2 border-white/10 pl-3 leading-relaxed">{weapon.description}</p>
                        <div className="space-y-2 py-4">
                          <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Damage</span><span className="text-white">{weapon.damage}</span></div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(weapon.damage/200)*100}%` }}></div></div>
                          <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>Fire Rate</span><span className="text-white">{(1000/weapon.fireRate).toFixed(1)}/s</span></div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${(1 - weapon.fireRate/1000)*100}%` }}></div></div>
                        </div>
                      </div>
                      
                      <div className="mt-8">
                        {gameState.ownedWeapons.includes(weapon.type) ? (
                          <button 
                            onClick={() => equipWeapon(weapon.type)}
                            disabled={playerStats.weaponType === weapon.type}
                            className={`w-full py-4 rounded-xl font-orbitron tracking-widest text-[10px] transition-all uppercase ${
                              playerStats.weaponType === weapon.type 
                              ? 'bg-blue-500/20 text-blue-400 cursor-default opacity-50' 
                              : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                          >
                            {playerStats.weaponType === weapon.type ? 'Active Weapon' : 'Equip Gear'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => buyWeapon(weapon.type)}
                            disabled={gameState.money < weapon.cost}
                            className="w-full py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-xl font-orbitron tracking-widest text-[10px] transition-all uppercase disabled:opacity-20"
                          >
                            Purchase [${weapon.cost}]
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'passes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom duration-500">
                  {GAME_PASSES.map(pass => (
                    <button
                      key={pass.id}
                      onClick={() => buyPass(pass.id)}
                      disabled={gameState.activePasses.includes(pass.id) || gameState.money < pass.cost}
                      className={`p-8 rounded-3xl border flex items-center space-x-8 text-left transition-all group relative overflow-hidden ${
                        gameState.activePasses.includes(pass.id)
                        ? 'bg-purple-500/10 border-purple-500/30 ring-1 ring-purple-500/20'
                        : 'bg-white/[0.03] border-white/10 hover:border-white/20 active:scale-[0.98]'
                      }`}
                    >
                      <div className="relative z-10 w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
                        {pass.icon}
                      </div>
                      <div className="relative z-10 flex-1 space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="font-orbitron text-xl text-white tracking-widest uppercase">{pass.name}</h3>
                          <span className={`text-[8px] font-bold px-3 py-1 rounded-full border uppercase tracking-[0.2em] ${
                            pass.rarity === 'Legendary' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 
                            pass.rarity === 'Epic' ? 'border-purple-500 text-purple-500 bg-purple-500/10' : 
                            'border-blue-500 text-blue-500 bg-blue-500/10'
                          }`}>
                            {pass.rarity}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed uppercase tracking-tighter">{pass.description}</p>
                        <div className="flex items-center justify-between pt-4">
                          {gameState.activePasses.includes(pass.id) ? (
                            <span className="text-[10px] font-orbitron text-purple-400 tracking-widest">ACTIVE PROTOCOL</span>
                          ) : (
                            <span className="text-[10px] font-orbitron text-emerald-400 tracking-widest">BUY NOW: ${pass.cost}</span>
                          )}
                        </div>
                      </div>
                      <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] pointer-events-none transition-all duration-700 ${
                         gameState.activePasses.includes(pass.id) ? 'bg-purple-500/20' : 'bg-blue-500/0 group-hover:bg-blue-500/5'
                      }`}></div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Controls Info (Bottom) */}
            <div className="flex justify-center pt-8 border-t border-white/5">
              <div className="flex space-x-12">
                {[
                  { k: 'WASD', d: 'Move Unit' },
                  { k: 'MOUSE', d: 'Aim Neural' },
                  { k: 'L-CLICK', d: 'Engage Hostile' },
                  { k: 'SPACE', d: 'Force Reload' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-3 group">
                    <span className="px-3 py-1.5 bg-white/10 rounded-lg font-orbitron text-[10px] text-white border border-white/10 group-hover:border-blue-500/50 transition-colors">{item.k}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{item.d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
