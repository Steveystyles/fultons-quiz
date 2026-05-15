export default function createWordGrid({ api, auth, onComplete }) {
  const card = document.createElement('article');
  card.className = 'quiz-card word-grid-card';
  card.innerHTML = `
    <div class="word-grid-topline">
      <div>
        <h2>Word Grid</h2>
        <p class="prompt">Guess the hidden five-letter word in six tries.</p>
      </div>
      <button class="ghost-button compact" type="button" data-action="refresh">Refresh</button>
    </div>
    <div class="wordle-meta" data-meta></div>
    <div class="wordle-grid" data-grid aria-label="Word Grid guesses"></div>
    <form class="wordle-form" data-form>
      <input type="text" maxlength="5" autocomplete="off" placeholder="Guess" aria-label="Five-letter word guess">
      <button class="primary-button" type="submit">Enter</button>
    </form>
    <div class="button-row">
      <button class="ghost-button" type="button" data-action="new" hidden>Next word</button>
    </div>
    <p class="feedback" data-feedback></p>
    <div class="wordle-history" data-history></div>
  `;

  const meta = card.querySelector('[data-meta]');
  const grid = card.querySelector('[data-grid]');
  const form = card.querySelector('[data-form]');
  const input = card.querySelector('input');
  const feedback = card.querySelector('[data-feedback]');
  const history = card.querySelector('[data-history]');
  const nextButton = card.querySelector('[data-action="new"]');
  const refreshButton = card.querySelector('[data-action="refresh"]');
  let game = null;
  let completionSent = false;

  function setFeedback(message, tone = '') {
    feedback.className = `feedback ${tone}`;
    feedback.textContent = message;
  }

  function renderSignedOut() {
    meta.innerHTML = `<span class="wordle-chip">${auth.loading ? 'Checking sign-in' : 'Sign in required'}</span>`;
    grid.innerHTML = '';
    form.hidden = true;
    nextButton.hidden = true;
    refreshButton.hidden = true;
    history.innerHTML = '';
    setFeedback(auth.loading
      ? 'Checking for a saved session...'
      : 'Create or enter your name and password above to track your Word Grid answers.');
  }

  function renderGrid() {
    grid.innerHTML = '';
    const guesses = game?.guesses || [];

    for (let row = 0; row < 6; row += 1) {
      const guess = guesses[row];
      for (let col = 0; col < 5; col += 1) {
        const cell = document.createElement('span');
        cell.className = 'wordle-cell';
        if (guess) {
          const result = guess.result[col];
          cell.classList.add(result.status);
          cell.textContent = result.letter.toUpperCase();
        }
        grid.append(cell);
      }
    }
  }

  function renderStats() {
    const stats = game?.stats;
    if (!stats) {
      meta.innerHTML = '';
      history.innerHTML = '';
      return;
    }

    auth.wordleStats = stats;
    meta.innerHTML = `
      <span class="wordle-chip">${stats.summary.found}/${stats.summary.played} found</span>
      <span class="wordle-chip">${stats.summary.winRate}% win rate</span>
      <span class="wordle-chip">${stats.summary.averageGuesses || '-'} avg guesses</span>
    `;

    const answers = stats.answers.slice(0, 5);
    history.innerHTML = answers.length
      ? `
        <h3>Recent words</h3>
        ${answers.map((item) => `
          <div class="wordle-history-row">
            <strong>${item.answer}</strong>
            <span>${item.solved ? 'Found' : 'Missed'} in ${item.guesses}/6</span>
          </div>
        `).join('')}
      `
      : '<p class="panel-copy">Completed words will appear here after your first round.</p>';
  }

  function renderGame() {
    if (!auth.user) {
      renderSignedOut();
      return;
    }

    form.hidden = Boolean(game?.finished);
    nextButton.hidden = !game?.finished;
    refreshButton.hidden = false;
    input.value = '';
    renderGrid();
    renderStats();

    if (game?.finished) {
      setFeedback(
        game.solved
          ? `Solved. The answer was ${game.answer}.`
          : `Out of guesses. The answer was ${game.answer}.`,
        game.solved ? 'good' : 'bad'
      );
      return;
    }

    setFeedback('Letters turn green when they are correct and gold when they are in the word.');
    requestAnimationFrame(() => input.focus());
  }

  async function loadGame() {
    if (!auth.user) {
      renderSignedOut();
      return;
    }

    try {
      setFeedback('Loading your word...');
      game = await api('/api/wordle/state');
      renderGame();
    } catch (error) {
      setFeedback(error.message, 'bad');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const guess = input.value.trim();

    try {
      game = await api('/api/wordle/guess', {
        method: 'POST',
        body: JSON.stringify({ guess })
      });
      renderGame();

      if (game.finished && !completionSent) {
        completionSent = true;
        const attempts = game.guesses.length;
        onComplete({
          correct: game.solved,
          points: game.solved ? Math.max(4, 16 - attempts * 2) : 0,
          summary: game.solved
            ? `Found ${game.answer} in ${attempts}/6`
            : `Missed ${game.answer}`
        });
      }
    } catch (error) {
      setFeedback(error.message, 'bad');
    }
  });

  nextButton.addEventListener('click', async () => {
    try {
      completionSent = false;
      game = await api('/api/wordle/new', { method: 'POST', body: '{}' });
      renderGame();
    } catch (error) {
      setFeedback(error.message, 'bad');
    }
  });

  refreshButton.addEventListener('click', loadGame);

  loadGame();
  return card;
}
