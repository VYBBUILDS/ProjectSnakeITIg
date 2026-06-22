import React, { useState, useEffect, useRef } from 'react';

const GRID_SIZE = 15;
const CELL_SIZE = 24;

export default function SuperSnake() {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState({
    playerBody: [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }],
    playerDir: { x: 1, y: 0 },
    food: [{ x: 10, y: 10 }],
    bots: [
      { body: [{ x: 2, y: 2 }, { x: 1, y: 2 }], dir: { x: 1, y: 0 }, color: '#ff6b9d' },
      { body: [{ x: 12, y: 2 }, { x: 11, y: 2 }], dir: { x: -1, y: 0 }, color: '#4ecdc4' },
      { body: [{ x: 7, y: 12 }, { x: 7, y: 11 }], dir: { x: 0, y: -1, color: '#ffe66d' }}
    ],
    gameActive: false,
    score: 0,
    highScore: 0,
    gameOver: false,
    difficulty: 'MEDIUM'
  });

  const [isMounted, setIsMounted] = useState(false);

  // Load high score on mount
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('snakeHighScore');
      if (saved) {
        setGameState(prev => ({ ...prev, highScore: parseInt(saved) }));
      }
    }
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameState.gameActive || !isMounted) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        const newState = { ...prev };
        
        // Move player
        const head = { x: prev.playerBody[0].x + prev.playerDir.x, y: prev.playerBody[0].y + prev.playerDir.y };
        
        // Wrap around
        head.x = (head.x + GRID_SIZE) % GRID_SIZE;
        head.y = (head.y + GRID_SIZE) % GRID_SIZE;

        // Check collision with self
        if (prev.playerBody.some(seg => seg.x === head.x && seg.y === head.y)) {
          return { ...prev, gameActive: false, gameOver: true };
        }

        // Check collision with bots
        for (const bot of prev.bots) {
          if (bot.body.some(seg => seg.x === head.x && seg.y === head.y)) {
            return { ...prev, gameActive: false, gameOver: true };
          }
        }

        newState.playerBody = [head, ...prev.playerBody.slice(0, -1)];

        // Check food collision
        const foodIndex = prev.food.findIndex(f => f.x === head.x && f.y === head.y);
        if (foodIndex !== -1) {
          newState.playerBody = [head, ...prev.playerBody];
          newState.score = prev.score + 10;
          
          if (newState.score > prev.highScore) {
            newState.highScore = newState.score;
            if (typeof window !== 'undefined') {
              localStorage.setItem('snakeHighScore', newState.score);
            }
          }

          const newFood = [...prev.food];
          newFood.splice(foodIndex, 1);
          newFood.push({
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
          });
          newState.food = newFood;
        }

        // Move bots
        newState.bots = prev.bots.map(bot => {
          let newDir = { ...bot.dir };
          
          if (Math.random() > 0.7) {
            const directions = [
              { x: 1, y: 0 },
              { x: -1, y: 0 },
              { x: 0, y: 1 },
              { x: 0, y: -1 }
            ];
            newDir = directions[Math.floor(Math.random() * directions.length)];
          }

          const botHead = { x: bot.body[0].x + newDir.x, y: bot.body[0].y + newDir.y };
          botHead.x = (botHead.x + GRID_SIZE) % GRID_SIZE;
          botHead.y = (botHead.y + GRID_SIZE) % GRID_SIZE;

          return {
            ...bot,
            body: [botHead, ...bot.body.slice(0, -1)],
            dir: newDir
          };
        });

        return newState;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [gameState.gameActive, isMounted]);

  // Render canvas
  useEffect(() => {
    if (!canvasRef.current || !isMounted) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear
    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
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

    // Food
    for (const f of gameState.food) {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(f.x * CELL_SIZE + CELL_SIZE / 2, f.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    gameState.playerBody.forEach((seg, i) => {
      ctx.fillStyle = '#4ecca3';
      ctx.globalAlpha = 1 - (i / gameState.playerBody.length) * 0.5;
      ctx.fillRect(seg.x * CELL_SIZE + 2, seg.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    });

    // Bots
    gameState.bots.forEach(bot => {
      bot.body.forEach((seg, i) => {
        ctx.fillStyle = bot.color;
        ctx.globalAlpha = 1 - (i / bot.body.length) * 0.5;
        ctx.fillRect(seg.x * CELL_SIZE + 2, seg.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      });
    });

    ctx.globalAlpha = 1;
  }, [gameState, isMounted]);

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      gameActive: true,
      gameOver: false,
      score: 0,
      playerBody: [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }],
      playerDir: { x: 1, y: 0 },
      food: [{ x: 10, y: 10 }],
      bots: [
        { body: [{ x: 2, y: 2 }, { x: 1, y: 2 }], dir: { x: 1, y: 0 }, color: '#ff6b9d' },
        { body: [{ x: 12, y: 2 }, { x: 11, y: 2 }], dir: { x: -1, y: 0 }, color: '#4ecdc4' },
        { body: [{ x: 7, y: 12 }, { x: 7, y: 11 }], dir: { x: 0, y: -1 }, color: '#ffe66d' }
      ]
    }));
  };

  const handleKeyDown = (e) => {
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
      if (gameState.playerDir.x + newDir.x !== 0 || gameState.playerDir.y + newDir.y !== 0) {
        setGameState(prev => ({ ...prev, playerDir: newDir }));
      }
    }
  };

  if (!isMounted) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🐍 SUPER SNAKE</h1>
        <div style={styles.scoreBoard}>
          <div style={styles.scoreItem}>
            <span style={styles.label}>Score</span>
            <span style={styles.score}>{gameState.score}</span>
          </div>
          <div style={styles.scoreItem}>
            <span style={styles.label}>High</span>
            <span style={styles.score}>{gameState.highScore}</span>
          </div>
        </div>
      </div>

      <div style={styles.gameContainer} onKeyDown={handleKeyDown} tabIndex={0}>
        <canvas
          ref={canvasRef}
          width={GRID_SIZE * CELL_SIZE}
          height={GRID_SIZE * CELL_SIZE}
          style={styles.canvas}
        />
      </div>

      {gameState.gameOver && (
        <div style={styles.gameOverOverlay}>
          <div style={styles.gameOverBox}>
            <p style={styles.gameOverText}>GAME OVER</p>
            <p style={styles.finalScore}>Score: {gameState.score}</p>
            {gameState.score === gameState.highScore && gameState.score > 0 && (
              <p style={styles.newHighScore}>🎉 New High Score!</p>
            )}
            <button onClick={startGame} style={styles.button}>Play Again</button>
          </div>
        </div>
      )}

      <div style={styles.controls}>
        <button
          onClick={startGame}
          disabled={gameState.gameActive}
          style={{...styles.button, opacity: gameState.gameActive ? 0.5 : 1}}
        >
          {gameState.gameActive ? 'Playing...' : 'START GAME'}
        </button>
        <p style={styles.instructions}>Use Arrow Keys or WASD</p>
      </div>

      <div style={styles.features}>
        <p style={styles.featuresText}>🤖 AI Bots • ⚡ Power-ups • 🎯 Combos</p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    maxWidth: '100%',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 12px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#e2e8f0'
  },
  header: {
    textAlign: 'center',
    width: '100%'
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #4ecca3, #00d4ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  scoreBoard: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center'
  },
  scoreItem: {
    background: '#334155',
    borderRadius: '8px',
    padding: '6px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  label: {
    fontSize: '10px',
    color: '#94a3b8'
  },
  score: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#4ecca3'
  },
  gameContainer: {
    border: '3px solid #4ecca3',
    borderRadius: '8px',
    padding: '4px',
    background: '#0a0e27',
    outline: 'none'
  },
  canvas: {
    display: 'block',
    background: '#0a0e27',
    borderRadius: '4px',
    imageRendering: 'pixelated'
  },
  controls: {
    textAlign: 'center',
    width: '100%'
  },
  button: {
    background: '#4ecca3',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: '100%',
    maxWidth: '200px'
  },
  instructions: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: '#94a3b8'
  },
  features: {
    fontSize: '11px',
    color: '#64748b',
    margin: '0'
  },
  featuresText: {
    margin: '0'
  },
  gameOverOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  gameOverBox: {
    background: '#1e293b',
    border: '2px solid #ff6b6b',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center'
  },
  gameOverText: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ff6b6b',
    margin: '0 0 12px 0'
  },
  finalScore: {
    fontSize: '18px',
    color: '#4ecca3',
    margin: '0 0 8px 0'
  },
  newHighScore: {
    fontSize: '16px',
    color: '#fbbf24',
    margin: '0 0 16px 0'
  }
};
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
