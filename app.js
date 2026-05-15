import createWordScramble from './puzzles/word-scramble.js';
import createMathPuzzle from './puzzles/math-puzzle.js';
import createTrivia from './puzzles/trivia.js';
import createPatternMatch from './puzzles/pattern-match.js';

const STORAGE_KEY = 'fultons-quiz-session-v1';

const puzzleTypes = [
  {
    id: 'word',
    title: 'Word Scramble',
    description: 'Unscramble deployment-themed words.',
    accent: '#9b65ff',
    icon: 'W',
    create: createWordScramble
  },
  {
    id: 'math',
    title: 'Math Puzzle',
    description: 'Solve quick build-number equations.',
    accent: '#2f89ff',
    icon: '+',
    create: createMathPuzzle
  },
  {
    id: 'trivia',
    title: 'Trivia',
    description: 'Pick the right self-hosting answer.',
    accent: '#39c86a',
    icon: '?',
    create: createTrivia
  },
  {
    id: 'pattern',
    title: 'Pattern Match',
    description: 'Complete the missing color sequence.',
    accent: '#e9ad21',
    icon: 'P',
    create: createPatternMatch
  }
];

const state = loadState();
let activePuzzle = puzzleTypes[0].id;

const elements = {
  menu: document.querySelector('#puzzle-menu'),
  stage: document.querySelector('#puzzle-stage'),
  points: document.querySelector('#points-total'),
  streak: document.querySelector('#streak-total'),
  accuracy: document.querySelector('#accuracy-total'),
  statsGrid: document.querySelector('#stats-grid'),
  history: document.querySelector('#history-list'),
  reset: document.querySelector('#reset-session')
};

function createDefaultState() {
  return {
    points: 0,
    streak: 0,
    completed: 0,
    attempts: 0,
    correct: 0,
    history: [],
    puzzles: Object.fromEntries(puzzleTypes.map((puzzle) => [
      puzzle.id,
      { attempts: 0, correct: 0, points: 0 }
    ]))
  };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== 'object') {
      return createDefaultState();
    }

    const next = createDefaultState();
    return {
      ...next,
      ...parsed,
      puzzles: { ...next.puzzles, ...parsed.puzzles },
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 8) : []
    };
  } catch {
    return createDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getAccuracy() {
  if (!state.attempts) {
    return 0;
  }

  return Math.round((state.correct / state.attempts) * 100);
}

function renderMenu() {
  elements.menu.innerHTML = '';

  puzzleTypes.forEach((puzzle) => {
    const stats = state.puzzles[puzzle.id];
    const button = document.createElement('button');
    button.className = `puzzle-card${puzzle.id === activePuzzle ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.puzzle = puzzle.id;
    button.style.setProperty('--accent', puzzle.accent);
    button.innerHTML = `
      <span class="puzzle-icon" aria-hidden="true">${puzzle.icon}</span>
      <span>
        <strong>${puzzle.title}</strong>
        <small>${puzzle.description}</small>
      </span>
      <span class="puzzle-score">${stats.points} pts</span>
    `;
    elements.menu.append(button);
  });
}

function renderPuzzle() {
  const puzzle = puzzleTypes.find((item) => item.id === activePuzzle) || puzzleTypes[0];
  elements.stage.innerHTML = '';
  elements.stage.style.setProperty('--accent', puzzle.accent);
  elements.stage.append(puzzle.create({
    accent: puzzle.accent,
    onComplete: (result) => handlePuzzleResult(puzzle, result)
  }));
}

function handlePuzzleResult(puzzle, result) {
  const wasCorrect = Boolean(result.correct);
  const gained = wasCorrect ? result.points || 10 : 0;

  state.attempts += 1;
  state.points += gained;
  state.streak = wasCorrect ? state.streak + 1 : 0;
  state.correct += wasCorrect ? 1 : 0;
  state.completed += wasCorrect ? 1 : 0;

  state.puzzles[puzzle.id].attempts += 1;
  state.puzzles[puzzle.id].correct += wasCorrect ? 1 : 0;
  state.puzzles[puzzle.id].points += gained;

  state.history.unshift({
    puzzle: puzzle.title,
    correct: wasCorrect,
    points: gained,
    summary: result.summary,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  state.history = state.history.slice(0, 8);

  saveState();
  renderAll({ keepPuzzle: true });
}

function renderSummary() {
  elements.points.textContent = state.points;
  elements.streak.textContent = state.streak;
  elements.accuracy.textContent = `${getAccuracy()}%`;
}

function renderStats() {
  elements.statsGrid.innerHTML = '';

  [
    ['Points', state.points],
    ['Correct', state.correct],
    ['Attempts', state.attempts],
    ['Accuracy', `${getAccuracy()}%`]
  ].forEach(([label, value]) => {
    const card = document.createElement('article');
    card.className = 'stat-card';
    card.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    elements.statsGrid.append(card);
  });

  elements.history.innerHTML = '';
  const history = state.history.length ? state.history : [{
    puzzle: 'No attempts yet',
    summary: 'Play a puzzle to start the scoreboard.',
    correct: true,
    points: 0,
    time: ''
  }];

  history.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <span><strong>${item.puzzle}</strong><br>${item.summary}</span>
      <span>${item.correct ? `+${item.points}` : '0'} ${item.time}</span>
    `;
    elements.history.append(row);
  });
}

function renderAll(options = {}) {
  renderSummary();
  renderMenu();
  renderStats();

  if (!options.keepPuzzle) {
    renderPuzzle();
  }
}

elements.menu.addEventListener('click', (event) => {
  const button = event.target.closest('[data-puzzle]');
  if (!button) {
    return;
  }

  activePuzzle = button.dataset.puzzle;
  renderAll();
});

document.querySelector('.tabbar').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-screen-target]');
  if (!tab) {
    return;
  }

  const target = tab.dataset.screenTarget;
  document.querySelectorAll('.tab').forEach((item) => {
    item.classList.toggle('active', item === tab);
  });
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.dataset.screen === target);
  });
});

elements.reset.addEventListener('click', () => {
  Object.assign(state, createDefaultState());
  saveState();
  renderAll();
});

renderAll();
