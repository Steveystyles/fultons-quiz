const words = [
  { answer: 'docker', clue: 'Packages the app so it runs consistently.' },
  { answer: 'nginx', clue: 'Routes web traffic to the app container.' },
  { answer: 'ubuntu', clue: 'Recommended server operating system.' },
  { answer: 'github', clue: 'Stores source code and deployment workflow.' },
  { answer: 'certbot', clue: 'Requests and renews HTTPS certificates.' }
];

function shuffle(value) {
  const letters = value.split('');

  for (let index = letters.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [letters[index], letters[swap]] = [letters[swap], letters[index]];
  }

  const shuffled = letters.join('').toUpperCase();
  return shuffled === value.toUpperCase() ? shuffle(value) : shuffled;
}

export default function createWordScramble({ onComplete }) {
  const item = words[Math.floor(Math.random() * words.length)];
  const card = document.createElement('article');
  card.className = 'quiz-card';
  card.innerHTML = `
    <h2>Word Scramble</h2>
    <p class="prompt">Unscramble the deployment word.</p>
    <strong class="scramble-word">${shuffle(item.answer)}</strong>
    <p class="feedback">Hint: ${item.clue}</p>
    <div class="answer-row">
      <input type="text" autocomplete="off" placeholder="Your answer" aria-label="Word scramble answer">
      <button class="primary-button" type="button">Submit</button>
    </div>
    <div class="button-row">
      <button class="ghost-button" type="button" data-action="reshuffle">Reshuffle</button>
    </div>
    <p class="feedback" data-feedback></p>
  `;

  const input = card.querySelector('input');
  const submit = card.querySelector('.primary-button');
  const feedback = card.querySelector('[data-feedback]');
  const scrambled = card.querySelector('.scramble-word');
  let solved = false;

  function checkAnswer() {
    if (solved) {
      return;
    }

    const guess = input.value.trim().toLowerCase();
    const correct = guess === item.answer;
    feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
    feedback.textContent = correct
      ? `Correct. ${item.answer.toUpperCase()} is worth 10 points.`
      : 'Not quite. Check the hint and try again.';

    onComplete({
      correct,
      points: 10,
      summary: correct ? `Solved ${item.answer}` : `Missed ${item.answer}`
    });

    if (correct) {
      solved = true;
      input.disabled = true;
      submit.disabled = true;
    }
  }

  submit.addEventListener('click', checkAnswer);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      checkAnswer();
    }
  });

  card.querySelector('[data-action="reshuffle"]').addEventListener('click', () => {
    scrambled.textContent = shuffle(item.answer);
    input.focus();
  });

  requestAnimationFrame(() => input.focus());
  return card;
}
