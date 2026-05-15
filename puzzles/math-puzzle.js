const builders = [
  () => {
    const containers = 3 + Math.floor(Math.random() * 5);
    const ports = 2 + Math.floor(Math.random() * 4);
    return {
      prompt: `Each of ${containers} containers exposes ${ports} checks. How many checks run?`,
      expression: `${containers} x ${ports}`,
      answer: containers * ports
    };
  },
  () => {
    const first = 18 + Math.floor(Math.random() * 20);
    const second = 4 + Math.floor(Math.random() * 9);
    return {
      prompt: 'A deploy queue clears completed jobs from pending jobs. What remains?',
      expression: `${first} - ${second}`,
      answer: first - second
    };
  },
  () => {
    const base = 7 + Math.floor(Math.random() * 8);
    const extra = 6 + Math.floor(Math.random() * 8);
    return {
      prompt: 'A quiz round adds two score bonuses. What is the new score?',
      expression: `${base} + ${extra}`,
      answer: base + extra
    };
  }
];

export default function createMathPuzzle({ onComplete }) {
  const problem = builders[Math.floor(Math.random() * builders.length)]();
  const card = document.createElement('article');
  card.className = 'quiz-card';
  card.innerHTML = `
    <h2>Math Puzzle</h2>
    <p class="prompt">${problem.prompt}</p>
    <strong class="math-expression">${problem.expression}</strong>
    <div class="answer-row">
      <input type="number" inputmode="numeric" placeholder="Answer" aria-label="Math answer">
      <button class="primary-button" type="button">Check</button>
    </div>
    <p class="feedback" data-feedback></p>
  `;

  const input = card.querySelector('input');
  const button = card.querySelector('button');
  const feedback = card.querySelector('[data-feedback]');
  let solved = false;

  function checkAnswer() {
    if (solved) {
      return;
    }

    const guess = Number(input.value);
    const correct = Number.isFinite(guess) && guess === problem.answer;
    feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
    feedback.textContent = correct
      ? 'Correct. The build math checks out.'
      : `Try again. ${problem.expression} needs an exact answer.`;

    onComplete({
      correct,
      points: 8,
      summary: correct ? `Solved ${problem.expression}` : `Missed ${problem.expression}`
    });

    if (correct) {
      solved = true;
      input.disabled = true;
      button.disabled = true;
    }
  }

  button.addEventListener('click', checkAnswer);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      checkAnswer();
    }
  });

  requestAnimationFrame(() => input.focus());
  return card;
}
