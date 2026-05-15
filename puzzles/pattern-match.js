const colors = [
  { name: 'Purple', value: '#9b65ff' },
  { name: 'Blue', value: '#2f89ff' },
  { name: 'Green', value: '#39c86a' },
  { name: 'Gold', value: '#e9ad21' }
];

const patterns = [
  [0, 1, 0, 1, 0],
  [2, 2, 3, 2, 2],
  [1, 3, 2, 1, 3],
  [3, 0, 1, 3, 0]
];

function shuffleOptions(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

export default function createPatternMatch({ onComplete }) {
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  const missingIndex = 2 + Math.floor(Math.random() * 2);
  const answer = colors[pattern[missingIndex]];
  const card = document.createElement('article');
  card.className = 'quiz-card';
  card.innerHTML = `
    <h2>Pattern Match</h2>
    <p class="prompt">Find the color that completes the sequence.</p>
    <div class="sequence" aria-label="Color sequence"></div>
    <div class="pattern-options"></div>
    <p class="feedback" data-feedback></p>
  `;

  const sequence = card.querySelector('.sequence');
  const options = card.querySelector('.pattern-options');
  const feedback = card.querySelector('[data-feedback]');
  let answered = false;

  pattern.forEach((colorIndex, index) => {
    const tile = document.createElement('span');
    tile.className = `tile${index === missingIndex ? ' missing' : ''}`;
    tile.style.setProperty('--tile-color', index === missingIndex ? 'transparent' : colors[colorIndex].value);
    tile.textContent = index === missingIndex ? '?' : '';
    sequence.append(tile);
  });

  shuffleOptions(colors).forEach((color) => {
    const button = document.createElement('button');
    button.className = 'pattern-button';
    button.type = 'button';
    button.textContent = color.name;
    button.style.setProperty('--tile-color', color.value);

    button.addEventListener('click', () => {
      if (answered) {
        return;
      }

      answered = true;
      const correct = color.name === answer.name;
      button.classList.add(correct ? 'correct' : 'wrong');
      feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
      feedback.textContent = correct
        ? 'Correct. The sequence is complete.'
        : `Close. The missing tile is ${answer.name}.`;
      sequence.children[missingIndex].style.setProperty('--tile-color', answer.value);
      sequence.children[missingIndex].classList.remove('missing');
      sequence.children[missingIndex].textContent = '';

      [...options.children].forEach((child) => {
        child.disabled = true;
        if (child.textContent === answer.name) {
          child.classList.add('correct');
        }
      });

      onComplete({
        correct,
        points: 9,
        summary: correct ? `Matched ${answer.name}` : `Missed ${answer.name}`
      });
    });

    options.append(button);
  });

  return card;
}
