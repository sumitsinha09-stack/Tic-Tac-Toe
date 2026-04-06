// =============================================
//  TIC TAC TOE — MINIMAX & ALPHA-BETA ENGINE
// =============================================

// --- STATE ---
let board = Array(9).fill(null);   // null | 'X' | 'O'
let gameOver = false;
let currentPlayer = 'X';           // human is X, AI is O
let useAlphaBeta = true;
let maxDepth = 9;                   // 9 = Hard (full tree), 1 = Easy
let isMultiplayer = false;

let scores = { X: 0, O: 0, D: 0 };

// Win-line combos
const WINS = [
  [0,1,2],[3,4,5],[6,7,8],   // rows
  [0,3,6],[1,4,7],[2,5,8],   // cols
  [0,4,8],[2,4,6]            // diags
];

// =============================================
//  DOM REFERENCES
// =============================================
const cells       = document.querySelectorAll('.cell');
const statusEl    = document.getElementById('statusMsg');
const resetBtn    = document.getElementById('resetBtn');
const abToggle    = document.getElementById('alphaBetaToggle');
const abStatus    = document.getElementById('abStatus');
const diffBtns    = document.querySelectorAll('.diff-btn');
const singlePlayerBtn = document.getElementById('singlePlayerBtn');
const multiPlayerBtn = document.getElementById('multiPlayerBtn');
const statNodes   = document.getElementById('statNodes');
const statPruned  = document.getElementById('statPruned');
const statDepth   = document.getElementById('statDepth');
const statScore   = document.getElementById('statScore');
const statMove    = document.getElementById('statMove');
const statAlgo    = document.getElementById('statAlgo');
const scoreX      = document.getElementById('scoreX');
const scoreO      = document.getElementById('scoreO');
const scoreDraw   = document.getElementById('scoreDraw');
const scoreXLabel = document.getElementById('scoreXLabel');
const scoreOLabel = document.getElementById('scoreOLabel');
const flowSteps   = [0,1,2,3].map(i => document.getElementById('flow' + i));

// =============================================
//  INIT
// =============================================
cells.forEach(cell => cell.addEventListener('click', onCellClick));
resetBtn.addEventListener('click', resetGame);

abToggle.addEventListener('change', () => {
  useAlphaBeta = abToggle.checked;
  abStatus.textContent = useAlphaBeta ? 'ON' : 'OFF';
  abStatus.className = 'ab-status ' + (useAlphaBeta ? 'on' : 'off');
  statAlgo.textContent = useAlphaBeta ? 'Alpha-Beta' : 'Pure Minimax';
});

diffBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    diffBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    maxDepth = parseInt(btn.dataset.depth);
    resetGame();
  });
});

singlePlayerBtn.addEventListener('click', () => {
  isMultiplayer = false;
  singlePlayerBtn.classList.add('active');
  multiPlayerBtn.classList.remove('active');
  document.getElementById('alphaBetaRow').style.display = 'flex';
  document.querySelector('.diff-row').style.display = 'flex';
  document.getElementById('aiFlowPanel').style.display = 'block';
  scoreXLabel.textContent = 'YOU (X)';
  scoreOLabel.textContent = 'AI (O)';
  resetGame();
});

multiPlayerBtn.addEventListener('click', () => {
  isMultiplayer = true;
  multiPlayerBtn.classList.add('active');
  singlePlayerBtn.classList.remove('active');
  document.getElementById('alphaBetaRow').style.display = 'none';
  document.querySelector('.diff-row').style.display = 'none';
  document.getElementById('aiFlowPanel').style.display = 'none';
  scoreXLabel.textContent = 'PLAYER X';
  scoreOLabel.textContent = 'PLAYER O';
  resetGame();
});

// =============================================
//  CELL CLICK — HUMAN MOVE
// =============================================
function onCellClick(e) {
  const i = parseInt(e.target.dataset.i);
  if (board[i] || gameOver) return;

  makeMove(i, currentPlayer);
  if (checkEnd()) return;

  if (isMultiplayer) {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    setStatus(`${currentPlayer}'s turn — place ${currentPlayer}`);
  } else {
    currentPlayer = 'O';
    setStatus("AI is thinking…");
    highlightFlow(1);

    // Small timeout so the DOM updates before AI blocks thread
    setTimeout(() => {
      highlightFlow(2);
      aiMove();
      highlightFlow(3);
      if (!checkEnd()) {
        currentPlayer = 'X';
        setStatus("Your turn — place X");
        highlightFlow(0);
      }
    }, 120);
  }
}

// =============================================
//  PLACE A MARK
// =============================================
function makeMove(i, player) {
  board[i] = player;
  const cell = cells[i];
  cell.textContent = player;
  cell.classList.add(player === 'X' ? 'x-mark' : 'o-mark');
}

// =============================================
//  AI MOVE — picks best cell via minimax
// =============================================
function aiMove() {
  let bestScore = -Infinity;
  let bestMove  = -1;
  let nodesEval = 0;
  let nodesPruned = 0;
  let maxDepthReached = 0;

  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = 'O';

    let result;
    if (useAlphaBeta) {
      result = alphabeta(board, 0, -Infinity, Infinity, false);
    } else {
      result = minimax(board, 0, false);
    }

    nodesEval   += result.nodes;
    nodesPruned += result.pruned;
    maxDepthReached = Math.max(maxDepthReached, result.depth);
    board[i] = null;

    if (result.score > bestScore) {
      bestScore = result.score;
      bestMove  = i;
    }
  }

  // Update live stats panel
  statNodes.textContent  = nodesEval.toLocaleString();
  statPruned.textContent = useAlphaBeta ? nodesPruned.toLocaleString() : 'N/A';
  statDepth.textContent  = maxDepthReached;
  statScore.textContent  = bestScore === 0 ? '0 (Draw)' :
                           bestScore > 0  ? `+${bestScore} (AI Win)` :
                                            `${bestScore} (Human Win)`;
  statMove.textContent   = bestMove >= 0 ? `Cell ${bestMove} (row ${Math.floor(bestMove/3)+1}, col ${bestMove%3+1})` : '—';

  if (bestMove >= 0) makeMove(bestMove, 'O');
}

// =============================================
//  MINIMAX (pure)
// =============================================
function minimax(board, depth, isMaximizing) {
  let nodes = 1;
  let maxD  = depth;

  const winner = getWinner(board);
  if (winner === 'O') return { score: 10 - depth, nodes, pruned: 0, depth };
  if (winner === 'X') return { score: -10 + depth, nodes, pruned: 0, depth };
  if (isFull(board))  return { score: 0, nodes, pruned: 0, depth };
  if (depth >= maxDepth) return { score: heuristic(board), nodes, pruned: 0, depth };

  let best   = isMaximizing ? -Infinity : Infinity;
  let pruned = 0;

  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = isMaximizing ? 'O' : 'X';
    const res = minimax(board, depth + 1, !isMaximizing);
    board[i]  = null;

    nodes += res.nodes;
    pruned += res.pruned;
    maxD   = Math.max(maxD, res.depth);

    if (isMaximizing) best = Math.max(best, res.score);
    else              best = Math.min(best, res.score);
  }

  return { score: best, nodes, pruned, depth: maxD };
}

// =============================================
//  ALPHA-BETA PRUNING
// =============================================
function alphabeta(board, depth, alpha, beta, isMaximizing) {
  let nodes  = 1;
  let pruned = 0;
  let maxD   = depth;

  const winner = getWinner(board);
  if (winner === 'O') return { score: 10 - depth, nodes, pruned, depth };
  if (winner === 'X') return { score: -10 + depth, nodes, pruned, depth };
  if (isFull(board))  return { score: 0, nodes, pruned, depth };
  if (depth >= maxDepth) return { score: heuristic(board), nodes, pruned, depth };

  let best = isMaximizing ? -Infinity : Infinity;

  for (let i = 0; i < 9; i++) {
    if (board[i]) continue;
    board[i] = isMaximizing ? 'O' : 'X';
    const res = alphabeta(board, depth + 1, alpha, beta, !isMaximizing);
    board[i]  = null;

    nodes += res.nodes;
    pruned += res.pruned;
    maxD   = Math.max(maxD, res.depth);

    if (isMaximizing) {
      best  = Math.max(best, res.score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, res.score);
      beta = Math.min(beta, best);
    }

    // Prune!
    if (alpha >= beta) {
      // Count remaining unvisited moves as pruned
      for (let j = i + 1; j < 9; j++) {
        if (!board[j]) pruned++;
      }
      break;
    }
  }

  return { score: best, nodes, pruned, depth: maxD };
}

// =============================================
//  HELPERS
// =============================================
function getWinner(b) {
  for (const [a, c, d] of WINS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

function isFull(b) { return b.every(c => c !== null); }

// Simple heuristic for limited depth (Easy mode)
function heuristic(b) {
  let score = 0;
  for (const [a, c, d] of WINS) {
    const line = [b[a], b[c], b[d]];
    const oCount = line.filter(x => x === 'O').length;
    const xCount = line.filter(x => x === 'X').length;
    if (oCount > 0 && xCount === 0) score += oCount;
    if (xCount > 0 && oCount === 0) score -= xCount;
  }
  return score;
}

// =============================================
//  GAME END CHECK
// =============================================
function checkEnd() {
  const winner = getWinner(board);
  if (winner) {
    highlightWinCells(winner);
    if (winner === 'X') {
      setStatus("🎉 You win!");
      scores.X++;
      scoreX.textContent = scores.X;
    } else {
      setStatus("🤖 AI wins!");
      scores.O++;
      scoreO.textContent = scores.O;
    }
    gameOver = true;
    return true;
  }
  if (isFull(board)) {
    setStatus("It's a draw!");
    scores.D++;
    scoreDraw.textContent = scores.D;
    gameOver = true;
    return true;
  }
  return false;
}

function highlightWinCells(winner) {
  for (const combo of WINS) {
    const [a, b, c] = combo;
    if (board[a] === winner && board[b] === winner && board[c] === winner) {
      [a, b, c].forEach(i => cells[i].classList.add('win-cell'));
      break;
    }
  }
}

// =============================================
//  RESET
// =============================================
function resetGame() {
  board = Array(9).fill(null);
  gameOver = false;
  currentPlayer = 'X';
  cells.forEach(cell => {
    cell.textContent = '';
    cell.className = 'cell';
  });
  setStatus(isMultiplayer ? "X's turn — place X" : "Your turn — place X");
  highlightFlow(0);
  statNodes.textContent  = '—';
  statPruned.textContent = '—';
  statDepth.textContent  = '—';
  statScore.textContent  = '—';
  statMove.textContent   = '—';
}

// =============================================
//  UI HELPERS
// =============================================
function setStatus(msg) {
  statusEl.textContent = msg;
}

function highlightFlow(step) {
  flowSteps.forEach((el, i) => {
    if (el) el.classList.toggle('active', i === step);
  });
}

// Kick off
highlightFlow(0);
