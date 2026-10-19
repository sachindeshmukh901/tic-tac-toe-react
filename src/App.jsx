import { useEffect, useState } from "react";
import "./App.css";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const MODES = [
  { id: "friend", label: "Play with a friend" },
  { id: "cpu", label: "Play with computer" },
];

const LEVELS = [
  { id: "easy", label: "Easy" },
  { id: "hard", label: "Hard (unbeatable)" },
];

// Cell centres in the 300x300 strike overlay (3 tiles with 10-unit gaps).
const CENTERS = [46.667, 150, 253.333];

const emptyBoard = () => Array(9).fill(null);

/* ---------- game logic ---------- */

function getResult(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  return board.every(Boolean) ? { winner: null, line: null } : null;
}

// Minimax: O is the computer (maximiser), X is the human.
function minimax(board, player, depth) {
  const result = getResult(board);
  if (result) {
    if (result.winner === "O") return 10 - depth;
    if (result.winner === "X") return depth - 10;
    return 0;
  }
  let best = player === "O" ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = player;
    const score = minimax(board, player === "O" ? "X" : "O", depth + 1);
    board[i] = null;
    best = player === "O" ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

function bestMove(board) {
  const b = [...board];
  let bestScore = -Infinity;
  let moves = [];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = "O";
    const score = minimax(b, "X", 1);
    b[i] = null;
    if (score > bestScore) {
      bestScore = score;
      moves = [i];
    } else if (score === bestScore) {
      moves.push(i);
    }
  }
  return moves[Math.floor(Math.random() * moves.length)];
}

function randomMove(board) {
  const open = board.flatMap((v, i) => (v ? [] : [i]));
  return open[Math.floor(Math.random() * open.length)];
}

/* ---------- small components ---------- */

function Mark({ player }) {
  if (player === "X") {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <g className="mark x">
          <path d="M12 12 L88 88" pathLength="1" />
          <path d="M88 12 L12 88" pathLength="1" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <g className="mark o">
        <circle
          cx="50"
          cy="50"
          r="38"
          pathLength="1"
          transform="rotate(-110 50 50)"
        />
      </g>
    </svg>
  );
}

function Strike({ line }) {
  const [a, , c] = line;
  const ax = CENTERS[a % 3];
  const ay = CENTERS[Math.floor(a / 3)];
  const cx = CENTERS[c % 3];
  const cy = CENTERS[Math.floor(c / 3)];
  const len = Math.hypot(cx - ax, cy - ay);
  const ux = ((cx - ax) / len) * 30; // extend the line past both ends
  const uy = ((cy - ay) / len) * 30;
  return (
    <svg className="strike" viewBox="0 0 300 300" aria-hidden="true">
      <line x1={ax - ux} y1={ay - uy} x2={cx + ux} y2={cy + uy} pathLength="1" />
    </svg>
  );
}

function Segmented({ items, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- app ---------- */

export default function App() {
  const [mode, setMode] = useState("friend");
  const [level, setLevel] = useState("easy");
  const [board, setBoard] = useState(emptyBoard);
  const [starter, setStarter] = useState("X");
  const [scores, setScores] = useState({ X: 0, O: 0, D: 0 });
  const [counted, setCounted] = useState(false);

  const result = getResult(board);
  const outcome = result ? result.winner || "D" : null;
  const movesPlayed = board.filter(Boolean).length;
  const other = (p) => (p === "X" ? "O" : "X");
  const turn = movesPlayed % 2 === 0 ? starter : other(starter);
  const vsCpu = mode === "cpu";
  const cpuThinking = vsCpu && !result && turn === "O";

  // Record the score once per finished round.
  useEffect(() => {
    if (outcome && !counted) {
      setCounted(true);
      setScores((s) => ({ ...s, [outcome]: s[outcome] + 1 }));
    }
  }, [outcome, counted]);

  // Computer plays O after a short pause.
  useEffect(() => {
    if (!cpuThinking) return;
    const timer = setTimeout(() => {
      const i = level === "hard" ? bestMove(board) : randomMove(board);
      setBoard((prev) => {
        if (prev[i]) return prev;
        const next = [...prev];
        next[i] = "O";
        return next;
      });
    }, 450);
    return () => clearTimeout(timer);
  }, [cpuThinking, board, level]);

  function play(i) {
    if (board[i] || result || cpuThinking) return;
    const next = [...board];
    next[i] = turn;
    setBoard(next);
  }

  function nextRound() {
    if (result) setStarter(other(starter));
    setBoard(emptyBoard());
    setCounted(false);
  }

  function resetAll() {
    setScores({ X: 0, O: 0, D: 0 });
    setStarter("X");
    setBoard(emptyBoard());
    setCounted(false);
  }

  function changeMode(id) {
    if (id === mode) return;
    setMode(id);
    resetAll();
  }

  function changeLevel(id) {
    if (id === level) return;
    setLevel(id);
    resetAll();
  }

  const xName = vsCpu ? "You (X)" : "Player X";
  const oName = vsCpu ? "Computer (O)" : "Player O";
  const winCells = result?.line ?? [];

  let status;
  if (result?.winner) {
    const text =
      result.winner === "X"
        ? vsCpu ? "You win" : "X wins"
        : vsCpu ? "Computer wins" : "O wins";
    status = <span className={result.winner.toLowerCase()}>{text}!</span>;
  } else if (result) {
    status = "Draw. Nobody wins this one.";
  } else if (cpuThinking) {
    status = "Computer is thinking…";
  } else {
    status = (
      <span>
        {vsCpu ? "Your move: " : "Turn: "}
        <span className={turn.toLowerCase()}>{turn}</span>
      </span>
    );
  }

  return (
    <div className="app">
      <div className="brand">
        <Mark player="X" />
        <h1>Tic-tac-toe</h1>
        <Mark player="O" />
      </div>

      <Segmented items={MODES} value={mode} onChange={changeMode} label="Game mode" />
      {vsCpu && (
        <Segmented
          items={LEVELS}
          value={level}
          onChange={changeLevel}
          label="Computer difficulty"
        />
      )}

      <div className="scores">
        <div className={`score x${!result && turn === "X" ? " active" : ""}`}>
          <div className="who">{xName}</div>
          <div className="n">{scores.X}</div>
        </div>
        <div className="score">
          <div className="who">Draws</div>
          <div className="n">{scores.D}</div>
        </div>
        <div className={`score o${!result && turn === "O" ? " active" : ""}`}>
          <div className="who">{oName}</div>
          <div className="n">{scores.O}</div>
        </div>
      </div>

      <p className="status" role="status" aria-live="polite">
        {status}
      </p>

      <div className="plate">
        <div className="board-wrap">
          <div className="board" role="grid" aria-label="Tic-tac-toe board">
            {board.map((value, i) => {
              const win = winCells.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  role="gridcell"
                  aria-label={`Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}: ${value || "empty"}`}
                  className={`cell${win ? ` win-${value.toLowerCase()}` : ""}`}
                  disabled={!!value || !!result || cpuThinking}
                  onClick={() => play(i)}
                >
                  {value && <Mark player={value} />}
                </button>
              );
            })}
          </div>
          {result?.line && <Strike line={result.line} />}
        </div>
      </div>

      <div className="actions">
        <button
          type="button"
          className={`btn${result ? " primary" : ""}`}
          onClick={nextRound}
        >
          {result ? "Next round" : "Restart round"}
        </button>
        <button type="button" className="btn" onClick={resetAll}>
          Reset scores
        </button>
      </div>
    </div>
  );
}
