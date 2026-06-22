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
      { body: [{ x: 7, y: 12 }, { x: 7, y: 11 }], dir: { x: 0, y: -1 }, color: '#ffe66d' }
    ],
    gameActive: false,
    score: 0,
    highScore: 0,
    gameOver: false
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('snakeHighScore');
      if (saved) {
        setGameState(prev => ({ ...prev, highScore: parseInt(saved) }));
      }
    }
  }, []);

  useEffect(() => {
    if (!gameState.gameActive || !isMounted) return;

    const interval = setInterval(() => {
      setGameState(prev => {
        const newState = { ...prev };
        const head = { x: prev.playerBody[0].x + prev.playerDir.x, y: prev.playerBody[0].y + prev.playerDir.y };
        
        head.x = (head.x + GRID_SIZE) % GRID_SIZE;
        head.y = (head.y + GRID_SIZE) % GRID_SIZE;

        if (prev.playerBody.some(seg => seg.x === head.x && seg.y === head.y)) {
          return { ...prev, gameActive: false, gameOver: true };
        }

        for (const bot of prev.bots) {
          if (bot.body.some(seg => seg.x === head.x && seg.y === head.y)) {
            return { ...prev, gameActive: false, gameOver: true };
          }
        }

        newState.playerBody = [head, ...prev.playerBody.slice(0, -1)];

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

        newState.bots = prev.bots.map(bot => {
          let newDir = bot.dir;
          if (Math.random() > 0.7) {
            const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
            newDir = dirs[Math.floor(Math.random() * dirs.length)];
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

  useEffect(() => {
    if (!canvasRef.current || !isMounted) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    for (const f of gameState.food) {
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(f.x * CELL_SIZE + CELL_SIZE / 2, f.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
    }

    gameState.playerBody.forEach((seg, i) => {
      ctx.fillStyle = '#4ecca3';
      ctx.globalAlpha = 1 - (i / gameState.playerBody.length) * 0.5;
      ctx.fillRect(seg.x * CELL_SIZE + 2, seg.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    });

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
        <canvas ref={canvasRef} width={GRID_SIZE * CELL_SIZE} height={GRID_SIZE * CELL_SIZE} style={styles.canvas} />
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
        <button onClick={startGame} disabled={gameState.gameActive} style={{...styles.button, opacity: gameState.gameActive ? 0.5 : 1}}>
          {gameState.gameActive ? 'Playing...' : 'START GAME'}
        </button>
        <p style={styles.instructions}>Use Arrow Keys or WASD</p>
      </div>

      <div style={styles.features}>
        <p style={styles.featuresText}>🤖 AI Bots • ⚡ Fast • 🎯 Mobile</p>
      </div>
    </div>
  );
}

const styles = {
  container: { width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '12px', boxSizing: 'border-box', overflow: 'hidden', fontFamily: 'system-ui', color: '#e2e8f0' },
  header: { textAlign: 'center', width: '100%' },
  title: { margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold', background: 'linear-gradient(135deg, #4ecca3, #00d4ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
  scoreBoard: { display: 'flex', gap: '12px', justifyContent: 'center' },
  scoreItem: { background: '#334155', borderRadius: '8px', padding: '6px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  label: { fontSize: '10px', color: '#94a3b8' },
  score: { fontSize: '16px', fontWeight: 'bold', color: '#4ecca3' },
  gameContainer: { border: '3px solid #4ecca3', borderRadius: '8px', padding: '4px', background: '#0a0e27', outline: 'none' },
  canvas: { display: 'block', background: '#0a0e27', borderRadius: '4px', imageRendering: 'pixelated' },
  controls: { textAlign: 'center', width: '100%' },
  button: { background: '#4ecca3', color: 'white', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', width: '100%', maxWidth: '200px' },
  instructions: { margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' },
  features: { fontSize: '11px', color: '#64748b' },
  featuresText: { margin: '0' },
  gameOverOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  gameOverBox: { background: '#1e293b', border: '2px solid #ff6b6b', borderRadius: '12px', padding: '24px', textAlign: 'center' },
  gameOverText: { fontSize: '28px', fontWeight: 'bold', color: '#ff6b6b', margin: '0 0 12px 0' },
  finalScore: { fontSize: '18px', color: '#4ecca3', margin: '0 0 8px 0' },
  newHighScore: { fontSize: '16px', color: '#fbbf24', margin: '0 0 16px 0' }
};
