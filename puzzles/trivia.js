const questions = [
  {
    prompt: 'Which service acts as the public reverse proxy in the tutorial?',
    choices: ['Nginx', 'SQLite', 'Redis', 'PM2'],
    answer: 'Nginx'
  },
  {
    prompt: 'Which command starts the composed app stack after a rebuild?',
    choices: ['docker compose up -d --build', 'npm test --watch', 'git remote prune origin', 'sudo ufw delete allow 80'],
    answer: 'docker compose up -d --build'
  },
  {
    prompt: 'Which GitHub feature can deploy the app when secrets are configured?',
    choices: ['Actions', 'Discussions', 'Sponsors', 'Projects'],
    answer: 'Actions'
  },
  {
    prompt: "Which tool is used to request the Let's Encrypt certificate?",
    choices: ['Certbot', 'Compose', 'Node', 'UFW'],
    answer: 'Certbot'
  }
];

export default function createTrivia({ onComplete }) {
  const question = questions[Math.floor(Math.random() * questions.length)];
  const card = document.createElement('article');
  card.className = 'quiz-card';
  card.innerHTML = `
    <h2>Trivia</h2>
    <p class="prompt">${question.prompt}</p>
    <div class="choice-grid"></div>
    <p class="feedback" data-feedback></p>
  `;

  const grid = card.querySelector('.choice-grid');
  const feedback = card.querySelector('[data-feedback]');
  let answered = false;

  question.choices.forEach((choice) => {
    const button = document.createElement('button');
    button.className = 'choice-button';
    button.type = 'button';
    button.textContent = choice;
    button.addEventListener('click', () => {
      if (answered) {
        return;
      }

      answered = true;
      const correct = choice === question.answer;
      button.classList.add(correct ? 'correct' : 'wrong');
      feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
      feedback.textContent = correct
        ? 'Correct. That answer belongs in the deploy path.'
        : `No points this time. The answer is ${question.answer}.`;

      [...grid.children].forEach((child) => {
        child.disabled = true;
        if (child.textContent === question.answer) {
          child.classList.add('correct');
        }
      });

      onComplete({
        correct,
        points: 7,
        summary: correct ? `Answered ${question.answer}` : `Picked ${choice}`
      });
    });
    grid.append(button);
  });

  return card;
}
