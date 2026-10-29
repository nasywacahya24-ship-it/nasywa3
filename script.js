const boardElement = document.getElementById('board');
const playerSelect = document.getElementById('players');
const newGameButton = document.getElementById('new-game');
const diceElement = document.getElementById('dice');
let botDiceElement;
const statusElement = document.getElementById('status');
const turnNameElement = document.getElementById('turn-name');
const playerListElement = document.getElementById('player-list');
const nameFieldsElement = document.getElementById('name-fields');
let startTokensElement;

const ladders = new Map([[3, 22], [8, 30], [20, 41], [28, 55], [36, 57], [51, 67], [71, 91], [80, 99]]);
const snakes = new Map([[17, 7], [54, 34], [62, 19], [64, 60], [87, 24], [93, 73], [95, 75], [98, 79]]);
const colors = ['#df554c', '#3979d0', '#e6a72e', '#874fc0'];
const names = ['Merah', 'Biru', 'Kuning', 'Ungu'];
const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
let players = [];
let currentPlayer = 0;
let gameOver = false;
let botTimer = null;
let diceAnimationInterval = null;
let diceAnimationTimeout = null;
let rolling = false;

function buildBoard() {
  boardElement.replaceChildren();
  for (let row = 9; row >= 0; row -= 1) {
    const numbers = row % 2 === 0
      ? Array.from({ length: 10 }, (_, index) => row * 10 + index + 1)
      : Array.from({ length: 10 }, (_, index) => row * 10 + 10 - index);

    numbers.forEach((number, index) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.gridColumn = String(row % 2 === 0 ? index + 2 : 11 - index);
      cell.style.gridRow = String(10 - row);
      cell.dataset.square = number;
      if (number === 1) cell.classList.add('start');
      if (number === 100) cell.classList.add('finish');
      cell.append(document.createTextNode(number === 100 ? '🏁 100' : String(number)));

      const destination = ladders.get(number) || snakes.get(number);
      if (destination) {
        const marker = document.createElement('span');
        marker.className = 'jump';
        marker.textContent = ladders.has(number) ? '🪜' : '🐍';
        marker.title = `${ladders.has(number) ? 'Tangga ke' : 'Ular ke'} ${destination}`;
        cell.append(marker);
        const target = document.createElement('span');
        target.className = 'target';
        target.textContent = `→${destination}`;
        cell.append(target);
      }

      const tokens = document.createElement('div');
      tokens.className = 'tokens';
      cell.append(tokens);
      boardElement.append(cell);
    });
  }

  const startCell = document.createElement('div');
  startCell.className = 'start-area';
  startCell.style.gridColumn = '1';
  startCell.style.gridRow = '10';
  startCell.innerHTML = '<strong>🚩 KOTAK MULAI</strong><span class="start-hint">Dapat 6 untuk maju ke kotak 1</span><div id="start-tokens" class="tokens"></div>';
  boardElement.append(startCell);
  startTokensElement = startCell.querySelector('.tokens');

  const diceControls = document.createElement('div');
  diceControls.className = 'dice-controls';

  const botDiceRow = document.createElement('div');
  botDiceRow.className = 'dice-player bot-dice-player';
  const botLabel = document.createElement('span');
  botLabel.className = 'dice-player-name';
  botLabel.textContent = 'Bot';
  botDiceElement = document.createElement('div');
  botDiceElement.className = 'dice bot-dice';
  botDiceElement.setAttribute('aria-label', 'Dadu Bot');
  botDiceElement.textContent = '🎲';
  botDiceRow.append(botLabel, botDiceElement);

  const humanDiceRow = document.createElement('div');
  humanDiceRow.className = 'dice-player human-dice-player';
  const humanLabel = document.createElement('span');
  humanLabel.className = 'dice-player-name';
  humanLabel.textContent = 'Kamu';
  humanDiceRow.append(humanLabel, diceElement);

  diceControls.append(botDiceRow, humanDiceRow);
  boardElement.append(diceControls);
}

function updateBoard() {
  document.querySelectorAll('.tokens').forEach((element) => element.replaceChildren());
  players.forEach((player, index) => {
    const cell = player.position === 0
      ? startTokensElement
      : boardElement.querySelector(`[data-square="${player.position}"] .tokens`);
    if (!cell) return;
    const token = document.createElement('span');
    token.className = 'token';
    token.style.backgroundColor = colors[index];
    token.textContent = String(index + 1);
    token.title = player.name;
    cell.append(token);
  });

  playerListElement.replaceChildren();
  boardElement.querySelector('.dice-controls').classList.toggle('bot-mode', playerSelect.value === '1');
  const humanDiceLabel = boardElement.querySelector('.human-dice-player .dice-player-name');
  humanDiceLabel.textContent = playerSelect.value === '1' ? 'Kamu' : players[currentPlayer].name;
  diceElement.setAttribute('aria-label', `Lempar dadu ${humanDiceLabel.textContent}`);
  document.querySelector('.game-panel').insertBefore(playerListElement, document.querySelector('.rules'));
  players.forEach((player, index) => {
    const row = document.createElement('div');
    row.className = `player-row${index === currentPlayer && !gameOver ? ' active' : ''}`;
    const label = document.createElement('span');
    label.className = 'player-label';
    const dot = document.createElement('span');
    dot.className = 'color-dot';
    dot.style.backgroundColor = colors[index];
    label.append(dot, document.createTextNode(player.name));
    const position = document.createElement('span');
    position.textContent = player.position ? `Kotak ${player.position}` : 'Belum keluar';
    row.append(label, position);
    playerListElement.append(row);
  });

  if (players.length) turnNameElement.textContent = gameOver ? 'Permainan selesai' : players[currentPlayer].name;
}

function isBotTurn() {
  return playerSelect.value === '1' && currentPlayer === 1;
}

function setTurnMessage(message) {
  statusElement.textContent = message;
}

function renderNameFields() {
  nameFieldsElement.replaceChildren();
  const count = Number(playerSelect.value);
  if (count === 1) return;

  for (let index = 0; index < count; index += 1) {
    const field = document.createElement('label');
    field.className = 'name-field';
    field.htmlFor = `player-name-${index + 1}`;
    field.append(document.createTextNode(`Nama pemain ${index + 1}`));

    const input = document.createElement('input');
    input.id = `player-name-${index + 1}`;
    input.type = 'text';
    input.maxLength = 18;
    input.placeholder = `Pemain ${index + 1}`;
    input.autocomplete = 'off';
    field.append(input);
    nameFieldsElement.append(field);
  }
}

function finishTurn(extraTurn = false) {
  if (gameOver) return;
  if (!extraTurn) currentPlayer = (currentPlayer + 1) % players.length;
  updateBoard();
  diceElement.disabled = isBotTurn();
  if (isBotTurn()) {
    setTurnMessage('Giliran bot…');
    botTimer = setTimeout(rollDice, 850);
  }
}

function rollDice() {
  if (gameOver || rolling || (isBotTurn() && !botTimer)) return;
  if (botTimer) {
    clearTimeout(botTimer);
    botTimer = null;
  }

  rolling = true;
  const activeDice = isBotTurn() ? botDiceElement : diceElement;
  activeDice.classList.add('rolling');
  diceElement.disabled = true;
  const roll = Math.floor(Math.random() * 6) + 1;
  diceAnimationInterval = setInterval(() => {
    activeDice.textContent = diceFaces[Math.floor(Math.random() * 6)];
  }, 90);
  diceAnimationTimeout = setTimeout(() => {
    clearInterval(diceAnimationInterval);
    diceAnimationInterval = null;
    activeDice.classList.remove('rolling');
    activeDice.textContent = diceFaces[roll - 1];
    rolling = false;
    finishRoll(roll);
  }, 750);
}

function finishRoll(roll) {
  const player = players[currentPlayer];
  let message = `${player.name} mendapat ${roll}. `;
  if (player.position === 0) {
    if (roll !== 6) {
      setTurnMessage(`${message}Harus mendapat 6 untuk keluar dari kotak mulai.`);
      finishTurn();
      return;
    }
    player.position = 1;
    message += 'Keluar dari kotak mulai ke kotak 1! ';
  } else {
    if (player.position + roll > 100) {
      setTurnMessage(`${message}Butuh angka yang pas untuk mencapai 100.`);
      finishTurn(roll === 6);
      return;
    }
    player.position += roll;
  }

  if (ladders.has(player.position)) {
    const landing = player.position;
    player.position = ladders.get(landing);
    message += `Naik tangga dari ${landing} ke ${player.position}! `;
  } else if (snakes.has(player.position)) {
    const landing = player.position;
    player.position = snakes.get(landing);
    message += `Aduh, turun lewat ular dari ${landing} ke ${player.position}. `;
  }

  updateBoard();
  if (player.position === 100) {
    gameOver = true;
    turnNameElement.textContent = `${player.name} menang!`;
    setTurnMessage(`🎉 ${player.name} mencapai kotak 100 dan menang!`);
    diceElement.disabled = true;
    updateBoard();
    return;
  }

  setTurnMessage(message);
  finishTurn(roll === 6);
}

function startNewGame() {
  if (botTimer) clearTimeout(botTimer);
  if (diceAnimationInterval) clearInterval(diceAnimationInterval);
  if (diceAnimationTimeout) clearTimeout(diceAnimationTimeout);
  botTimer = null;
  diceAnimationInterval = null;
  diceAnimationTimeout = null;
  rolling = false;
  diceElement.classList.remove('rolling');
  botDiceElement.classList.remove('rolling');
  const isBotGame = playerSelect.value === '1';
  const count = isBotGame ? 2 : Number(playerSelect.value);
  players = Array.from({ length: count }, (_, index) => {
    const input = document.getElementById(`player-name-${index + 1}`);
    const enteredName = input?.value.trim();
    return {
      name: isBotGame
        ? index === 1 ? 'Bot' : 'Kamu'
        : enteredName || `Pemain ${index + 1}`,
      position: 0,
    };
  });
  currentPlayer = 0;
  gameOver = false;
  diceElement.textContent = '🎲';
  botDiceElement.textContent = '🎲';
  diceElement.disabled = false;
  setTurnMessage(`Klik dadu ${players[0].name} untuk mulai.`);
  updateBoard();
}

buildBoard();
renderNameFields();
startNewGame();
diceElement.addEventListener('click', rollDice);
newGameButton.addEventListener('click', startNewGame);
playerSelect.addEventListener('change', () => {
  renderNameFields();
  startNewGame();
});
