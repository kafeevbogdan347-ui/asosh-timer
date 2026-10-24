import React, { useState, useEffect, useRef } from 'react';
import { LanguageType, SoundProfileType } from '../types';
import { playSound, doVibro } from '../utils/audio';
import {
  Play,
  RotateCcw,
  Trophy,
  Swords,
  Brain,
  Zap,
  Grid,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  Flame,
  CheckCircle,
  XCircle,
  Atom,
  FlaskConical,
  Dna,
  Calculator,
  BookOpen,
  Compass,
  Globe,
  Star,
  Shield,
  Gamepad2,
  Apple,
  Timer,
  Clock,
  Send,
  Plane,
  Rocket,
} from 'lucide-react';
import { FriendGamePromo } from '../components/FriendGamePromo';

interface GamesScreenProps {
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
  onUnlockAchievement?: (id: string) => void;
}

type ActiveGameId =
  | 'snake'
  | 'duel'
  | 'math'
  | 'tictactoe'
  | 'memory'
  | 'reaction'
  | 'flappy'
  | 'plane'
  | 'detective';

export const GamesScreen: React.FC<GamesScreenProps> = ({
  lang,
  soundProfile,
  vibro,
  onShowToast,
  onUnlockAchievement,
}) => {
  const [activeGame, setActiveGame] = useState<ActiveGameId>('snake');

  // ==========================================
  // 1. SNAKE STATE & LOGIC
  // ==========================================
  const snakeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snakePlaying, setSnakePlaying] = useState(false);
  const [snakeScore, setSnakeScore] = useState(0);
  const [snakeHighScore, setSnakeHighScore] = useState(() => {
    return Number(localStorage.getItem('asosh_snake_highscore') || '0');
  });
  const [snakeSpeed, setSnakeSpeed] = useState<'slow' | 'normal' | 'turbo'>('normal');

  const snakeRef = useRef<{ x: number; y: number }[]>([{ x: 10, y: 10 }]);
  const foodRef = useRef<{ x: number; y: number; isGold?: boolean }>({ x: 15, y: 15, isGold: false });
  const dirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });
  const snakeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const spawnSnakeFood = (tc: number) => {
    const isGold = Math.random() < 0.25;
    foodRef.current = {
      x: Math.floor(Math.random() * tc),
      y: Math.floor(Math.random() * tc),
      isGold,
    };
  };

  const getSpeedInterval = () => {
    if (snakeSpeed === 'turbo') return 80;
    if (snakeSpeed === 'slow') return 160;
    return 115;
  };

  const startSnake = () => {
    snakeRef.current = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    dirRef.current = { x: 1, y: 0 };
    setSnakeScore(0);
    setSnakePlaying(true);
    spawnSnakeFood(20);
    playSound('click', soundProfile);

    if (snakeIntervalRef.current) clearInterval(snakeIntervalRef.current);
    snakeIntervalRef.current = setInterval(updateSnakeLoop, getSpeedInterval());
  };

  const stopSnake = () => {
    setSnakePlaying(false);
    if (snakeIntervalRef.current) clearInterval(snakeIntervalRef.current);
  };

  const changeSnakeDir = (x: number, y: number) => {
    if (dirRef.current.x === -x && dirRef.current.y === -y) return;
    dirRef.current = { x, y };
    doVibro(vibro, 8);
  };

  const updateSnakeLoop = () => {
    const cv = snakeCanvasRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    if (!cx) return;

    const gs = 12;
    const tc = Math.floor(cv.width / gs);

    const head = {
      x: snakeRef.current[0].x + dirRef.current.x,
      y: snakeRef.current[0].y + dirRef.current.y,
    };

    // Collision with wall or self
    if (
      head.x < 0 ||
      head.x >= tc ||
      head.y < 0 ||
      head.y >= tc ||
      snakeRef.current.some((s) => s.x === head.x && s.y === head.y)
    ) {
      stopSnake();
      playSound('gameover', soundProfile);
      doVibro(vibro, 60);
      onShowToast('Змейка врезалась! 💀 Попробуй еще раз.');
      return;
    }

    snakeRef.current.unshift(head);

    // Food collision
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      const addedPoints = foodRef.current.isGold ? 5 : 1;
      setSnakeScore((prev) => {
        const next = prev + addedPoints;
        if (next > snakeHighScore) {
          setSnakeHighScore(next);
          localStorage.setItem('asosh_snake_highscore', String(next));
        }
        // Внутри setState нельзя обновлять App — откладываем
        if (next >= 20) setTimeout(() => onUnlockAchievement?.('snake_master'), 0);
        return next;
      });

      if (foodRef.current.isGold) {
        playSound('star', soundProfile);
        onShowToast('⭐ Золотая звезда: +5 очков!');
      } else {
        playSound('coin', soundProfile);
      }
      doVibro(vibro, 15);
      spawnSnakeFood(tc);
    } else {
      snakeRef.current.pop();
    }

    // Render Canvas
    cx.fillStyle = '#060d1f';
    cx.fillRect(0, 0, cv.width, cv.height);

    // Grid lines
    cx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = 0; i < cv.width; i += gs) {
      cx.beginPath();
      cx.moveTo(i, 0);
      cx.lineTo(i, cv.height);
      cx.stroke();
    }

    // Draw Food
    if (foodRef.current.isGold) {
      cx.fillStyle = '#ffb703';
      cx.shadowColor = '#fb8500';
      cx.shadowBlur = 10;
      cx.beginPath();
      cx.arc(
        foodRef.current.x * gs + gs / 2,
        foodRef.current.y * gs + gs / 2,
        gs / 2 - 1,
        0,
        Math.PI * 2
      );
      cx.fill();
      cx.shadowBlur = 0;
    } else {
      cx.fillStyle = '#00f0ff';
      cx.shadowColor = '#00f0ff';
      cx.shadowBlur = 6;
      cx.fillRect(foodRef.current.x * gs + 1, foodRef.current.y * gs + 1, gs - 2, gs - 2);
      cx.shadowBlur = 0;
    }

    // Draw Snake
    snakeRef.current.forEach((p, idx) => {
      if (idx === 0) {
        cx.fillStyle = '#ffffff';
        cx.shadowColor = '#ffffff';
        cx.shadowBlur = 8;
      } else {
        cx.fillStyle = '#38bdf8';
        cx.shadowBlur = 0;
      }
      cx.fillRect(p.x * gs + 1, p.y * gs + 1, gs - 2, gs - 2);
    });
    cx.shadowBlur = 0;
  };

  // Keyboard controls for Snake
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeGame !== 'snake') return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) changeSnakeDir(0, -1);
      else if (['ArrowDown', 'KeyS'].includes(e.code)) changeSnakeDir(0, 1);
      else if (['ArrowLeft', 'KeyA'].includes(e.code)) changeSnakeDir(-1, 0);
      else if (['ArrowRight', 'KeyD'].includes(e.code)) changeSnakeDir(1, 0);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (snakeIntervalRef.current) clearInterval(snakeIntervalRef.current);
    };
  }, [activeGame]);

  // ==========================================
  // 2. DUEL ON DESK STATE & LOGIC
  // ==========================================
  const [duelState, setDuelState] = useState<'idle' | 'waiting' | 'ready' | 'finished'>('idle');
  const [duelStatusText, setDuelStatusText] = useState('Нажмите СТАРТ!');
  const [duelScore, setDuelScore] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });
  const [duelRoundWinner, setDuelRoundWinner] = useState<number | null>(null);
  const duelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startDuel = () => {
    setDuelState('waiting');
    setDuelRoundWinner(null);
    setDuelStatusText('Приготовьтесь... Ждите зеленый сигнал 🚦');
    playSound('click', soundProfile);

    if (duelTimeoutRef.current) clearTimeout(duelTimeoutRef.current);
    const delay = 1600 + Math.random() * 2800;

    duelTimeoutRef.current = setTimeout(() => {
      setDuelState('ready');
      setDuelStatusText('⚡ ЖМИ СЕЙЧАС! ⚡');
      playSound('bell', soundProfile);
    }, delay);
  };

  const tapDuelPlayer = (playerNum: number) => {
    if (duelState === 'waiting') {
      // False start
      setDuelState('finished');
      const other = playerNum === 1 ? 2 : 1;
      setDuelScore((prev) => ({
        ...prev,
        [other === 1 ? 'p1' : 'p2']: prev[other === 1 ? 'p1' : 'p2'] + 1,
      }));
      setDuelStatusText(`🚫 Фальстарт Игрока ${playerNum}! Очко уходит Игроку ${other}.`);
      playSound('buzzer', soundProfile);
      doVibro(vibro, 40);
      if (duelTimeoutRef.current) clearTimeout(duelTimeoutRef.current);
    } else if (duelState === 'ready') {
      // Valid tap winner
      setDuelState('finished');
      setDuelRoundWinner(playerNum);
      const nextP1 = playerNum === 1 ? duelScore.p1 + 1 : duelScore.p1;
      const nextP2 = playerNum === 2 ? duelScore.p2 + 1 : duelScore.p2;
      setDuelScore({ p1: nextP1, p2: nextP2 });

      if (nextP1 >= 3 || nextP2 >= 3) {
        setDuelStatusText(`🏆 ИГРОК ${playerNum} ПОБЕДИЛ В МАТЧЕ!`);
        playSound('victory', soundProfile);
        onUnlockAchievement?.('duel_champ');
      } else {
        setDuelStatusText(`⚡ Раунд за Игроком ${playerNum}!`);
        playSound('coin', soundProfile);
      }
      doVibro(vibro, 50);
    }
  };

  const resetDuelMatch = () => {
    setDuelScore({ p1: 0, p2: 0 });
    setDuelState('idle');
    setDuelStatusText('Новый матч: до 3 побед!');
    playSound('click', soundProfile);
  };

  // ==========================================
  // 3. SPEED MATH SPRINT LOGIC
  // ==========================================
  const [mathPlaying, setMathPlaying] = useState(false);
  const [mathTimeLeft, setMathTimeLeft] = useState(45);
  const [mathScore, setMathScore] = useState(0);
  const [mathStreak, setMathStreak] = useState(0);
  const [mathBestScore, setMathBestScore] = useState(() => {
    return Number(localStorage.getItem('asosh_math_highscore') || '0');
  });
  const [mathProblem, setMathProblem] = useState<{ text: string; answer: number; options: number[] }>({
    text: '12 + 15',
    answer: 27,
    options: [25, 27, 28, 30],
  });

  const generateMathProblem = () => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = 0;
    let b = 0;
    let ans = 0;

    if (op === '+') {
      a = Math.floor(Math.random() * 45) + 5;
      b = Math.floor(Math.random() * 45) + 5;
      ans = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 50) + 20;
      b = Math.floor(Math.random() * a);
      ans = a - b;
    } else {
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      ans = a * b;
    }

    const wrongSet = new Set<number>();
    while (wrongSet.size < 3) {
      const delta = (Math.random() < 0.5 ? -1 : 1) * (Math.floor(Math.random() * 8) + 1);
      const wrong = ans + delta;
      if (wrong !== ans && wrong >= 0) wrongSet.add(wrong);
    }

    const options = [ans, ...Array.from(wrongSet)].sort(() => Math.random() - 0.5);
    return { text: `${a} ${op === '*' ? '×' : op} ${b}`, answer: ans, options };
  };

  const startMathGame = () => {
    setMathScore(0);
    setMathStreak(0);
    setMathTimeLeft(45);
    setMathPlaying(true);
    setMathProblem(generateMathProblem());
    playSound('coin', soundProfile);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (mathPlaying && mathTimeLeft > 0) {
      timer = setInterval(() => {
        setMathTimeLeft((t) => {
          if (t <= 1) {
            setMathPlaying(false);
            playSound('gameover', soundProfile);
            onShowToast('Время вышло! Отличный счет!');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mathPlaying, mathTimeLeft]);

  const handleAnswerMath = (selected: number) => {
    if (!mathPlaying) return;
    if (selected === mathProblem.answer) {
      const nextStreak = mathStreak + 1;
      setMathStreak(nextStreak);
      const bonus = nextStreak >= 5 ? 3 : nextStreak >= 3 ? 2 : 1;
      const nextScore = mathScore + bonus;
      setMathScore(nextScore);

      if (nextScore > mathBestScore) {
        setMathBestScore(nextScore);
        localStorage.setItem('asosh_math_highscore', String(nextScore));
      }
      if (nextScore >= 15) {
        onUnlockAchievement?.('math_genius');
      }

      playSound('combo', soundProfile);
      doVibro(vibro, 10);
      setMathProblem(generateMathProblem());
    } else {
      setMathStreak(0);
      playSound('buzzer', soundProfile);
      doVibro(vibro, 35);
      onShowToast(`Ошибка! Правильно было: ${mathProblem.answer}`);
      setMathProblem(generateMathProblem());
    }
  };

  // ==========================================
  // 4. TIC-TAC-TOE PRO STATE & LOGIC
  // ==========================================
  const [tttBoard, setTttBoard] = useState<string[]>(Array(9).fill(''));
  const [tttTurn, setTttTurn] = useState<'X' | 'O'>('X');
  const [tttMode, setTttMode] = useState<'pvp' | 'ai'>('ai');
  const [tttWinner, setTttWinner] = useState<string | null>(null);
  const [tttScore, setTttScore] = useState<{ x: number; o: number; draws: number }>({ x: 0, o: 0, draws: 0 });

  const checkWinner = (b: string[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, c, d] of lines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    if (b.every((cell) => cell !== '')) return 'draw';
    return null;
  };

  const handleCellClick = (idx: number) => {
    if (tttBoard[idx] !== '' || tttWinner) return;

    const next = [...tttBoard];
    next[idx] = tttTurn;
    setTttBoard(next);
    playSound('flip', soundProfile);
    doVibro(vibro, 10);

    const win = checkWinner(next);
    if (win) {
      handleTttEnd(win);
      return;
    }

    if (tttMode === 'ai' && tttTurn === 'X') {
      setTttTurn('O');
      setTimeout(() => {
        makeAiMove(next);
      }, 350);
    } else {
      setTttTurn(tttTurn === 'X' ? 'O' : 'X');
    }
  };

  const makeAiMove = (b: string[]) => {
    // 1. Try to win
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const copy = [...b];
        copy[i] = 'O';
        if (checkWinner(copy) === 'O') {
          finalizeAiMove(copy, i);
          return;
        }
      }
    }
    // 2. Block player X
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const copy = [...b];
        copy[i] = 'X';
        if (checkWinner(copy) === 'X') {
          copy[i] = 'O';
          finalizeAiMove(copy, i);
          return;
        }
      }
    }
    // 3. Take Center
    if (!b[4]) {
      const copy = [...b];
      copy[4] = 'O';
      finalizeAiMove(copy, 4);
      return;
    }
    // 4. Random available
    const available = b.map((val, idx) => (val === '' ? idx : null)).filter((v) => v !== null) as number[];
    if (available.length > 0) {
      const pick = available[Math.floor(Math.random() * available.length)];
      const copy = [...b];
      copy[pick] = 'O';
      finalizeAiMove(copy, pick);
    }
  };

  const finalizeAiMove = (board: string[], idx: number) => {
    setTttBoard(board);
    playSound('flip', soundProfile);
    const win = checkWinner(board);
    if (win) {
      handleTttEnd(win);
    } else {
      setTttTurn('X');
    }
  };

  const handleTttEnd = (winner: string) => {
    setTttWinner(winner);
    if (winner === 'draw') {
      setTttScore((prev) => ({ ...prev, draws: prev.draws + 1 }));
      onShowToast('Ничья! 🤝');
      playSound('settings', soundProfile);
    } else {
      setTttScore((prev) => ({
        ...prev,
        [winner === 'X' ? 'x' : 'o']: prev[winner === 'X' ? 'x' : 'o'] + 1,
      }));
      playSound('victory', soundProfile);
      onShowToast(`Победил ${winner}! 🎉`);
      if (winner === 'X') onUnlockAchievement?.('tictactoe_win');
    }
  };

  const resetTttBoard = () => {
    setTttBoard(Array(9).fill(''));
    setTttTurn('X');
    setTttWinner(null);
    playSound('click', soundProfile);
  };

  // ==========================================
  // 5. MEMORY MATCH CARDS STATE & LOGIC (REVAMPED v10.7)
  // ==========================================
  interface MemoryCardItem {
    id: number;
    key: string;
    label: string;
    emoji: string;
    color: string;
    iconType: 'atom' | 'flask' | 'dna' | 'calc' | 'book' | 'compass' | 'globe' | 'trophy' | 'pizza' | 'apple' | 'gamepad' | 'swords' | 'shield' | 'zap' | 'flame' | 'star';
    flipped: boolean;
    matched: boolean;
  }

  type MemoryCategory = 'science' | 'canteen' | 'gaming';

  const [memoryCategory, setMemoryCategory] = useState<MemoryCategory>('science');
  const [memoryCards, setMemoryCards] = useState<MemoryCardItem[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryCompleted, setMemoryCompleted] = useState(false);
  const [memoryTimerSec, setMemoryTimerSec] = useState(0);
  const [memoryTimerRunning, setMemoryTimerRunning] = useState(false);
  const [memoryBestMoves, setMemoryBestMoves] = useState<number>(() => {
    return Number(localStorage.getItem('asosh_memory_best_moves') || '0');
  });

  const memoryDecks: Record<MemoryCategory, Omit<MemoryCardItem, 'id' | 'flipped' | 'matched'>[]> = {
    science: [
      { key: 'atom', label: 'Физика', emoji: '⚛️', color: '#38bdf8', iconType: 'atom' },
      { key: 'flask', label: 'Химия', emoji: '🧪', color: '#c084fc', iconType: 'flask' },
      { key: 'dna', label: 'Биология', emoji: '🧬', color: '#4ade80', iconType: 'dna' },
      { key: 'calc', label: 'Алгебра', emoji: '🧮', color: '#facc15', iconType: 'calc' },
      { key: 'book', label: 'Литература', emoji: '📚', color: '#fb7185', iconType: 'book' },
      { key: 'compass', label: 'Геометрия', emoji: '📐', color: '#34d399', iconType: 'compass' },
      { key: 'globe', label: 'География', emoji: '🌍', color: '#60a5fa', iconType: 'globe' },
      { key: 'trophy', label: 'Олимпиада', emoji: '🏆', color: '#fbbf24', iconType: 'trophy' },
    ],
    canteen: [
      { key: 'pizza', label: 'Пицца', emoji: '🍕', color: '#f97316', iconType: 'pizza' },
      { key: 'apple', label: 'Яблоко', emoji: '🍎', color: '#ef4444', iconType: 'apple' },
      { key: 'flame', label: 'Сосиска', emoji: '🌭', color: '#ea580c', iconType: 'flame' },
      { key: 'star', label: 'Выпечка', emoji: '🥐', color: '#fbbf24', iconType: 'star' },
      { key: 'trophy', label: 'Обед 5★', emoji: '🍱', color: '#10b981', iconType: 'trophy' },
      { key: 'zap', label: 'Шоколад', emoji: '🍫', color: '#a16207', iconType: 'zap' },
      { key: 'calc', label: 'Буфет', emoji: '🧃', color: '#38bdf8', iconType: 'calc' },
      { key: 'book', label: 'Чек меню', emoji: '🧾', color: '#ec4899', iconType: 'book' },
    ],
    gaming: [
      { key: 'gamepad', label: 'Геймпад', emoji: '🎮', color: '#a855f7', iconType: 'gamepad' },
      { key: 'swords', label: 'Дуэль', emoji: '⚔️', color: '#ef4444', iconType: 'swords' },
      { key: 'shield', label: 'Щит', emoji: '🛡️', color: '#3b82f6', iconType: 'shield' },
      { key: 'zap', label: 'Молния', emoji: '⚡', color: '#facc15', iconType: 'zap' },
      { key: 'star', label: 'Звезда', emoji: '⭐', color: '#fbbf24', iconType: 'star' },
      { key: 'flame', label: 'Огонь', emoji: '🔥', color: '#f97316', iconType: 'flame' },
      { key: 'trophy', label: 'Победа', emoji: '🏆', color: '#10b981', iconType: 'trophy' },
      { key: 'atom', label: 'Кристалл', emoji: '💎', color: '#06b6d4', iconType: 'atom' },
    ],
  };

  const initMemoryGame = (cat: MemoryCategory = memoryCategory) => {
    const rawDeck = memoryDecks[cat];
    const fullDeck = [...rawDeck, ...rawDeck]
      .sort(() => Math.random() - 0.5)
      .map((item, idx) => ({
        ...item,
        id: idx,
        flipped: false,
        matched: false,
      }));

    setMemoryCards(fullDeck);
    setFlippedIndices([]);
    setMemoryMoves(0);
    setMemoryCompleted(false);
    setMemoryTimerSec(0);
    setMemoryTimerRunning(false);
    playSound('click', soundProfile);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (memoryTimerRunning && !memoryCompleted) {
      timer = setInterval(() => {
        setMemoryTimerSec((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [memoryTimerRunning, memoryCompleted]);

  useEffect(() => {
    if (activeGame === 'memory' && memoryCards.length === 0) {
      initMemoryGame(memoryCategory);
    }
  }, [activeGame]);

  const handleCardClick = (idx: number) => {
    if (!memoryCards[idx] || memoryCards[idx].flipped || memoryCards[idx].matched || flippedIndices.length >= 2) return;

    if (!memoryTimerRunning) {
      setMemoryTimerRunning(true);
    }

    playSound('flip', soundProfile);
    doVibro(vibro, 8);

    const updated = [...memoryCards];
    updated[idx].flipped = true;
    setMemoryCards(updated);

    const nextFlipped = [...flippedIndices, idx];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      const newMoves = memoryMoves + 1;
      setMemoryMoves(newMoves);
      const [firstIdx, secondIdx] = nextFlipped;

      if (updated[firstIdx].key === updated[secondIdx].key) {
        // Matched!
        setTimeout(() => {
          const matchedCards = [...updated];
          matchedCards[firstIdx].matched = true;
          matchedCards[secondIdx].matched = true;
          setMemoryCards(matchedCards);
          setFlippedIndices([]);
          playSound('coin', soundProfile);
          doVibro(vibro, 20);

          if (matchedCards.every((c) => c.matched)) {
            setMemoryCompleted(true);
            setMemoryTimerRunning(false);
            playSound('victory', soundProfile);
            onShowToast(`🎉 Отличная память! Пройдено за ${newMoves} ходов!`);
            onUnlockAchievement?.('memory_master');

            if (memoryBestMoves === 0 || newMoves < memoryBestMoves) {
              setMemoryBestMoves(newMoves);
              localStorage.setItem('asosh_memory_best_moves', String(newMoves));
            }
          }
        }, 320);
      } else {
        // No match
        setTimeout(() => {
          const resetFlipped = [...updated];
          resetFlipped[firstIdx].flipped = false;
          resetFlipped[secondIdx].flipped = false;
          setMemoryCards(resetFlipped);
          setFlippedIndices([]);
        }, 850);
      }
    }
  };

  const renderCardIcon = (type: MemoryCardItem['iconType'], color: string) => {
    const props = { className: 'w-5 h-5 sm:w-6 sm:h-6 shrink-0', style: { color } };
    switch (type) {
      case 'atom': return <Atom {...props} />;
      case 'flask': return <FlaskConical {...props} />;
      case 'dna': return <Dna {...props} />;
      case 'calc': return <Calculator {...props} />;
      case 'book': return <BookOpen {...props} />;
      case 'compass': return <Compass {...props} />;
      case 'globe': return <Globe {...props} />;
      case 'trophy': return <Trophy {...props} />;
      case 'pizza': return <Apple {...props} />;
      case 'apple': return <Apple {...props} />;
      case 'gamepad': return <Gamepad2 {...props} />;
      case 'swords': return <Swords {...props} />;
      case 'shield': return <Shield {...props} />;
      case 'zap': return <Zap {...props} />;
      case 'flame': return <Flame {...props} />;
      case 'star': return <Star {...props} />;
      default: return <Sparkles {...props} />;
    }
  };

  // ==========================================
  // 6. REFLEX SPEED TEST STATE & LOGIC
  // ==========================================
  const [reflexState, setReflexState] = useState<'idle' | 'waiting' | 'ready' | 'result'>('idle');
  const [reflexStartTime, setReflexStartTime] = useState(0);
  const [reflexTime, setReflexTime] = useState<number | null>(null);
  const [reflexHistory, setReflexHistory] = useState<number[]>([]);
  const reflexTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startReflexTest = () => {
    setReflexState('waiting');
    setReflexTime(null);
    playSound('settings', soundProfile);

    if (reflexTimeoutRef.current) clearTimeout(reflexTimeoutRef.current);
    const waitMs = 1500 + Math.random() * 3000;

    reflexTimeoutRef.current = setTimeout(() => {
      setReflexState('ready');
      setReflexStartTime(Date.now());
      playSound('bell', soundProfile);
    }, waitMs);
  };

  const handleReflexTap = () => {
    if (reflexState === 'waiting') {
      if (reflexTimeoutRef.current) clearTimeout(reflexTimeoutRef.current);
      setReflexState('result');
      setReflexTime(-1); // False start
      playSound('buzzer', soundProfile);
      doVibro(vibro, 30);
    } else if (reflexState === 'ready') {
      const ms = Date.now() - reflexStartTime;
      setReflexState('result');
      setReflexTime(ms);
      setReflexHistory((prev) => [ms, ...prev].slice(0, 5));
      playSound('coin', soundProfile);
      doVibro(vibro, 40);
      if (ms < 250) {
        onUnlockAchievement?.('reflex_god');
      }
    }
  };

  const getReflexRank = (ms: number) => {
    if (ms < 0) return '❌ Фальстарт! Нажали слишком рано';
    if (ms < 200) return '⚡ Бог Киберспорта (Нереальная скорость!)';
    if (ms < 260) return '🐆 Гепард (Реакция чемпиона)';
    if (ms < 330) return '🏎️ Шумахер (Отличный результат)';
    if (ms < 420) return '🏃‍♂️ Спортсмен (Хорошая реакция)';
    return '🐢 Улитка (Можно быстрее!)';
  };

  // ==========================================
  // 7. FLAPPY DIARY (ФЛАППИ-ДНЕВНИК)
  // ==========================================
  const flappyCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [flappyPlaying, setFlappyPlaying] = useState(false);
  const [flappyScore, setFlappyScore] = useState(0);
  const [flappyHighScore, setFlappyHighScore] = useState(() => {
    return Number(localStorage.getItem('asosh_flappy_highscore') || '0');
  });
  const [flappyGameOver, setFlappyGameOver] = useState(false);

  const flappyStateRef = useRef({
    birdY: 120,
    birdV: 0,
    pipes: [] as { x: number; top: number; bottom: number; passed?: boolean }[],
    frame: 0,
    stars: [] as { x: number; y: number; collected?: boolean }[],
  });
  const flappyAnimRef = useRef<number | null>(null);

  const startFlappy = () => {
    flappyStateRef.current = {
      birdY: 120,
      birdV: -3.5,
      pipes: [
        { x: 260, top: 60, bottom: 90 },
        { x: 400, top: 80, bottom: 70 },
      ],
      frame: 0,
      stars: [{ x: 330, y: 110 }],
    };
    setFlappyScore(0);
    setFlappyGameOver(false);
    setFlappyPlaying(true);
    playSound('flip', soundProfile);
    doVibro(vibro, 25);
  };

  const jumpFlappy = () => {
    if (!flappyPlaying) {
      startFlappy();
      return;
    }
    flappyStateRef.current.birdV = -4.8;
    playSound('click', soundProfile);
    doVibro(vibro, 15);
  };

  useEffect(() => {
    if (!flappyPlaying || activeGame !== 'flappy') {
      if (flappyAnimRef.current) cancelAnimationFrame(flappyAnimRef.current);
      return;
    }

    const canvas = flappyCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localPlaying = true;

    const loop = () => {
      const state = flappyStateRef.current;
      state.frame++;

      // Physics
      state.birdV += 0.22;
      state.birdY += state.birdV;

      // Move pipes
      for (const p of state.pipes) {
        p.x -= 2;
        if (!p.passed && p.x < 50) {
          p.passed = true;
          setFlappyScore((prev) => {
            const next = prev + 1;
            playSound('coin', soundProfile);
            return next;
          });
        }
      }

      // Move stars
      for (const s of state.stars) {
        s.x -= 2;
        if (!s.collected && Math.hypot(50 - s.x, state.birdY - s.y) < 20) {
          s.collected = true;
          setFlappyScore((prev) => {
            const next = prev + 5;
            playSound('star', soundProfile);
            onShowToast('⭐ Золотая пятёрка (+5)!');
            return next;
          });
        }
      }

      // Recycle pipes
      if (state.pipes.length > 0 && state.pipes[0].x < -50) {
        state.pipes.shift();
        const top = 40 + Math.random() * 80;
        const bottom = 40 + Math.random() * 80;
        state.pipes.push({ x: 260, top, bottom });
        if (Math.random() < 0.5) {
          state.stars.push({ x: 330, y: top + 35 });
        }
      }

      // Check collision
      const hitCeilOrFloor = state.birdY < 10 || state.birdY > 230;
      let hitPipe = false;
      for (const p of state.pipes) {
        if (p.x < 70 && p.x + 36 > 40) {
          if (state.birdY - 10 < p.top || state.birdY + 10 > 240 - p.bottom) {
            hitPipe = true;
            break;
          }
        }
      }

      if (hitCeilOrFloor || hitPipe) {
        localPlaying = false;
        setFlappyPlaying(false);
        setFlappyGameOver(true);
        playSound('gameover', soundProfile);
        doVibro(vibro, 50);

        setFlappyScore((currScore) => {
          if (currScore > flappyHighScore) {
            setFlappyHighScore(currScore);
            localStorage.setItem('asosh_flappy_highscore', String(currScore));
            onShowToast('🏆 Новый рекорд во Флаппи-Дневнике!');
          }
          return currScore;
        });
        return;
      }

      // DRAW CANVAS
      ctx.clearRect(0, 0, 260, 240);

      // Background Classroom
      ctx.fillStyle = '#061325';
      ctx.fillRect(0, 0, 260, 240);

      // Grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 260; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 240);
        ctx.stroke();
      }

      // Draw Pipes (Columns of red 2s and 3s)
      for (const p of state.pipes) {
        // Top Pipe
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(p.x, 0, 36, p.top);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('2 ⚠️', p.x + 5, p.top - 8);

        // Bottom Pipe
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(p.x, 240 - p.bottom, 36, p.bottom);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('2 ⚠️', p.x + 5, 240 - p.bottom + 18);
      }

      // Draw Stars
      for (const s of state.stars) {
        if (!s.collected) {
          ctx.fillStyle = '#facc15';
          ctx.font = '16px sans-serif';
          ctx.fillText('⭐5', s.x - 8, s.y + 6);
        }
      }

      // Draw Bird (Blue Diary Icon)
      ctx.save();
      ctx.translate(50, state.birdY);
      ctx.rotate(Math.min(Math.PI / 4, Math.max(-Math.PI / 4, state.birdV * 0.08)));
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-12, -10, 24, 20);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-12, -10, 6, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('АСОШ', -5, 4);
      ctx.restore();

      if (localPlaying) {
        flappyAnimRef.current = requestAnimationFrame(loop);
      }
    };

    flappyAnimRef.current = requestAnimationFrame(loop);
    return () => {
      if (flappyAnimRef.current) cancelAnimationFrame(flappyAnimRef.current);
    };
  }, [flappyPlaying, activeGame]);

  // ==========================================
  // 8. PAPER PLANE FLIGHT (БУМАЖНЫЙ САМОЛЁТИК)
  // ==========================================
  const planeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [planePlaying, setPlanePlaying] = useState(false);
  const [planeDistance, setPlaneDistance] = useState(0);
  const [planeHighScore, setPlaneHighScore] = useState(() => {
    return Number(localStorage.getItem('asosh_plane_highscore') || '0');
  });
  const [planeGameOver, setPlaneGameOver] = useState(false);
  const planeThrustRef = useRef(false);

  const planeStateRef = useRef({
    y: 120,
    vy: 0,
    speed: 2.2,
    obstacles: [] as { x: number; y: number; radius: number; label: string }[],
    bonuses: [] as { x: number; y: number; collected?: boolean }[],
    dist: 0,
  });
  const planeAnimRef = useRef<number | null>(null);

  const startPlane = () => {
    planeThrustRef.current = false;
    planeStateRef.current = {
      y: 120,
      vy: 0,
      speed: 2.2,
      obstacles: [
        { x: 260, y: 70, radius: 18, label: '🌍' },
        { x: 380, y: 160, radius: 18, label: '📚' },
      ],
      bonuses: [
        { x: 320, y: 110 },
        { x: 440, y: 80 },
      ],
      dist: 0,
    };
    setPlaneDistance(0);
    setPlaneGameOver(false);
    setPlanePlaying(true);
    playSound('flip', soundProfile);
    doVibro(vibro, 25);
  };

  useEffect(() => {
    const handleGlobalRelease = () => {
      planeThrustRef.current = false;
    };
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('touchcancel', handleGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('touchcancel', handleGlobalRelease);
    };
  }, []);

  useEffect(() => {
    if (!planePlaying || activeGame !== 'plane') {
      planeThrustRef.current = false;
      if (planeAnimRef.current) cancelAnimationFrame(planeAnimRef.current);
      return;
    }

    const canvas = planeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localPlaying = true;

    const loop = () => {
      const state = planeStateRef.current;

      // Thrust control
      if (planeThrustRef.current) {
        state.vy -= 0.35;
      } else {
        state.vy += 0.22;
      }
      state.vy = Math.max(-4, Math.min(4, state.vy));
      state.y += state.vy;

      state.dist += 0.25;
      setPlaneDistance(Math.floor(state.dist));

      // Move obstacles
      for (const obs of state.obstacles) {
        obs.x -= state.speed;
      }

      // Move bonuses
      for (const b of state.bonuses) {
        b.x -= state.speed;
        if (!b.collected && Math.hypot(50 - b.x, state.y - b.y) < 22) {
          b.collected = true;
          state.dist += 15;
          playSound('coin', soundProfile);
          doVibro(vibro, 20);
          onShowToast('🚀 Поток ветра! +15 метров!');
        }
      }

      // Recycle obstacles
      if (state.obstacles.length > 0 && state.obstacles[0].x < -40) {
        state.obstacles.shift();
        const obsTypes = ['🌍', '📚', '📐', '🧪'];
        const randomObs = obsTypes[Math.floor(Math.random() * obsTypes.length)];
        state.obstacles.push({
          x: 270,
          y: 40 + Math.random() * 160,
          radius: 18,
          label: randomObs,
        });
        if (Math.random() < 0.6) {
          state.bonuses.push({
            x: 340,
            y: 40 + Math.random() * 160,
          });
        }
      }

      // Collision check
      const hitWall = state.y < 12 || state.y > 228;
      let hitObs = false;
      for (const obs of state.obstacles) {
        if (Math.hypot(50 - obs.x, state.y - obs.y) < obs.radius + 10) {
          hitObs = true;
          break;
        }
      }

      if (hitWall || hitObs) {
        localPlaying = false;
        setPlanePlaying(false);
        setPlaneGameOver(true);
        playSound('gameover', soundProfile);
        doVibro(vibro, 50);

        const finalDist = Math.floor(state.dist);
        if (finalDist > planeHighScore) {
          setPlaneHighScore(finalDist);
          localStorage.setItem('asosh_plane_highscore', String(finalDist));
          onShowToast('🏆 Новый рекорд полета самолетика!');
        }
        return;
      }

      // DRAW CANVAS
      ctx.clearRect(0, 0, 260, 240);

      // School Corridor Sky Background
      ctx.fillStyle = '#0a192f';
      ctx.fillRect(0, 0, 260, 240);

      // Wind lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const lineY = 40 + i * 50 + Math.sin(state.dist * 0.1 + i) * 10;
        ctx.beginPath();
        ctx.moveTo((state.dist * 5 + i * 60) % 260, lineY);
        ctx.lineTo(((state.dist * 5 + i * 60) % 260) + 40, lineY);
        ctx.stroke();
      }

      // Obstacles
      for (const obs of state.obstacles) {
        ctx.font = '22px sans-serif';
        ctx.fillText(obs.label, obs.x - 11, obs.y + 8);
      }

      // Bonuses
      for (const b of state.bonuses) {
        if (!b.collected) {
          ctx.fillStyle = '#38bdf8';
          ctx.font = '16px sans-serif';
          ctx.fillText('📎', b.x - 8, b.y + 6);
        }
      }

      // Draw Paper Plane
      ctx.save();
      ctx.translate(50, state.y);
      ctx.rotate(state.vy * 0.08);

      // Paper Plane Triangle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-12, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 8);
      ctx.closePath();
      ctx.fill();

      // Shadow fold
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 8);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      if (localPlaying) {
        planeAnimRef.current = requestAnimationFrame(loop);
      }
    };

    planeAnimRef.current = requestAnimationFrame(loop);
    return () => {
      if (planeAnimRef.current) cancelAnimationFrame(planeAnimRef.current);
    };
  }, [planePlaying, activeGame]);

  return (
    <div className="card screen-enter space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <span>🎮</span>
            <span>Школьный игровой зал</span>
          </h2>
          <p className="text-xs text-amber-300 font-bold">
            ⚡ 8 школьных мини-игр без интернета для веселой перемены!
          </p>
        </div>
      </div>

      {/* Game Selector Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-9 gap-1.5 bg-slate-950/80 p-1.5 rounded-2xl border border-white/10">
        {[
          { id: 'detective', label: '🕵️ Detective AI', highlight: true },
          { id: 'snake', label: '🐍 Змейка' },
          { id: 'flappy', label: '🚀 Флаппи' },
          { id: 'plane', label: '✈️ Самолётик' },
          { id: 'duel', label: '⚔️ Дуэль' },
          { id: 'math', label: '🧠 Спринт' },
          { id: 'tictactoe', label: '⭕ Крестики' },
          { id: 'memory', label: '🎴 Память' },
          { id: 'reaction', label: '⚡ Реакция' },
        ].map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              setActiveGame(g.id as ActiveGameId);
              playSound('click', soundProfile);
            }}
            className={`py-2 px-1 text-[11px] font-bold rounded-xl transition-all text-center truncate ${
              activeGame === g.id
                ? g.highlight
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg ring-2 ring-amber-400/50'
                  : 'bg-cyan-500 text-slate-950 font-extrabold shadow-md'
                : g.highlight
                ? 'text-amber-300 bg-amber-500/10 border border-amber-400/30 hover:bg-amber-500/20'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Quick compact banner when playing other games */}
      {activeGame !== 'detective' && (
        <FriendGamePromo compact={true} onShowToast={onShowToast} />
      )}

      {/* ========================================= */}
      {/* FEATURED: FRIEND'S GAME - DETECTIVE AI */}
      {/* ========================================= */}
      {activeGame === 'detective' && (
        <div className="space-y-4">
          <FriendGamePromo onShowToast={onShowToast} />

          {/* Detailed Game Info & Guide */}
          <div className="p-4 bg-slate-900/80 rounded-3xl border border-amber-400/30 space-y-3">
            <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
              <span>🔎</span>
              <span>Об игре Detective AI Game</span>
            </h4>
            <p className="text-xs text-white/80 leading-relaxed">
              «Detective AI Game» — захватывающий интерактивный инди-квест, созданный Дмитрием Паджетом. В игре вам предстоит примерить на себя роль настоящего детектива. С помощью искусственного интеллекта игра адаптируется под ваши вопросы и ответы подозреваемых, создавая неповторимый детективный опыт в каждом расследовании.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <b className="text-amber-300 block">💡 Как начать играть:</b>
                <span className="text-white/70">
                  1. Нажмите кнопку «Играть на itch.io» выше.<br />
                  2. Игра откроется прямо в вашем браузере (или доступна для ПК).<br />
                  3. Опрашивайте свидетелей, ищите нестыковки и найдите преступника!
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <b className="text-amber-300 block">⭐ Поддержка разработчика:</b>
                <span className="text-white/70">
                  Поставьте лайк вверху карточки, поделитесь ссылкой с одноклассниками в соцсетях и оставьте отзыв на странице itch.io!
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* GAME 1: SNAKE */}
      {/* ========================================= */}
      {activeGame === 'snake' && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-cyan-400/30 space-y-3 text-center">
          <div className="flex justify-between items-center px-1">
            <div className="text-sm font-black text-cyan-300">🐍 Школьная Змейка (Классика)</div>
            <div className="text-xs text-amber-300 font-mono font-bold">
              Рекорд: {snakeHighScore} 🏆
            </div>
          </div>

          <div className="flex justify-center gap-1 text-[11px] font-bold">
            <span className="text-white/60 self-center mr-1">Скорость:</span>
            {(['slow', 'normal', 'turbo'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`px-2.5 py-0.5 rounded-lg border text-[10px] ${
                  snakeSpeed === s ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black' : 'bg-white/5 text-white/70 border-white/10'
                }`}
                onClick={() => setSnakeSpeed(s)}
              >
                {s === 'slow' ? 'Медленно' : s === 'normal' ? 'Норм' : 'Турбо ⚡'}
              </button>
            ))}
          </div>

          <canvas
            ref={snakeCanvasRef}
            width={240}
            height={240}
            className="mx-auto rounded-2xl border-2 border-cyan-400/50 shadow-inner bg-slate-950 block max-w-full"
          />

          <div className="flex justify-between items-center text-xs font-bold px-2">
            <span className="text-white">
              Счет: <b className="text-cyan-300 text-base font-mono">{snakeScore}</b>
            </span>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-xs hover:opacity-90 shadow-md flex items-center gap-1.5"
              onClick={snakePlaying ? stopSnake : startSnake}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{snakePlaying ? 'Пауза' : 'СТАРТ ИГРЫ'}</span>
            </button>
          </div>

          {/* D-Pad */}
          <div className="grid grid-cols-3 gap-1.5 max-w-[170px] mx-auto pt-1">
            <div />
            <button
              type="button"
              className="p-3 bg-white/10 rounded-xl border border-white/20 active:bg-cyan-500/30 text-white font-black text-base"
              onClick={() => changeSnakeDir(0, -1)}
            >
              ▲
            </button>
            <div />

            <button
              type="button"
              className="p-3 bg-white/10 rounded-xl border border-white/20 active:bg-cyan-500/30 text-white font-black text-base"
              onClick={() => changeSnakeDir(-1, 0)}
            >
              ◀
            </button>
            <button
              type="button"
              className="p-3 bg-white/10 rounded-xl border border-white/20 active:bg-cyan-500/30 text-white font-black text-base"
              onClick={() => changeSnakeDir(0, 1)}
            >
              ▼
            </button>
            <button
              type="button"
              className="p-3 bg-white/10 rounded-xl border border-white/20 active:bg-cyan-500/30 text-white font-black text-base"
              onClick={() => changeSnakeDir(1, 0)}
            >
              ▶
            </button>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* GAME 2: DUEL ON DESK */}
      {/* ========================================= */}
      {activeGame === 'duel' && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-purple-400/30 space-y-3 text-center">
          <div className="flex justify-between items-center px-1">
            <div className="text-sm font-black text-purple-300 flex items-center gap-1.5">
              <Swords className="w-4 h-4" />
              <span>Дуэль на парте (Матч до 3 побед)</span>
            </div>
            <div className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
              {duelScore.p1} : {duelScore.p2}
            </div>
          </div>

          <p className="text-xs text-white/60">
            Положите телефон между собой. Ждите зелёный свет и жмите быстрее соседа!
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn orange justify-center text-xs py-2 shadow-md flex-1"
              onClick={startDuel}
            >
              <span>▶</span>
              <span>РАУНД</span>
            </button>
            <button
              type="button"
              className="btn darkBtn justify-center text-xs py-2 w-auto px-4"
              onClick={resetDuelMatch}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs font-black text-white py-1">{duelStatusText}</div>

          <div className="space-y-2">
            <button
              type="button"
              disabled={duelState === 'idle' || duelState === 'finished'}
              onClick={() => tapDuelPlayer(1)}
              className={`w-full py-7 rounded-2xl text-lg font-black transition-all border shadow-lg ${
                duelState === 'ready'
                  ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
                  : duelState === 'waiting'
                  ? 'bg-rose-500/30 text-rose-200 border-rose-500/40'
                  : 'bg-white/10 text-white/40 border-white/10'
              }`}
            >
              👤 Игрок 1 (Сверху) — {duelScore.p1} очк.
            </button>

            <button
              type="button"
              disabled={duelState === 'idle' || duelState === 'finished'}
              onClick={() => tapDuelPlayer(2)}
              className={`w-full py-7 rounded-2xl text-lg font-black transition-all border shadow-lg ${
                duelState === 'ready'
                  ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
                  : duelState === 'waiting'
                  ? 'bg-blue-500/30 text-blue-200 border-blue-500/40'
                  : 'bg-white/10 text-white/40 border-white/10'
              }`}
            >
              👤 Игрок 2 (Снизу) — {duelScore.p2} очк.
            </button>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* GAME 3: SPEED MATH */}
      {/* ========================================= */}
      {activeGame === 'math' && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-amber-400/30 space-y-3 text-center">
          <div className="flex justify-between items-center px-1">
            <div className="text-sm font-black text-amber-300 flex items-center gap-1.5">
              <Brain className="w-4 h-4" />
              <span>Спринт Устного Счёта (45 сек)</span>
            </div>
            <div className="text-xs text-amber-300 font-mono font-bold">
              Рекорд: {mathBestScore} 🏆
            </div>
          </div>

          {!mathPlaying ? (
            <div className="space-y-3 py-4">
              <p className="text-xs text-white/70">
                Решай простые примеры на скорость! За комбо начисляются бонусные очки.
              </p>
              <button
                type="button"
                className="btn green justify-center text-sm py-3 max-w-xs mx-auto"
                onClick={startMathGame}
              >
                <Play className="w-4 h-4" />
                <span>НАЧАТЬ СПРИНТ</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2 text-xs font-bold">
                <span className="text-rose-400 font-mono text-sm">⏱️ {mathTimeLeft}с</span>
                <span className="text-amber-400 font-mono">Комбо: x{mathStreak >= 5 ? 3 : mathStreak >= 3 ? 2 : 1} 🔥</span>
                <span className="text-cyan-300 font-mono text-base">Счет: {mathScore}</span>
              </div>

              <div className="py-6 bg-slate-950 rounded-2xl border border-white/10">
                <span className="text-3xl font-black text-white font-mono tracking-wider">
                  {mathProblem.text} = ?
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {mathProblem.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="p-4 bg-white/10 hover:bg-white/20 active:bg-cyan-500/40 text-xl font-mono font-black text-white rounded-2xl border border-white/20 transition-all shadow-md"
                    onClick={() => handleAnswerMath(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================= */}
      {/* GAME 4: TIC-TAC-TOE */}
      {/* ========================================= */}
      {activeGame === 'tictactoe' && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-cyan-400/30 space-y-3 text-center">
          <div className="flex justify-between items-center px-1">
            <div className="text-sm font-black text-cyan-300 flex items-center gap-1.5">
              <Grid className="w-4 h-4" />
              <span>Крестики-Нолики Pro</span>
            </div>
            <div className="flex gap-1 text-[10px] font-bold">
              <button
                type="button"
                className={`px-2 py-0.5 rounded-lg border ${
                  tttMode === 'ai' ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-white/5 text-white/60 border-white/10'
                }`}
                onClick={() => {
                  setTttMode('ai');
                  resetTttBoard();
                }}
              >
                Против компьютера 🤖
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 rounded-lg border ${
                  tttMode === 'pvp' ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-white/5 text-white/60 border-white/10'
                }`}
                onClick={() => {
                  setTttMode('pvp');
                  resetTttBoard();
                }}
              >
                Вдвоем 👥
              </button>
            </div>
          </div>

          <div className="flex justify-around items-center text-xs font-mono font-bold bg-white/5 p-2 rounded-xl border border-white/10">
            <span className="text-cyan-400">X: {tttScore.x}</span>
            <span className="text-white/60">Ничьи: {tttScore.draws}</span>
            <span className="text-rose-400">O: {tttScore.o}</span>
          </div>

          <div className="text-xs font-bold text-white">
            {tttWinner
              ? tttWinner === 'draw'
                ? '🤝 Ничья!'
                : `🏆 Победил игрок: ${tttWinner}`
              : `Ход: ${tttTurn === 'X' ? '❌ Крестик' : '⭕ Нолик'}`}
          </div>

          {/* 3x3 Grid */}
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            {tttBoard.map((val, idx) => (
              <button
                key={idx}
                type="button"
                className={`w-18 h-18 rounded-2xl text-2xl font-black flex items-center justify-center border transition-all ${
                  val === 'X'
                    ? 'text-cyan-400 bg-cyan-500/10 border-cyan-400/50 shadow-inner'
                    : val === 'O'
                    ? 'text-rose-400 bg-rose-500/10 border-rose-400/50 shadow-inner'
                    : 'bg-white/5 border-white/10 hover:bg-white/15'
                }`}
                onClick={() => handleCellClick(idx)}
              >
                {val}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn darkBtn text-xs justify-center py-2 max-w-[200px] mx-auto mt-2"
            onClick={resetTttBoard}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Новый раунд</span>
          </button>
        </div>
      )}

      {/* ========================================= */}
      {/* GAME 5: MEMORY MATCH (REVAMPED v11.0) */}
      {/* ========================================= */}
      {activeGame === 'memory' && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-emerald-400/30 space-y-3.5 text-center">
          <div className="flex flex-wrap justify-between items-center gap-2 px-1">
            <div className="text-sm font-black text-emerald-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Школьная память</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold">
              <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg text-emerald-300">
                <Timer className="w-3.5 h-3.5" />
                <span>{memoryTimerSec} с</span>
              </span>
              <span className="bg-white/10 px-2 py-0.5 rounded-lg text-white/80">
                Ходов: {memoryMoves}
              </span>
              {memoryBestMoves > 0 && (
                <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg border border-amber-400/30">
                  Рекорд: {memoryBestMoves}
                </span>
              )}
            </div>
          </div>

          {/* Theme Pack Selector */}
          <div className="flex justify-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 max-w-[340px] mx-auto">
            {[
              { id: 'science' as MemoryCategory, label: '🔬 Наука', desc: 'Уроки' },
              { id: 'canteen' as MemoryCategory, label: '🍕 Буфет', desc: 'Еда' },
              { id: 'gaming' as MemoryCategory, label: '🎮 Гейминг', desc: 'Игры' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                  memoryCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                    : 'text-white/70 hover:bg-white/10'
                }`}
                onClick={() => {
                  setMemoryCategory(cat.id);
                  initMemoryGame(cat.id);
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {memoryCompleted && (
            <div className="bg-emerald-500/20 text-emerald-300 p-3 rounded-2xl border border-emerald-400/40 text-xs font-black animate-pulse flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>🎉 Победа! Все пары найдены за {memoryMoves} ходов ({memoryTimerSec} сек)!</span>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-4 gap-2 max-w-[280px] mx-auto">
            {memoryCards.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                className={`h-16 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer select-none ${
                  card.matched
                    ? 'bg-emerald-500/25 border-emerald-400/60 shadow-sm opacity-90 scale-[0.98]'
                    : card.flipped
                    ? 'bg-slate-800 border-cyan-400 shadow-md scale-105'
                    : 'bg-white/10 hover:bg-white/20 border-white/15 active:scale-95'
                }`}
                onClick={() => handleCardClick(idx)}
              >
                {card.flipped || card.matched ? (
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span className="text-lg leading-none select-none">{card.emoji}</span>
                    <span
                      className="text-[9px] font-black tracking-tight leading-none px-1 py-0.5 rounded text-white"
                      style={{ color: card.color }}
                    >
                      {card.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/50">
                    <Sparkles className="w-5 h-5 text-emerald-400/60" />
                    <span className="text-[8px] font-mono text-white/40 mt-0.5">АСОШ</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-2 pt-1">
            <button
              type="button"
              className="btn green text-xs justify-center py-2 px-4"
              onClick={() => initMemoryGame(memoryCategory)}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Перемешать колоду</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* GAME 6: REACTION TEST */}
      {/* ========================================= */}
      {activeGame === 'reaction' && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-rose-400/30 space-y-3 text-center">
          <div className="flex justify-between items-center px-1">
            <div className="text-sm font-black text-rose-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>Тест на Реакцию (Миллисекунды)</span>
            </div>
          </div>

          <p className="text-xs text-white/60">
            Нажмите «СТАРТ». Как только экран станет зелёным — жмите со всех сил!
          </p>

          {reflexState === 'idle' && (
            <button
              type="button"
              className="btn green justify-center text-sm py-3 max-w-xs mx-auto"
              onClick={startReflexTest}
            >
              <Play className="w-4 h-4" />
              <span>НАЧАТЬ ТЕСТ</span>
            </button>
          )}

          {(reflexState === 'waiting' || reflexState === 'ready') && (
            <button
              type="button"
              onClick={handleReflexTap}
              className={`w-full py-16 rounded-3xl text-2xl font-black transition-all border shadow-2xl ${
                reflexState === 'ready'
                  ? 'bg-emerald-500 text-white border-emerald-400 animate-pulse'
                  : 'bg-rose-600 text-white border-rose-500'
              }`}
            >
              {reflexState === 'ready' ? '⚡ ЖМИ СЕЙЧАС! ⚡' : 'ЖДИ ЗЕЛЕНЫЙ... 🛑'}
            </button>
          )}

          {reflexState === 'result' && reflexTime !== null && (
            <div className="space-y-3">
              <div className="p-4 bg-slate-950 rounded-2xl border border-white/10">
                {reflexTime > 0 ? (
                  <>
                    <span className="text-3xl font-mono font-black text-cyan-300 block">
                      {reflexTime} ms
                    </span>
                    <span className="text-xs font-bold text-amber-300 mt-1 block">
                      {getReflexRank(reflexTime)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-rose-400 block">
                    ❌ Фальстарт! Нажали раньше зелёного сигнала.
                  </span>
                )}
              </div>

              <button
                type="button"
                className="btn green justify-center text-xs py-2.5 max-w-xs mx-auto"
                onClick={startReflexTest}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Попробовать ещё раз</span>
              </button>
            </div>
          )}

          {reflexHistory.length > 0 && (
            <div className="pt-2 text-left bg-white/5 p-3 rounded-2xl border border-white/10 text-xs">
              <b className="text-white/80 block mb-1">История последних попыток:</b>
              <div className="flex gap-2 font-mono text-cyan-300">
                {reflexHistory.map((h, i) => (
                  <span key={i} className="bg-slate-950 px-2 py-1 rounded-lg border border-white/10">
                    {h}ms
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================= */}
      {/* GAME 7: FLAPPY DIARY (ФЛАППИ-ДНЕВНИК) */}
      {/* ========================================= */}
      {activeGame === 'flappy' && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-sky-400/30 space-y-3 text-center">
          <div className="flex justify-between items-center px-1">
            <div className="text-sm font-black text-sky-300">🚀 Флаппи-Дневник (АСОШ №2)</div>
            <div className="text-xs text-amber-300 font-mono font-bold">
              Рекорд: {flappyHighScore} 🏆
            </div>
          </div>

          <p className="text-xs text-white/60">
            Тапайте по экрану или кнопке, чтобы лететь! Уворачивайтесь от двоек и троек, собирайте золотые пятёрки!
          </p>

          <canvas
            ref={flappyCanvasRef}
            width={260}
            height={240}
            onClick={jumpFlappy}
            className="mx-auto rounded-2xl border-2 border-sky-400/50 shadow-inner bg-slate-950 block max-w-full cursor-pointer select-none"
          />

          <div className="flex justify-between items-center text-xs font-bold px-2">
            <span className="text-white">
              Очки: <b className="text-sky-300 text-lg font-mono">{flappyScore}</b>
            </span>
            <button
              type="button"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-xs hover:opacity-90 shadow-md flex items-center gap-1.5"
              onClick={jumpFlappy}
            >
              <Rocket className="w-4 h-4" />
              <span>{flappyPlaying ? 'ВЗЛЁТ (ТАП) 🚀' : 'СТАРТ ПОЛЁТА'}</span>
            </button>
          </div>

          {flappyGameOver && (
            <div className="p-3 bg-rose-950/80 rounded-2xl border border-rose-500/40 text-xs font-bold text-rose-300 animate-pulse">
              💥 Дневник получил двойку! Нажмите «СТАРТ ПОЛЁТА», чтобы исправить оценку!
            </div>
          )}
        </div>
      )}

      {/* ========================================= */}
      {/* GAME 8: PAPER PLANE (БУМАЖНЫЙ САМОЛЁТИК) */}
      {/* ========================================= */}
      {activeGame === 'plane' && (
        <div className="p-4 bg-slate-900/90 rounded-3xl border border-emerald-400/30 space-y-3 text-center">
          <div className="flex justify-between items-center px-1">
            <div className="text-sm font-black text-emerald-300">✈️ Бумажный Самолётик по коридору</div>
            <div className="text-xs text-amber-300 font-mono font-bold">
              Рекорд: {planeHighScore} м 🏆
            </div>
          </div>

          <p className="text-xs text-white/60">
            Удерживайте кнопку «ТЯГА ВВЕРХ», чтобы набирать высоту, отпускайте — чтобы планировать вниз. Облетайте глобусы и ловите скрепки!
          </p>

          <canvas
            ref={planeCanvasRef}
            width={260}
            height={240}
            className="mx-auto rounded-2xl border-2 border-emerald-400/50 shadow-inner bg-slate-950 block max-w-full select-none"
          />

          <div className="flex justify-between items-center text-xs font-bold px-2">
            <span className="text-white">
              Дистанция: <b className="text-emerald-300 text-lg font-mono">{planeDistance} м</b>
            </span>
            <div className="flex gap-2">
              {!planePlaying ? (
                <button
                  type="button"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs hover:opacity-90 shadow-md flex items-center gap-1.5"
                  onClick={startPlane}
                >
                  <Plane className="w-4 h-4" />
                  <span>ЗАПУСТИТЬ ✈️</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-xs active:scale-95 shadow-lg flex items-center gap-2 select-none"
                  onMouseDown={() => (planeThrustRef.current = true)}
                  onMouseUp={() => (planeThrustRef.current = false)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    planeThrustRef.current = true;
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    planeThrustRef.current = false;
                  }}
                >
                  <Send className="w-4 h-4" />
                  <span>ТЯГА ВВЕРХ 🛫 (ЗАЖАТЬ)</span>
                </button>
              )}
            </div>
          </div>

          {planeGameOver && (
            <div className="p-3 bg-rose-950/80 rounded-2xl border border-rose-500/40 text-xs font-bold text-rose-300 animate-pulse">
              💥 Самолётик врезался в учебник! Нажмите «ЗАПУСТИТЬ», чтобы взлететь снова!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
