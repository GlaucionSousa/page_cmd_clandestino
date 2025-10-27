// script.js - Versão corrigida e reorganizada (Opção B)
// Mantive a funcionalidade original; corrigi escopos e organizei o arquivo.
// Firebase config (mantido conforme solicitado)
const firebaseConfig = {
  apiKey: "AIzaSyAchePOmBwkA4C5ljGDVkY83IcvDHyDkkw",
  authDomain: "cmd-clandestino-90a2b.firebaseapp.com",
  databaseURL: "https://cmd-clandestino-90a2b-default-rtdb.firebaseio.com/",
  projectId: "cmd-clandestino-90a2b",
  storageBucket: "cmd-clandestino-90a2b.firebasestorage.app",
  messagingSenderId: "818309972882",
  appId: "1:818309972882:web:82a1e00dd223661137b74b",
};

// Inicialização do Firebase (fallback leve se SDK não for carregado)
if (typeof firebase !== "undefined") {
  try {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.database();
    var tournamentRef = db.ref("commanderTournament");
  } catch (err) {
    console.error("Erro ao inicializar Firebase:", err);
    var tournamentRef = {
      set: () => Promise.resolve(),
      once: (type, cb) => cb({ val: () => null }),
      remove: () => Promise.resolve(),
    };
  }
} else {
  console.error(
    "Firebase SDK não encontrado. Operando em modo local (sem persistência)."
  );
  var tournamentRef = {
    set: () => Promise.resolve(),
    once: (type, cb) => cb({ val: () => null }),
    remove: () => Promise.resolve(),
  };
}

// ==== Dados do torneio (estado global) ====
let players = [];
let decks = [];
let matches = [];
let results = [];
let currentRound = 1;
let notes = [];

// ==== Elementos DOM (cache) ====
const playersList = document.getElementById("players-list");
const playerSelect = document.getElementById("player-select");
const decksList = document.getElementById("decks-list");
const tablesContainer = document.getElementById("tables-container");
const byePlayers = document.getElementById("bye-players");
const matchSelect = document.getElementById("match-select");
const playersResults = document.getElementById("players-results");
const rankingTable = document.getElementById("ranking-table");
const deckAnalysisList = document.getElementById("deck-analysis-list");
const powerLevelChart = document.getElementById("power-level-chart");

// Cronômetro elementos
const timerDisplay = document.getElementById("timer-display");
const startTimerButton = document.getElementById("start-timer");
const resetTimerButton = document.getElementById("reset-timer");

// Variáveis do cronômetro (60 minutos)
let totalTimeSeconds = 60 * 60;
let timeRemaining = totalTimeSeconds;
let timerInterval = null;

// ==== Inicialização de event listeners ====
document.addEventListener("DOMContentLoaded", () => {
  // Carregar dados do Firebase / local
  loadData();

  // Form listeners
  const playerForm = document.getElementById("player-form");
  if (playerForm) playerForm.addEventListener("submit", addPlayer);

  const deckForm = document.getElementById("deck-form");
  if (deckForm) deckForm.addEventListener("submit", addDeck);

  const generateTablesBtn = document.getElementById("generate-tables");
  if (generateTablesBtn)
    generateTablesBtn.addEventListener("click", generateTables);

  const resultForm = document.getElementById("result-form");
  if (resultForm) resultForm.addEventListener("submit", registerResults);

  const savePlayerChangesBtn = document.getElementById("save-player-changes");
  if (savePlayerChangesBtn)
    savePlayerChangesBtn.addEventListener("click", savePlayerChanges);

  const analyzeAllBtn = document.getElementById("analyze-all-decks");
  if (analyzeAllBtn) analyzeAllBtn.addEventListener("click", analyzeAllDecks);

  const noteForm = document.getElementById("note-form");
  if (noteForm) noteForm.addEventListener("submit", addNote);

  const resetTournamentBtn = document.getElementById("reset-tournament-btn");
  if (resetTournamentBtn)
    resetTournamentBtn.addEventListener("click", resetTournament);

  if (matchSelect) matchSelect.addEventListener("change", updatePlayersResults);

  // Timer buttons
  if (startTimerButton) startTimerButton.addEventListener("click", startTimer);
  if (resetTimerButton) resetTimerButton.addEventListener("click", resetTimer);

  // Inicializar display do timer
  updateTimerDisplay();
});

// ==== Persistência ====
function saveData() {
  const dataToSave = {
    players,
    decks,
    matches,
    results,
    currentRound,
    notes,
  };
  tournamentRef
    .set(dataToSave)
    .then(() => console.log("Dados salvos no Firebase."))
    .catch((err) => console.error("Erro ao salvar no Firebase:", err));
}

function loadData() {
  tournamentRef.once("value", (snapshot) => {
    const data = snapshot.val();
    if (data) {
      players = data.players || [];
      decks = data.decks || [];
      matches = data.matches || [];
      results = data.results || [];
      currentRound = data.currentRound || 1;
      notes = data.notes || [];
      // Garante análise consistente para decks existentes
      decks.forEach((deck) => {
        if (!deck.analysis || typeof deck.analysis.powerLevel !== "number") {
          deck.analysis = analyzeDeck(deck);
        }
      });
    } else {
      // inicial vazio
      players = players || [];
      decks = decks || [];
      matches = matches || [];
      results = results || [];
      currentRound = currentRound || 1;
      notes = notes || [];
    }

    // Atualiza interface após carregar dados
    updatePlayersList();
    updatePlayerSelect();
    updateDecksList();
    updateMatchSelect();
    updateRanking();
    updateDeckAnalysis();
    updatePowerLevelChart();
    updateNotesList();
  });
}

// ==== Análise de Decks (escopo global agora) ====
function analyzeDeck(deck) {
  const seed = (deck.name?.length || 0) + (deck.playerId || 0);
  const consistentRandom = (subSeed, min, max) => {
    let h = seed + subSeed;
    h = (h * 9301 + 49297) % 233280;
    return Math.floor((h / 233280) * (max - min + 1)) + min;
  };

  // --- 1. Fatores principais ---

  const winTurnEstimate = consistentRandom(10, 4, 12);
  const hasGameChangers =
    deck.link &&
    [
      "Thassa's Oracle",
      "Demonic Consultation",
      "Dockside Extortionist",
      "Jeweled Lotus",
      "Ad Nauseam",
      "Underworld Breach",
      "Mana Crypt",
    ].some((c) => deck.link.toLowerCase().includes(c.toLowerCase()));

  const tutorDensity = consistentRandom(20, 0, 5);
  const comboDensity = consistentRandom(30, 0, 5);

  // --- 2. Base de poder mais conservadora ---

  // Começa em 3–7, com leve ruído controlado
  let basePower = 3 + consistentRandom(5, 0, 4);

  // Penalização e bônus controlados
  if (winTurnEstimate <= 5) basePower += 2;
  else if (winTurnEstimate >= 10) basePower -= 1;

  if (hasGameChangers) basePower += 2;
  if (tutorDensity >= 4 || comboDensity >= 4) basePower += 1;
  if (tutorDensity <= 1 && comboDensity <= 1) basePower -= 1;

  // Mantém dentro do intervalo 1–10
  basePower = Math.max(1, Math.min(10, basePower));

  // --- 3. Brackets atualizados (alinhados à Moxfield) ---
  let bracket = "";
  if (basePower <= 2) bracket = "Exhibition";
  else if (basePower <= 4) bracket = "Core";
  else if (basePower <= 6) bracket = "Upgraded";
  else if (basePower <= 8) bracket = "Optimized";
  else bracket = "cEDH";

  // --- 4. Métricas secundárias ---
  const synergyScore = consistentRandom(100, 60, 90);
  const consistencyScore = 60 + tutorDensity * 8;
  const resilienceScore = 60 + comboDensity * 5;

  const manaCurve = {
    "0-1": consistentRandom(40, 5, 15),
    2: consistentRandom(50, 10, 20),
    3: consistentRandom(60, 8, 18),
    4: consistentRandom(70, 5, 15),
    "5+": consistentRandom(80, 3, 12),
  };

  const cardTypes = {
    Criaturas: consistentRandom(90, 15, 35),
    Feitiços: consistentRandom(100, 5, 15),
    Encantamentos: consistentRandom(110, 3, 10),
    Artefatos: consistentRandom(120, 5, 15),
    Terrenos: consistentRandom(130, 35, 40),
  };

  // --- 5. Pontos fortes e fracos ---
  const strengths = [];
  const weaknesses = [];

  if (hasGameChangers)
    strengths.push("Inclui cartas de impacto decisivo (Game Changers)");
  if (winTurnEstimate <= 6)
    strengths.push("Curva agressiva, tende a vencer cedo");
  if (tutorDensity >= 3) strengths.push("Alta consistência de tutores");
  if (comboDensity >= 3) strengths.push("Potencial de combos múltiplos");

  if (winTurnEstimate >= 10)
    weaknesses.push("Curva lenta, foco em longo prazo");
  if (resilienceScore < 65)
    weaknesses.push("Baixa resiliência a remoções e hate");
  if (!hasGameChangers) weaknesses.push("Sem peças decisivas de finalização");

  return {
    powerLevel: basePower,
    bracket,
    winTurnEstimate,
    hasGameChangers,
    tutorDensity,
    comboDensity,
    manaCurve,
    cardTypes,
    synergyScore,
    consistencyScore,
    resilienceScore,
    strengths,
    weaknesses,
    analyzedAt: new Date().toISOString(),
  };
}

function analyzeAllDecks() {
  const button = document.getElementById("analyze-all-decks");
  const originalText = button ? button.innerHTML : null;
  if (button) {
    button.innerHTML = '<i class="fas fa-cog fa-spin me-2"></i>Analisando...';
    button.disabled = true;
  }

  setTimeout(() => {
    decks.forEach((deck) => {
      deck.analysis = analyzeDeck(deck);
    });
    updateDecksList();
    updateDeckAnalysis();
    updatePowerLevelChart();
    saveData();
    if (button) {
      button.innerHTML = originalText;
      button.disabled = false;
    }
    alert("Análise de todos os decks concluída!");
  }, 800);
}

// ==== Atualização da UI - Análises ====
function updateDeckAnalysis() {
  if (!deckAnalysisList) return;
  deckAnalysisList.innerHTML = "";

  if (decks.length === 0) {
    deckAnalysisList.innerHTML =
      '<p class="text-center">Nenhum deck cadastrado para análise.</p>';
    return;
  }

  decks.forEach((deck) => {
    const player = players.find((p) => p.id === deck.playerId);
    const analysis = deck.analysis || analyzeDeck(deck);
    if (!player) return;

    const card = document.createElement("div");
    card.className = "deck-analysis-card";
    card.innerHTML = `
      <div class="row">
        <div class="col-md-8">
          <h5>${deck.name} <small>por ${player.name}</small></h5>
          <div class="d-flex align-items-center mb-2">
            <span class="power-level-badge power-level-${
              analysis.powerLevel
            } me-2">
              Power Level: ${analysis.powerLevel}/10
            </span>
            <span class="bracket-badge bracket-${(
              analysis.bracket || ""
            ).toLowerCase()}">
              ${analysis.bracket}
            </span>
          </div>
          <div class="mb-2">
            <small>Sinergia:</small>
            <div class="progress"><div class="progress-bar" style="width: ${
              analysis.synergyScore
            }%"></div></div>
          </div>
          <div class="mb-2">
            <small>Consistência:</small>
            <div class="progress"><div class="progress-bar" style="width: ${
              analysis.consistencyScore
            }%"></div></div>
          </div>
          <div class="mb-2">
            <small>Resiliência:</small>
            <div class="progress"><div class="progress-bar" style="width: ${
              analysis.resilienceScore
            }%"></div></div>
          </div>
        </div>
        <div class="col-md-4 text-end">
          <button class="btn btn-halloween btn-sm view-detailed-analysis" data-id="${
            deck.id
          }">
            <i class="fas fa-chart-line me-1"></i>Análise Detalhada
          </button>
        </div>
      </div>
    `;
    deckAnalysisList.appendChild(card);
  });

  document.querySelectorAll(".view-detailed-analysis").forEach((btn) => {
    btn.addEventListener("click", function () {
      const deckId = parseInt(this.getAttribute("data-id"));
      showDetailedAnalysis(deckId);
    });
  });
}

function showDetailedAnalysis(deckId) {
  const deck = decks.find((d) => d.id === deckId);
  if (!deck) return;
  const player = players.find((p) => p.id === deck.playerId) || {
    name: "Desconhecido",
  };
  const analysis = deck.analysis || analyzeDeck(deck);

  let manaCurveHTML = "";
  for (const [cost, count] of Object.entries(analysis.manaCurve)) {
    manaCurveHTML += `<div class="col-2 text-center"><small>${cost}</small><br><strong>${count}</strong></div>`;
  }

  let cardTypesHTML = "";
  for (const [type, count] of Object.entries(analysis.cardTypes)) {
    cardTypesHTML += `<div class="col text-center"><small>${type}</small><br><strong>${count}</strong></div>`;
  }

  let strengthsHTML = "";
  analysis.strengths.forEach((s) => (strengthsHTML += `<li>${s}</li>`));
  let weaknessesHTML = "";
  analysis.weaknesses.forEach((w) => (weaknessesHTML += `<li>${w}</li>`));

  const detailed = document.getElementById("detailed-analysis-content");
  if (!detailed) return;

  detailed.innerHTML = `
    <h4>${deck.name} <small>por ${player.name}</small></h4>
    <div class="row mb-4">
      <div class="col-md-6">
        <div class="d-flex align-items-center mb-2">
          <span class="power-level-badge power-level-${
            analysis.powerLevel
          } me-2">Power Level: ${analysis.powerLevel}/10</span>
          <span class="bracket-badge bracket-${(
            analysis.bracket || ""
          ).toLowerCase()}">${analysis.bracket}</span>
        </div>
        <p><small>Analisado em: ${new Date(analysis.analyzedAt).toLocaleString(
          "pt-BR"
        )}</small></p>
      </div>
      <div class="col-md-6 text-end">
        <a href="${deck.link}" class="btn btn-halloween btn-sm" target="_blank">
          <i class="fas fa-external-link-alt me-1"></i>Ver Deck na LigaMagic
        </a>
      </div>
    </div>

    <h5>Métricas de Desempenho</h5>
    <div class="row mb-4">
      <div class="col-md-4 text-center">
        <h6>Sinergia</h6>
        <div class="progress" style="height:20px;"><div class="progress-bar" style="width:${
          analysis.synergyScore
        }%">${analysis.synergyScore}%</div></div>
        <small>Como as cartas trabalham juntas</small>
      </div>
      <div class="col-md-4 text-center">
        <h6>Consistência</h6>
        <div class="progress" style="height:20px;"><div class="progress-bar" style="width:${
          analysis.consistencyScore
        }%">${analysis.consistencyScore}%</div></div>
        <small>Frequência de jogadas ideais</small>
      </div>
      <div class="col-md-4 text-center">
        <h6>Resiliência</h6>
        <div class="progress" style="height:20px;"><div class="progress-bar" style="width:${
          analysis.resilienceScore
        }%">${analysis.resilienceScore}%</div></div>
        <small>Capacidade de recuperação</small>
      </div>
    </div>

    <h5>Composição do Deck</h5>
    <div class="row mb-4"><div class="col-12"><h6>Curva de Mana</h6><div class="row text-center">${manaCurveHTML}</div></div></div>
    <div class="row mb-4"><div class="col-12"><h6>Tipos de Cartas</h6><div class="row text-center">${cardTypesHTML}</div></div></div>

    <div class="row">
      <div class="col-md-6"><h5>Pontos Fortes</h5><ul>${strengthsHTML}</ul></div>
      <div class="col-md-6"><h5>Áreas para Melhoria</h5><ul>${weaknessesHTML}</ul></div>
    </div>
  `;

  // Exibe modal (bootstrap)
  if (typeof bootstrap !== "undefined") {
    const modal = new bootstrap.Modal(
      document.getElementById("deckAnalysisModal")
    );
    modal.show();
  }
}

// ==== Gráfico de Power Levels ====
function updatePowerLevelChart() {
  if (!powerLevelChart) return;
  const powerLevelCounts = {};
  for (let i = 1; i <= 10; i++) powerLevelCounts[i] = 0;

  decks.forEach((deck) => {
    if (deck.analysis && typeof deck.analysis.powerLevel === "number") {
      const pl = deck.analysis.powerLevel;
      if (pl >= 1 && pl <= 10) powerLevelCounts[pl]++;
    }
  });

  powerLevelChart.innerHTML = '<canvas id="powerLevelChartCanvas"></canvas>';
  const ctx = document.getElementById("powerLevelChartCanvas");
  if (!ctx) return;
  const ctx2d = ctx.getContext("2d");

  if (window.powerLevelChartInstance) window.powerLevelChartInstance.destroy();

  window.powerLevelChartInstance = new Chart(ctx2d, {
    type: "bar",
    data: {
      labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
      datasets: [
        {
          label: "Número de Decks",
          data: Object.values(powerLevelCounts),
          backgroundColor: [
            "#4a4a4a",
            "#5a5a5a",
            "#7a7a7a",
            "#8a8a8a",
            "#9a9a9a",
            "#aaaaaa",
            "#ffcc00",
            "#ff9900",
            "#ff6600",
            "#ff3300",
          ],
          borderColor: [
            "#2a2a2a",
            "#3a3a3a",
            "#4a4a4a",
            "#5a5a5a",
            "#6a6a6a",
            "#7a7a7a",
            "#cc9900",
            "#cc6600",
            "#cc3300",
            "#cc0000",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Distribuição de Power Levels" },
      },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
    },
  });
}

// ==== Utilitários ====
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ==== Mesas e Sorteio ====
function generateTables() {
  matches = [];
  let availablePlayers = [...players];

  // Ordena por power level do deck do jogador (default 5)
  availablePlayers.sort((a, b) => {
    const da = decks.find((d) => d.playerId === a.id);
    const db = decks.find((d) => d.playerId === b.id);
    const pa = da ? da.analysis.powerLevel : 5;
    const pb = db ? db.analysis.powerLevel : 5;
    return pa - pb;
  });

  // Intercala para balancear
  const balancedPlayers = [];
  const mid = Math.ceil(availablePlayers.length / 2);
  const firstHalf = availablePlayers.slice(0, mid);
  const secondHalf = availablePlayers.slice(mid).reverse();

  for (let i = 0; i < Math.max(firstHalf.length, secondHalf.length); i++) {
    if (i < firstHalf.length) balancedPlayers.push(firstHalf[i]);
    if (i < secondHalf.length) balancedPlayers.push(secondHalf[i]);
  }

  shuffleArray(balancedPlayers);

  while (balancedPlayers.length >= 4) {
    const tablePlayers = balancedPlayers.splice(0, 4);
    const match = {
      id: Date.now() + Math.random(),
      round: currentRound,
      players: tablePlayers.map((p) => p.id),
    };
    matches.push(match);
  }

  const byePlayersList = [...balancedPlayers];
  byePlayersList.forEach((player) => {
    const idx = players.findIndex((p) => p.id === player.id);
    if (idx !== -1) {
      players[idx].byes = (players[idx].byes || 0) + 1;
      players[idx].points = (players[idx].points || 0) + 3;
    }
  });

  updateTablesDisplay();
  updateByesDisplay(byePlayersList);
  updateMatchSelect();
  saveData();
}

function updateTablesDisplay() {
  if (!tablesContainer) return;
  tablesContainer.innerHTML = "";
  if (matches.length === 0) {
    tablesContainer.innerHTML =
      '<p class="text-center">Nenhuma mesa sorteada ainda.</p>';
    return;
  }

  matches.forEach((match, index) => {
    let playersHtml = "";
    let totalPowerLevel = 0;
    let playerCount = 0;
    match.players.forEach((playerId) => {
      const player = players.find((p) => p.id === playerId);
      const deck = decks.find((d) => d.playerId === playerId);
      if (!player) return;
      const powerLevel = deck ? deck.analysis.powerLevel : "N/A";
      if (deck) {
        totalPowerLevel += deck.analysis.powerLevel;
        playerCount++;
      }
      playersHtml += `<div class="player-card mb-2"><i class="fas fa-user me-2"></i>${
        player.name
      } ${
        deck
          ? `<span class="power-level-badge power-level-${powerLevel} ms-2">${powerLevel}/10</span>`
          : ""
      }</div>`;
    });

    const avgPowerLevel =
      playerCount > 0 ? (totalPowerLevel / playerCount).toFixed(1) : "N/A";
    const tableCard = document.createElement("div");
    tableCard.className = "match-card";
    tableCard.innerHTML = `<h5><i class="fas fa-chess-board me-2"></i>Mesa ${
      index + 1
    } - Rodada ${
      match.round
    }</h5><p><small>Power Level Médio: <strong>${avgPowerLevel}</strong></small></p>${playersHtml}`;
    tablesContainer.appendChild(tableCard);
  });
}

function updateByesDisplay(byePlayersList) {
  if (!byePlayers) return;
  byePlayers.innerHTML = "";
  if (!byePlayersList || byePlayersList.length === 0) {
    byePlayers.innerHTML = '<p class="text-center">Nenhum jogador com bye.</p>';
    return;
  }
  byePlayersList.forEach((player) => {
    const deck = decks.find((d) => d.playerId === player.id);
    const powerLevel = deck ? deck.analysis.powerLevel : "N/A";
    const byeCard = document.createElement("div");
    byeCard.className = "player-card mb-2";
    byeCard.innerHTML = `<i class="fas fa-user-clock me-2"></i>${player.name} ${
      deck
        ? `<span class="power-level-badge power-level-${powerLevel} ms-2">${powerLevel}/10</span>`
        : ""
    }<br><small>Recebeu bye (+3 pontos)</small>`;
    byePlayers.appendChild(byeCard);
  });
}

function updateMatchSelect() {
  if (!matchSelect) return;
  matchSelect.innerHTML = '<option value="">Selecione uma mesa</option>';
  matches.forEach((match, index) => {
    const option = document.createElement("option");
    option.value = match.id;
    option.textContent = `Mesa ${index + 1} - Rodada ${match.round}`;
    matchSelect.appendChild(option);
  });
}

// ==== Resultados ====
function updatePlayersResults() {
  if (!playersResults || !matchSelect) return;
  playersResults.innerHTML = "";
  const matchId = matchSelect.value;
  if (!matchId) return;
  const match = matches.find((m) => m.id === parseFloat(matchId));
  if (!match) return;

  match.players.forEach((playerId) => {
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    const resultDiv = document.createElement("div");
    resultDiv.className = "mb-3";
    resultDiv.innerHTML = `
      <label class="form-label">${player.name}</label>
      <div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" name="result-${playerId}" id="win-${playerId}" value="win">
          <label class="form-check-label" for="win-${playerId}">Vitória</label>
        </div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" name="result-${playerId}" id="draw-${playerId}" value="draw">
          <label class="form-check-label" for="draw-${playerId}">Empate</label>
        </div>
        <div class="form-check form-check-inline">
          <input class="form-check-input" type="radio" name="result-${playerId}" id="loss-${playerId}" value="loss" checked>
          <label class="form-check-label" for="loss-${playerId}">Derrota</label>
        </div>
      </div>
    `;
    playersResults.appendChild(resultDiv);
  });
}

function registerResults(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!matchSelect) return;
  const matchId = parseFloat(matchSelect.value);
  if (!matchId) return;
  const match = matches.find((m) => m.id === matchId);
  if (!match) return;
  if (match.completed) {
    alert("Esta partida já teve o resultado registrado.");
    return;
  }

  // Valida seleções e conta vitórias
  let winCount = 0;
  for (const playerId of match.players) {
    const input = document.querySelector(
      `input[name="result-${playerId}"]:checked`
    );
    if (!input) {
      alert("Por favor, selecione um resultado para todos os jogadores.");
      return;
    }
    if (input.value === "win") winCount++;
  }
  if (winCount !== 1) {
    alert("Deve haver exatamente 1 vencedor por mesa! Revise os resultados.");
    return;
  }

  // Registrar
  match.players.forEach((playerId) => {
    const val = document.querySelector(
      `input[name="result-${playerId}"]:checked`
    ).value;
    const idx = players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    if (val === "win") {
      players[idx].wins = (players[idx].wins || 0) + 1;
      players[idx].points = (players[idx].points || 0) + 3;
    } else if (val === "draw") {
      players[idx].draws = (players[idx].draws || 0) + 1;
      players[idx].points = (players[idx].points || 0) + 1;
    } else {
      players[idx].losses = (players[idx].losses || 0) + 1;
    }
  });

  match.completed = true;

  const allCompleted = matches
    .filter((m) => m.round === currentRound)
    .every((m) => m.completed);
  if (allCompleted) currentRound++;

  updateRanking();
  updateTablesDisplay();
  saveData();

  alert(
    "Resultados registrados com sucesso! " +
      (allCompleted
        ? `Próxima rodada: ${currentRound}`
        : "Aguardando resultados das demais mesas.")
  );
  if (document.getElementById("result-form"))
    document.getElementById("result-form").reset();
  playersResults.innerHTML = "";
  updateMatchSelect();
}

// ==== Ranking ====
function updateRanking() {
  if (!rankingTable) return;
  rankingTable.innerHTML = "";
  const sorted = [...players].sort((a, b) => (b.points || 0) - (a.points || 0));
  sorted.forEach((p, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${i + 1}</td><td>${p.name}</td><td>${
      p.wins || 0
    }</td><td>${p.draws || 0}</td><td>${p.losses || 0}</td><td>${
      p.byes || 0
    }</td><td>${p.points || 0}</td>`;
    rankingTable.appendChild(row);
  });
}

// ==== Notas ====
function addNote(e) {
  if (e && e.preventDefault) e.preventDefault();
  const noteTextEl = document.getElementById("note-text");
  if (!noteTextEl) return;
  const noteText = noteTextEl.value.trim();
  if (!noteText) return;
  const newNote = {
    id: Date.now(),
    text: noteText,
    timestamp: new Date().toLocaleString("pt-BR"),
  };
  notes.push(newNote);
  updateNotesList();
  saveData();
  if (document.getElementById("note-form"))
    document.getElementById("note-form").reset();
}

function deleteNote(noteId) {
  if (!confirm("Tem certeza que deseja remover esta nota?")) return;
  notes = notes.filter((n) => n.id !== noteId);
  updateNotesList();
  saveData();
}

function updateNotesList() {
  const notesList = document.getElementById("notes-list");
  if (!notesList) return;
  notesList.innerHTML = "";
  if (notes.length === 0) {
    notesList.innerHTML =
      '<p class="text-center">Nenhuma nota adicionada ainda.</p>';
    return;
  }
  [...notes].reverse().forEach((note) => {
    const div = document.createElement("div");
    div.className = "card mb-3";
    div.style.backgroundColor = "rgba(255,117,24,0.1)";
    div.innerHTML = `<div class="card-body"><p class="card-text">${note.text}</p><div class="d-flex justify-content-between align-items-center"><small class="text-muted"><i class="fas fa-clock me-1"></i>${note.timestamp}</small><button class="btn btn-sm btn-danger delete-note" data-id="${note.id}"><i class="fas fa-trash"></i></button></div></div>`;
    notesList.appendChild(div);
  });

  document.querySelectorAll(".delete-note").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-id"));
      deleteNote(id);
    });
  });
}

// ==== Cronômetro ====
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}
function updateTimerDisplay() {
  if (!timerDisplay) return;
  timerDisplay.textContent = formatTime(timeRemaining);
  timerDisplay.classList.remove(
    "timer-running",
    "timer-paused",
    "timer-finished"
  );
  if (timerInterval) {
    timerDisplay.classList.add("timer-running");
    if (startTimerButton) {
      startTimerButton.innerHTML = '<i class="fas fa-pause me-2"></i>Pausar';
      startTimerButton.classList.remove("btn-halloween");
      startTimerButton.classList.add("btn-warning");
    }
  } else {
    if (startTimerButton) {
      startTimerButton.innerHTML = '<i class="fas fa-play me-2"></i>Iniciar';
      startTimerButton.classList.remove("btn-warning");
      startTimerButton.classList.add("btn-halloween");
    }
    if (timeRemaining === 0) timerDisplay.classList.add("timer-finished");
    else timerDisplay.classList.add("timer-paused");
  }
}
function startTimer() {
  if (timerInterval === null && timeRemaining > 0) {
    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay();
      if (timeRemaining <= 0) {
        stopTimer();
        alert("Tempo de rodada encerrado!");
        timeRemaining = 0;
        updateTimerDisplay();
      }
    }, 1000);
    updateTimerDisplay();
  } else {
    stopTimer();
  }
}
function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  updateTimerDisplay();
}
function resetTimer() {
  stopTimer();
  timeRemaining = totalTimeSeconds;
  updateTimerDisplay();
}

// ==== Reset torneio ====
function resetTournament() {
  if (
    !confirm(
      "Tem certeza que deseja RESETAR O TORNEIO? Todos os jogadores, decks, resultados e notas serão perdidos!"
    )
  )
    return;

  players = [];
  decks = [];
  matches = [];
  results = [];
  currentRound = 1;
  notes = [];

  tournamentRef
    .remove()
    .then(() => console.log("Dados removidos do Firebase."))
    .catch((err) => console.error("Erro ao remover:", err));
  updatePlayersList();
  updatePlayerSelect();
  updateDecksList();
  updateDeckAnalysis();
  updatePowerLevelChart();
  updateTablesDisplay();
  updateByesDisplay([]);
  updateMatchSelect();
  updateRanking();
  updateNotesList();
  alert("Torneio resetado com sucesso!");
}

// ==== Jogadores ====
function addPlayer(e) {
  if (e && e.preventDefault) e.preventDefault();
  const nameEl = document.getElementById("player-name");
  if (!nameEl) return;
  const playerName = nameEl.value.trim();
  if (!playerName) return;
  const newPlayer = {
    id: Date.now(),
    name: playerName,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    points: 0,
  };
  players.push(newPlayer);
  updatePlayersList();
  updatePlayerSelect();
  saveData();
  if (document.getElementById("player-form"))
    document.getElementById("player-form").reset();
}

function updatePlayersList() {
  if (!playersList) return;
  playersList.innerHTML = "";
  players.forEach((player) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${player.name}</td><td><button class="btn btn-sm btn-halloween me-1 edit-player" data-id="${player.id}"><i class="fas fa-edit"></i></button><button class="btn btn-sm btn-danger delete-player" data-id="${player.id}"><i class="fas fa-trash"></i></button></td>`;
    playersList.appendChild(row);
  });

  document.querySelectorAll(".edit-player").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-id"));
      editPlayer(id);
    });
  });
  document.querySelectorAll(".delete-player").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-id"));
      deletePlayer(id);
    });
  });
}

function updatePlayerSelect() {
  if (!playerSelect) return;
  playerSelect.innerHTML = '<option value="">Selecione um jogador</option>';
  players.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.name;
    playerSelect.appendChild(option);
  });
}

function editPlayer(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (!player) return;
  const idEl = document.getElementById("edit-player-id");
  const nameEl = document.getElementById("edit-player-name");
  if (!idEl || !nameEl) return;
  idEl.value = player.id;
  nameEl.value = player.name;
  if (typeof bootstrap !== "undefined") {
    const modal = new bootstrap.Modal(
      document.getElementById("editPlayerModal")
    );
    modal.show();
  }
}

function savePlayerChanges() {
  const idEl = document.getElementById("edit-player-id");
  const nameEl = document.getElementById("edit-player-name");
  if (!idEl || !nameEl) return;
  const playerId = parseInt(idEl.value);
  const newName = nameEl.value.trim();
  if (!newName) return;
  const idx = players.findIndex((p) => p.id === playerId);
  if (idx === -1) return;
  players[idx].name = newName;
  updatePlayersList();
  updatePlayerSelect();
  updateDecksList();
  saveData();
  const modalInstance = bootstrap.Modal.getInstance(
    document.getElementById("editPlayerModal")
  );
  if (modalInstance) modalInstance.hide();
}

function deletePlayer(playerId) {
  if (!confirm("Tem certeza que deseja remover este jogador?")) return;
  players = players.filter((p) => p.id !== playerId);
  decks = decks.filter((d) => d.playerId !== playerId);
  updatePlayersList();
  updatePlayerSelect();
  updateDecksList();
  updateDeckAnalysis();
  updatePowerLevelChart();
  saveData();
}

// ==== Decks ====
function addDeck(e) {
  if (e && e.preventDefault) e.preventDefault();
  const playerId = parseInt(playerSelect.value);
  const deckNameEl = document.getElementById("deck-name");
  const deckLinkEl = document.getElementById("deck-link");
  if (!deckNameEl || !deckLinkEl) return;
  const deckName = deckNameEl.value.trim();
  const deckLink = deckLinkEl.value.trim();
  if (!playerId || !deckName || !deckLink) {
    alert("Preencha jogador, nome e link do deck.");
    return;
  }
  const newDeck = {
    id: Date.now(),
    playerId: playerId,
    name: deckName,
    link: deckLink,
  };
  newDeck.analysis = analyzeDeck(newDeck);
  decks.push(newDeck);
  updateDecksList();
  updateDeckAnalysis();
  updatePowerLevelChart();
  saveData();
  if (document.getElementById("deck-form"))
    document.getElementById("deck-form").reset();
}

function updateDecksList() {
  if (!decksList) return;
  decksList.innerHTML = "";
  decks.forEach((deck) => {
    const player = players.find((p) => p.id === deck.playerId);
    if (!player) return;
    const analysis = deck.analysis || analyzeDeck(deck);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${player.name}</td>
      <td>${deck.name}</td>
      <td><span class="power-level-badge power-level-${analysis.powerLevel}">${
      analysis.powerLevel
    }/10</span></td>
      <td><span class="bracket-badge bracket-${(
        analysis.bracket || ""
      ).toLowerCase()}">${analysis.bracket}</span></td>
      <td><a href="${
        deck.link
      }" class="deck-link" target="_blank">Ver Deck</a></td>
      <td>
        <button class="btn btn-sm btn-halloween me-1 view-analysis" data-id="${
          deck.id
        }"><i class="fas fa-chart-line"></i></button>
        <button class="btn btn-sm btn-danger delete-deck" data-id="${
          deck.id
        }"><i class="fas fa-trash"></i></button>
      </td>
    `;
    decksList.appendChild(row);
  });

  document.querySelectorAll(".delete-deck").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-id"));
      deleteDeck(id);
    });
  });
  document.querySelectorAll(".view-analysis").forEach((btn) => {
    btn.addEventListener("click", function () {
      const id = parseInt(this.getAttribute("data-id"));
      showDetailedAnalysis(id);
    });
  });
}

function deleteDeck(deckId) {
  if (!confirm("Tem certeza que deseja remover este deck?")) return;
  decks = decks.filter((d) => d.id !== deckId);
  updateDecksList();
  updateDeckAnalysis();
  updatePowerLevelChart();
  saveData();
}
