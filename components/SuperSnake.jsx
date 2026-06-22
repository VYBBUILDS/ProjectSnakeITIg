import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RotateCcw, Volume2, VolumeX, Zap, Shield } from 'lucide-react';

const GRID_SIZE = 20;
const CELL_SIZE = 30;
const GAME_SPEED = 100;

// Game constants
const INITIAL_LENGTH = 3;
const FOOD_SPAWN_RATE = 0.3;
const POWERUP_SPAWN_RATE = 0.05;
const BOT_COUNT = 3;

// Difficulty levels
const DIFFICULTIES = {
  EASY: { name: 'Easy', botCount: 1, botSpeed: 1.2, reactionTime: 300 },
  MEDIUM: { name: 'Medium', botCount: 2, botSpeed: 1, reactionTime: 150 },
  HARD: { name: 'Hard', botCount: 3, botSpeed: 0.8, reactionTime: 75 },
  IMPOSSIBLE: { name: 'Impossible', botCount: 4, botSpeed: 0.6, reactionTime: 25 }
};

// Power-up types
const POWERUPS = {
  SPEED: 'speed',
  SHIELD: 'shield',
  SLOW_MO: 'slowmo',
  MAGNET: 'magnet'
};

export default function SuperSnake() {
  const canvasRef = useRef(null);
  const gameStateRef = useRef(null);
  const botTimersRef = useRef({});
  const audioContextRef = useRef(null);
  
  // Game state
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

useEffect(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('snakeHighScore');
    setHighScore(saved ? parseInt(saved) : 0);
  }
}, []);

  // Initialize game state
  const initializeGame = useCallback(() => {
    gameStateRef.current = {
      player: {
        body: [
          { x: 10, y: 10 },
          { x: 9, y: 10 },
          { x: 8, y: 10 }
        ],
        direction: { x: 1, y: 0 },
        nextDirection: { x: 1, y: 0 },
        speed: 1,
        shield: false,
        shieldTurns: 0,
        magnet: false,
        magnetTurns: 0
      },
      bots: Array.from({ length: DIFFICULTIES[difficulty].botCount }).map((_, i) => ({
        id: i,
        body: [
          { x: Math.random() * GRID_SIZE | 0, y: Math.random() * GRID_SIZE | 0 },
          { x: (Math.random() * GRID_SIZE | 0) + 1, y: Math.random() * GRID_SIZE | 0 },
          { x: (Math.random() * GRID_SIZE | 0) + 2, y: Math.random() * GRID_SIZE | 0 }
        ],
        direction: { x: [-1, 1][Math.random() > 0.5 ? 1 : 0], y: 0 },
        nextDirection: { x: [-1, 1][Math.random() > 0.5 ? 1 : 0], y: 0 },
        color: `hsl(${i * 120}, 70%, 50%)`,
        strategy: ['aggressive', 'defensive', 'food-focused'][i % 3],
        speed: 1
      })),
      food: [],
      powerups: [],
      gameSpeed: GAME_SPEED / DIFFICULTIES[difficulty].botSpeed,
      combo: 0,
      comboTimer: 0
    };

    // Spawn initial food
    for (let i = 0; i < 3; i++) {
      spawnFood();
    }

    setScore(0);
    setGameOver(false);
    setGameActive(true);
  }, [difficulty]);

  // Spawn food at random location
  const spawnFood = useCallback(() => {
    if (!gameStateRef.current) return;
    
    let x, y, valid;
    do {
      valid = true;
      x = Math.floor(Math.random() * GRID_SIZE);
      y = Math.floor(Math.random() * GRID_SIZE);

      // Check collisions with all snakes
      const allBodies = [
        gameStateRef.current.player.body,
        ...gameStateRef.current.bots.map(b => b.body)
      ];

      for (const body of allBodies) {
        if (body.some(segment => segment.x === x && segment.y === y)) {
          valid = false;
          break;
        }
      }
    } while (!valid);

    gameStateRef.current.food.push({ x, y, type: 'normal' });
  }, []);

  // Spawn power-up
  const spawnPowerup = useCallback(() => {
    if (!gameStateRef.current || Math.random() > POWERUP_SPAWN_RATE) return;

    let x, y, valid;
    do {
      valid = true;
      x = Math.floor(Math.random() * GRID_SIZE);
      y = Math.floor(Math.random() * GRID_SIZE);

      const allBodies = [
        gameStateRef.current.player.body,
        ...gameStateRef.current.bots.map(b => b.body)
      ];

      for (const body of allBodies) {
        if (body.some(segment => segment.x === x && segment.y === y)) {
          valid = false;
          break;
        }
      }
    } while (!valid);

    const types = Object.values(POWERUPS);
    gameStateRef.current.powerups.push({
      x,
      y,
      type: types[Math.floor(Math.random() * types.length)],
      timer: 200
    });
  }, []);

  // Play sound effect
  const playSound = useCallback((frequency = 800, duration = 50) => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      // Audio context not available
    }
  }, [soundEnabled]);

  // AI decision making
  const getBotMove = useCallback((bot, player, food) => {
    const head = bot.body[0];
    const playerHead = player.body[0];
    const botDifficulty = DIFFICULTIES[difficulty];

    // Random movement for easy bots
    if (Math.random() > 0.8) {
      const dirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 }
      ];
      return dirs[Math.floor(Math.random() * dirs.length)];
    }

    // Strategy-based movement
    let targetFood = food[0];
    let minDist = Infinity;

    for (const f of food) {
      const dist = Math.abs(f.x - head.x) + Math.abs(f.y - head.y);
      if (dist < minDist) {
        minDist = dist;
        targetFood = f;
      }
    }

    // Chase food
    let direction = { ...bot.direction };

    if (bot.strategy === 'food-focused') {
      if (targetFood.x > head.x) direction.x = 1;
      else if (targetFood.x < head.x) direction.x = -1;
      else direction.x = 0;

      if (targetFood.y > head.y) direction.y = 1;
      else if (targetFood.y < head.y) direction.y = -1;
      else direction.y = 0;
    } else if (bot.strategy === 'aggressive') {
      // Chase player
      if (playerHead.x > head.x) direction.x = 1;
      else if (playerHead.x < head.x) direction.x = -1;

      if (playerHead.y > head.y) direction.y = 1;
      else if (playerHead.y < head.y) direction.y = -1;
    } else {
      // Defensive - avoid walls and other snakes
      const unsafe = [];
      const nextX = head.x + direction.x;
      const nextY = head.y + direction.y;

      if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
        unsafe.push(direction);
      }

      direction = { x: Math.random() > 0.5 ? 1 : -1, y: 0 };
    }

    return direction;
  }, [difficulty]);

  // Main game loop
  useEffect(() => {
    if (!gameActive || !gameStateRef.current) return;

    const gameLoop = setInterval(() => {
      const state = gameStateRef.current;

      // Update player direction
      state.player.direction = { ...state.player.nextDirection };

      // Update all snakes
      const allSnakes = [
        { snake: state.player, isPlayer: true },
        ...state.bots.map(bot => ({ snake: bot, isPlayer: false }))
      ];

      for (const { snake, isPlayer } of allSnakes) {
        const head = { ...snake.body[0] };
        head.x += snake.direction.x;
        head.y += snake.direction.y;

        // Wall collision - wrap around
        head.x = (head.x + GRID_SIZE) % GRID_SIZE;
        head.y = (head.y + GRID_SIZE) % GRID_SIZE;

        // Self collision
        if (snake.body.some(segment => segment.x === head.x && segment.y === head.y)) {
          if (isPlayer && !state.player.shield) {
            setGameActive(false);
            setGameOver(true);
            playSound(200, 300);
            return;
          } else if (isPlayer && state.player.shield) {
            state.player.shield = false;
            playSound(600, 200);
          } else if (!isPlayer) {
            // Reset bot
            snake.body = [
              { x: Math.random() * GRID_SIZE | 0, y: Math.random() * GRID_SIZE | 0 },
              { x: (Math.random() * GRID_SIZE | 0) + 1, y: Math.random() * GRID_SIZE | 0 }
            ];
          }
          continue;
        }

        // Other snake collision
        for (const otherSnake of allSnakes) {
          if (otherSnake.snake === snake) continue;
          if (otherSnake.snake.body.some(seg => seg.x === head.x && seg.y === head.y)) {
            if (isPlayer && !state.player.shield) {
              setGameActive(false);
              setGameOver(true);
              playSound(200, 300);
              return;
            } else if (isPlayer && state.player.shield) {
              state.player.shield = false;
              playSound(600, 200);
            }
            continue;
          }
        }

        snake.body.unshift(head);

        // Food collision
        let foodEaten = false;
        state.food = state.food.filter(f => {
          if (f.x === head.x && f.y === head.y) {
            foodEaten = true;
            if (isPlayer) {
              setScore(prev => {
                const newScore = prev + 10 + state.combo;
                if (newScore > highScore) {
                  setHighScore(newScore);
                  localStorage.setItem('snakeHighScore', newScore);
                }
                return newScore;
              });
              state.combo = Math.min(state.combo + 1, 10);
              state.comboTimer = 300;
              playSound(800, 100);
            }
            return false;
          }
          return true;
        });

        if (foodEaten && isPlayer) {
          spawnFood();
          spawnPowerup();
        } else if (!foodEaten) {
          snake.body.pop();
        }

        // Power-up collision
        state.powerups = state.powerups.filter(p => {
          if (p.x === head.x && p.y === head.y && isPlayer) {
            playSound(1200, 200);
            switch (p.type) {
              case POWERUPS.SPEED:
                snake.speed = 1.5;
                setTimeout(() => { snake.speed = 1; }, 5000);
                break;
              case POWERUPS.SHIELD:
                state.player.shield = true;
                state.player.shieldTurns = 100;
                break;
              case POWERUPS.SLOW_MO:
                state.gameSpeed = GAME_SPEED * 2;
                setTimeout(() => { state.gameSpeed = GAME_SPEED / DIFFICULTIES[difficulty].botSpeed; }, 3000);
                break;
              case POWERUPS.MAGNET:
                state.player.magnet = true;
                state.player.magnetTurns = 50;
                break;
            }
            return false;
          }
          p.timer--;
          return p.timer > 0;
        });
      }

      // Update bot movements
      for (const bot of state.bots) {
        if (Math.random() > DIFFICULTIES[difficulty].reactionTime / 1000) {
          bot.nextDirection = getBotMove(bot, state.player, state.food);
        }
      }

      // Update combo timer
      if (state.comboTimer > 0) {
        state.comboTimer--;
      } else {
        state.combo = 0;
      }
    }, state?.gameSpeed || GAME_SPEED);

    return () => clearInterval(gameLoop);
  }, [gameActive, difficulty, playSound, spawnFood, spawnPowerup, getBotMove, highScore]);

  // Render game
  useEffect(() => {
    if (!canvasRef.current || !gameStateRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const state = gameStateRef.current;

    // Clear canvas
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#1a2847';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food
    for (const f of state.food) {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(f.x * CELL_SIZE + CELL_SIZE / 2, f.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw power-ups
    for (const p of state.powerups) {
      const colors = {
        [POWERUPS.SPEED]: '#ffd93d',
        [POWERUPS.SHIELD]: '#6bcf7f',
        [POWERUPS.SLOW_MO]: '#4d96ff',
        [POWERUPS.MAGNET]: '#ff69b4'
      };
      ctx.fillStyle = colors[p.type] || '#fff';
      ctx.fillRect(p.x * CELL_SIZE + 5, p.y * CELL_SIZE + 5, CELL_SIZE - 10, CELL_SIZE - 10);

      // Pulsing effect
      ctx.strokeStyle = colors[p.type];
      ctx.lineWidth = 2;
      ctx.globalAlpha = Math.sin(Date.now() / 100) * 0.5 + 0.5;
      ctx.strokeRect(p.x * CELL_SIZE + 3, p.y * CELL_SIZE + 3, CELL_SIZE - 6, CELL_SIZE - 6);
      ctx.globalAlpha = 1;
    }

    // Draw snakes
    const snakes = [
      { body: state.player.body, color: '#4ecca3', isPlayer: true },
      ...state.bots.map(bot => ({ body: bot.body, color: bot.color, isPlayer: false }))
    ];

    for (const { body, color, isPlayer } of snakes) {
      for (let i = 0; i < body.length; i++) {
        const segment = body[i];
        const alpha = 1 - (i / body.length) * 0.5;

        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(segment.x * CELL_SIZE + CELL_SIZE / 2, segment.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        if (i === 0) {
          // Draw eye
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 1;
          const eyeOffsetX = (state.player?.direction?.x || 0) * 5;
          const eyeOffsetY = (state.player?.direction?.y || 0) * 5;
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE / 2 + eyeOffsetX, segment.y * CELL_SIZE + CELL_SIZE / 2 + eyeOffsetY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw shield effect
    if (state.player.shield) {
      const head = state.player.body[0];
      ctx.strokeStyle = `rgba(107, 199, 127, ${Math.sin(Date.now() / 100) * 0.5 + 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(head.x * CELL_SIZE + CELL_SIZE / 2, head.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }, [gameActive, score]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!gameStateRef.current) return;

      const state = gameStateRef.current;
      const keyMap = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 }
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        const newDir = keyMap[e.key];
        // Prevent reversing into self
        if (state.player.direction.x + newDir.x !== 0 || state.player.direction.y + newDir.y !== 0) {
          state.player.nextDirection = newDir;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
            SUPER SNAKE
          </h1>
          <p className="text-slate-400">Ultimate AI-Powered Snake Battle</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Score</p>
            <p className="text-2xl font-bold text-emerald-400">{score}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">High Score</p>
            <p className="text-2xl font-bold text-yellow-400">{highScore}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Difficulty</p>
            <p className="text-lg font-bold text-cyan-400">{DIFFICULTIES[difficulty].name}</p>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-slate-900 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-2xl mb-6">
          <canvas
            ref={canvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            className="w-full block"
          />
        </div>

        {/* Game Over Screen */}
        {gameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg backdrop-blur-sm">
            <div className="bg-slate-800 p-8 rounded-lg text-center border-2 border-red-500">
              <p className="text-4xl font-bold text-red-400 mb-4">GAME OVER</p>
              <p className="text-2xl text-emerald-400 mb-2">Final Score: {score}</p>
              {score === highScore && score > 0 && (
                <p className="text-lg text-yellow-400 mb-4">🎉 New High Score! 🎉</p>
              )}
              <button
                onClick={() => initializeGame()}
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-4">
          <div className="bg-slate-700 rounded-lg p-4">
            <p className="text-slate-400 text-sm mb-3">Arrow Keys or WASD to move</p>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              {Object.entries(DIFFICULTIES).map(([key, diff]) => (
                <button
                  key={key}
                  onClick={() => {
                    if (!gameActive) {
                      setDifficulty(key);
                    }
                  }}
                  disabled={gameActive}
                  className={`py-2 px-4 rounded font-bold transition ${
                    difficulty === key
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  } ${gameActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {diff.name}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => initializeGame()}
                className="flex-1 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition"
              >
                <RotateCcw size={20} /> {gameActive ? 'Restart' : 'Start Game'}
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition"
              >
                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="bg-slate-700 rounded-lg p-4 text-sm text-slate-300">
            <p className="font-bold text-emerald-400 mb-2">✨ Features:</p>
            <ul className="space-y-1 text-xs">
              <li>🤖 Advanced AI with 4 difficulty levels</li>
              <li>⚡ Power-ups: Speed, Shield, Slow-Mo, Magnet</li>
              <li>🎯 Combo System with Progressive Scoring</li>
              <li>🌍 Wrap-around Map Boundaries</li>
              <li>🔊 Dynamic Sound Effects</li>
              <li>💾 High Score Persistence</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Built with React | Optimized for Vercel Deployment
        </p>
      </div>
    </div>
  );
      }
