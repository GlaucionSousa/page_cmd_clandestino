// ===================================================================
// PASSO 1: CONFIGURAÇÃO DO FIREBASE
// VOCÊ DEVE SUBSTITUIR ESTAS CHAVES PELAS SUAS DO CONSOLE FIREBASE
// ===================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAchePOmBwkA4C5ljGDVkY83IcvDHyDkkw", // <--- SUBSTITUIR
  authDomain: "cmd-clandestino-90a2b.firebaseapp.com", // <--- SUBSTITUIR
  databaseURL: "https://cmd-clandestino-90a2b-default-rtdb.firebaseio.com/", // <--- SUBSTITUIR
  projectId: "cmd-clandestino-90a2b", // <--- SUBSTITUIR
  storageBucket: "cmd-clandestino-90a2b.firebasestorage.app",
  messagingSenderId: "818309972882",
  appId: "1:818309972882:web:82a1e00dd223661137b74b",
};

// Inicializa o Firebase e define a referência principal
// Esta função DEVE ser chamada antes do loadData()
if (typeof firebase !== "undefined") {
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  var tournamentRef = db.ref("commanderTournament"); // Nó principal no banco de dados
} else {
  console.error(
    "Firebase SDK não carregado. Verifique a inclusão no index.html."
  );
  // Cria um objeto placeholder para evitar erros se o Firebase falhar
  var tournamentRef = {
    set: () => Promise.resolve(),
    once: (type, callback) => callback({ val: () => null }),
  };
}
// ===================================================================

// Dados do torneio
let players = [];
let decks = [];
let matches = [];
let results = [];
let currentRound = 1;
let notes = [];

// Elementos DOM
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

// Inicialização
document.addEventListener("DOMContentLoaded", function () {
  // Carregar dados do Firebase. loadData() agora é assíncrona e chama as atualizações de UI internamente.
  loadData();

  // Configurar event listeners
  document.getElementById("player-form").addEventListener("submit", addPlayer);
  document.getElementById("deck-form").addEventListener("submit", addDeck);
  document
    .getElementById("generate-tables")
    .addEventListener("click", generateTables);
  document
    .getElementById("result-form")
    .addEventListener("submit", registerResults);
  document
    .getElementById("save-player-changes")
    .addEventListener("click", savePlayerChanges);
  document
    .getElementById("analyze-all-decks")
    .addEventListener("click", analyzeAllDecks);
  document.getElementById("note-form").addEventListener("submit", addNote);
  document
    .getElementById("reset-tournament-btn")
    .addEventListener("click", resetTournament);

  // Atualizar lista de jogadores quando o select de mesa mudar
  matchSelect.addEventListener("change", updatePlayersResults);
});

// Funções de dados

// ALTERADO: Agora salva dados no Firebase
function saveData() {
  const dataToSave = {
    players: players,
    decks: decks,
    matches: matches,
    results: results,
    currentRound: currentRound,
    notes: notes,
  };

  // Salva no Firebase (assíncrono)
  tournamentRef
    .set(dataToSave)
    .then(() => {
      console.log("Dados salvos no Firebase com sucesso!");
    })
    .catch((error) => {
      console.error("Erro ao salvar dados no Firebase:", error);
    });

  // REMOVIDO: localStorage.setItem(...)
}

// ALTERADO: Agora carrega dados do Firebase (Assíncrono)
function loadData() {
  // Busca dados do Firebase uma única vez
  tournamentRef.once("value", (snapshot) => {
    const data = snapshot.val(); // Pega o objeto de dados

    if (data) {
      players = data.players || [];
      decks = data.decks || [];
      matches = data.matches || [];
      results = data.results || [];
      currentRound = data.currentRound || 1;
      notes = data.notes || [];

      // Garantir que todos os decks tenham análise
      decks.forEach((deck) => {
        // Re-analisar decks que não têm a nova lógica, se necessário.
        if (
          !deck.analysis ||
          deck.analysis.powerLevel < 1 ||
          deck.analysis.powerLevel > 10
        ) {
          deck.analysis = analyzeDeck(deck);
        }
      });

      // Chamada das funções de atualização DEVE ser aqui, dentro do callback do Firebase
      // Para garantir que os dados já foram carregados antes de atualizar a UI.
      updatePlayersList();
      updatePlayerSelect();
      updateDecksList();
      updateMatchSelect();
      updateRanking();
      updateDeckAnalysis();
      updatePowerLevelChart();
      updateNotesList();
    } else {
      console.log(
        "Nenhum dado encontrado no Firebase. Iniciando novo torneio."
      );
      // Se não houver dados no banco, garanta que a UI inicialize limpa
      updatePlayersList();
      updatePlayerSelect();
      updateDecksList();
      updateMatchSelect();
      updateRanking();
      updateDeckAnalysis();
      updatePowerLevelChart();
      updateNotesList();
    }
  });

  // Funções de análise de decks
  function analyzeDeck(deck) {
    // Simulação de uma IA analisando o deck

    // 1. Geração da Seed Consistente
    // A seed garante que o mesmo deck (mesmo nome + mesmo jogador) sempre terá o mesmo resultado.
    const seed = deck.name.length + deck.playerId;

    // 2. Função HASH para Power Level (PRNG Simples e Consistente)
    // Usaremos uma função hash simples para gerar um número a partir da seed.
    let hash = seed;
    hash = (hash * 9301 + 49297) % 233280; // Fórmula de hash simples

    // 3. Mapeamento para o Power Level (1 a 10)
    // Mapeamos o resultado do hash para um valor de 1 a 10
    const powerLevel = Math.floor((hash / 233280) * 10) + 1;
    // O resultado será entre 1 (incluído) e 10 (incluído).

    let bracket;

    // Lógica para incluir o bracket "Jank" (PL 1-2) e reajustar os demais
    if (powerLevel <= 2) bracket = "Jank"; // Nível 1-2
    else if (powerLevel <= 4) bracket = "Casual"; // Nível 3-4
    else if (powerLevel <= 6) bracket = "Focused"; // Nível 5-6
    else if (powerLevel <= 8) bracket = "Optimized"; // Nível 7-8
    else bracket = "Competitive"; // Nível 9-10

    // AQUI É ONDE REQUER MUDANÇAS ADICIONAIS
    // Para que os scores também sejam consistentes:

    // Função para gerar um número consistentemente baseado em uma segunda seed (para scores)
    const consistentRandom = (subSeed, min, max) => {
      let secondaryHash = seed + subSeed; // A base é a seed do deck + um valor único para o score
      secondaryHash = (secondaryHash * 9301 + 49297) % 233280;
      return Math.floor((secondaryHash / 233280) * (max - min + 1)) + min;
    };

    // Fatores de análise (simulados) - AGORA USANDO consistentRandom()
    const manaCurve = {
      "0-1": consistentRandom(10, 5, 15),
      2: consistentRandom(20, 10, 20),
      3: consistentRandom(30, 8, 18),
      4: consistentRandom(40, 5, 15),
      "5+": consistentRandom(50, 3, 12),
    };

    const cardTypes = {
      Criaturas: consistentRandom(60, 15, 35),
      Feitiços: consistentRandom(70, 5, 15),
      Encantamentos: consistentRandom(80, 3, 10),
      Artefatos: consistentRandom(90, 5, 15),
      Terrenos: consistentRandom(100, 35, 40),
    };

    // Scores
    const synergyScore = consistentRandom(110, 60, 95);
    const consistencyScore = consistentRandom(120, 65, 90);
    const resilienceScore = consistentRandom(130, 50, 85);

    // Pontos fortes e fracos (simulados)
    const allStrengths = [
      "Curva de mana eficiente",
      "Boa interação com o commander",
      "Recuperação de jogo consistente",
      "Variedade de respostas",
    ];
    const allWeaknesses = [
      "Vulnerável a hate específico",
      "Pouca interação no early game",
      "Dependência de peças-chave",
      "Recuperação limitada após board wipe",
    ];

    // Seleção consistente de pontos fortes e fracos
    const strengths = allStrengths.filter((_, i) =>
      consistentRandom(200 + i, 0, 1)
    ); // 50% de chance consistente
    const weaknesses = allWeaknesses.filter((_, i) =>
      consistentRandom(300 + i, 0, 1)
    ); // 50% de chance consistente

    return {
      powerLevel,
      bracket,
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
    const originalText = button.innerHTML;

    button.innerHTML = '<i class="fas fa-cog fa-spin me-2"></i>Analisando...';
    button.disabled = true;

    // Simular tempo de análise
    setTimeout(() => {
      decks.forEach((deck) => {
        deck.analysis = analyzeDeck(deck);
      });

      updateDecksList();
      updateDeckAnalysis();
      updatePowerLevelChart();
      saveData();

      button.innerHTML = originalText;
      button.disabled = false;

      alert("Análise de todos os decks concluída!");
    }, 1500);
  }

  function updateDeckAnalysis() {
    deckAnalysisList.innerHTML = "";

    if (decks.length === 0) {
      deckAnalysisList.innerHTML =
        '<p class="text-center">Nenhum deck cadastrado para análise.</p>';
      return;
    }

    decks.forEach((deck) => {
      const player = players.find((p) => p.id === deck.playerId);
      if (player) {
        const analysisCard = document.createElement("div");
        analysisCard.className = "deck-analysis-card";

        analysisCard.innerHTML = `
                        <div class="row">
                            <div class="col-md-8">
                                <h5>${deck.name} <small>por ${
          player.name
        }</small></h5>
                                <div class="d-flex align-items-center mb-2">
                                    <span class="power-level-badge power-level-${
                                      deck.analysis.powerLevel
                                    } me-2">
                                        Power Level: ${
                                          deck.analysis.powerLevel
                                        }/10
                                    </span>
                                    <span class="bracket-badge bracket-${deck.analysis.bracket.toLowerCase()}">
                                        ${deck.analysis.bracket}
                                    </span>
                                </div>
                                <div class="mb-2">
                                    <small>Sinergia:</small>
                                    <div class="progress">
                                        <div class="progress-bar" style="width: ${
                                          deck.analysis.synergyScore
                                        }%"></div>
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <small>Consistência:</small>
                                    <div class="progress">
                                        <div class="progress-bar" style="width: ${
                                          deck.analysis.consistencyScore
                                        }%"></div>
                                    </div>
                                </div>
                                <div class="mb-2">
                                    <small>Resiliência:</small>
                                    <div class="progress">
                                        <div class="progress-bar" style="width: ${
                                          deck.analysis.resilienceScore
                                        }%"></div>
                                    </div>
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

        deckAnalysisList.appendChild(analysisCard);
      }
    });

    // Adicionar event listeners para os botões de análise detalhada
    document.querySelectorAll(".view-detailed-analysis").forEach((button) => {
      button.addEventListener("click", function () {
        const deckId = parseInt(this.getAttribute("data-id"));
        showDetailedAnalysis(deckId);
      });
    });
  }

  function showDetailedAnalysis(deckId) {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;

    const player = players.find((p) => p.id === deck.playerId);
    const analysis = deck.analysis;

    let manaCurveHTML = "";
    for (const [cost, count] of Object.entries(analysis.manaCurve)) {
      manaCurveHTML += `<div class="col-2 text-center"><small>${cost}</small><br><strong>${count}</strong></div>`;
    }

    let cardTypesHTML = "";
    for (const [type, count] of Object.entries(analysis.cardTypes)) {
      cardTypesHTML += `<div class="col text-center"><small>${type}</small><br><strong>${count}</strong></div>`;
    }

    let strengthsHTML = "";
    analysis.strengths.forEach((strength) => {
      strengthsHTML += `<li>${strength}</li>`;
    });

    let weaknessesHTML = "";
    analysis.weaknesses.forEach((weakness) => {
      weaknessesHTML += `<li>${weakness}</li>`;
    });
    document.getElementById("detailed-analysis-content").innerHTML = `
                <h4>${deck.name} <small>por ${player.name}</small></h4>
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="d-flex align-items-center mb-2">
                            <span class="power-level-badge power-level-${
                              analysis.powerLevel
                            } me-2">
                                Power Level: ${analysis.powerLevel}/10
                            </span>
                            <span class="bracket-badge bracket-${analysis.bracket.toLowerCase()}">
                                ${analysis.bracket}
                            </span>
                        </div>
                        <p><small>Analisado em: ${new Date(
                          analysis.analyzedAt
                        ).toLocaleString("pt-BR")}</small></p>
                    </div>
                    <div class="col-md-6">
                        <a href="${
                          deck.link
                        }" class="btn btn-halloween btn-sm" target="_blank">
                            <i class="fas fa-external-link-alt me-1"></i>Ver Deck na LigaMagic
                        </a>
                    </div>
                </div>
                
                <h5>Métricas de Desempenho</h5>
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="text-center">
                            <h6>Sinergia</h6>
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar" style="width: ${
                                  analysis.synergyScore
                                }%">${analysis.synergyScore}%</div>
                            </div>
                            <small>Como as cartas trabalham juntas</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="text-center">
                            <h6>Consistência</h6>
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar" style="width: ${
                                  analysis.consistencyScore
                                }%">${analysis.consistencyScore}%</div>
                            </div>
                            <small>Frequência de jogadas ideais</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="text-center">
                            <h6>Resiliência</h6>
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar" style="width: ${
                                  analysis.resilienceScore
                                }%">${analysis.resilienceScore}%</div>
                            </div>
                            <small>Capacidade de recuperação</small>
                        </div>
                    </div>
                </div>
                
                <h5>Composição do Deck</h5>
                <div class="row mb-4">
                    <div class="col-12">
                        <h6>Curva de Mana</h6>
                        <div class="row text-center">
                            ${manaCurveHTML}
                        </div>
                    </div>
                </div>
                <div class="row mb-4">
                    <div class="col-12">
                        <h6>Tipos de Cartas</h6>
                        <div class="row text-center">
                            ${cardTypesHTML}
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <h5>Pontos Fortes</h5>
                        <ul>
                            ${strengthsHTML}
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <h5>Áreas para Melhoria</h5>
                        <ul>
                            ${weaknessesHTML}
                        </ul>
                    </div>
                </div>
            `;

    const modal = new bootstrap.Modal(
      document.getElementById("deckAnalysisModal")
    );
    modal.show();
  }

  function updatePowerLevelChart() {
    // Contar decks por power level
    const powerLevelCounts = {};
    for (let i = 1; i <= 10; i++) {
      powerLevelCounts[i] = 0;
    }

    decks.forEach((deck) => {
      // Garante que só conte se o power level estiver no range válido
      if (
        deck.analysis &&
        deck.analysis.powerLevel >= 1 &&
        deck.analysis.powerLevel <= 10
      ) {
        powerLevelCounts[deck.analysis.powerLevel]++;
      }
    });

    // Criar gráfico
    powerLevelChart.innerHTML = '<canvas id="powerLevelChartCanvas"></canvas>';

    const ctx = document
      .getElementById("powerLevelChartCanvas")
      .getContext("2d");
    // Se já existir um gráfico, destrua-o antes de criar um novo (previne problemas de memória)
    if (window.powerLevelChartInstance) {
      window.powerLevelChartInstance.destroy();
    }

    window.powerLevelChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        datasets: [
          {
            label: "Número de Decks",
            data: Object.values(powerLevelCounts),
            backgroundColor: [
              // Power Level 1-2: JANK (Cinza Escuro)
              "#4a4a4a", // 1
              "#5a5a5a", // 2
              // Power Level 3-4: CASUAL (Cinza Médio)
              "#7a7a7a", // 3
              "#8a8a8a", // 4
              // Power Level 5-6: FOCUSED (Cinza Claro)
              "#9a9a9a", // 5
              "#aaaaaa", // 6
              // Power Level 7-8: OPTIMIZED (Laranja/Amarelo - Halloween)
              "#ffcc00", // 7
              "#ff9900", // 8
              // Power Level 9-10: COMPETITIVE (Vermelho/Laranja Forte - Halloween)
              "#ff6600", // 9
              "#ff3300", // 10
            ],
            borderColor: [
              // Bordas escuras para todos, mantendo o contraste
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
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: "Distribuição de Power Levels",
            color: "#f0f0f0",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "#f0f0f0",
              stepSize: 1,
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
          x: {
            ticks: {
              color: "#f0f0f0",
            },
            grid: {
              color: "rgba(255, 255, 255, 0.1)",
            },
          },
        },
      },
    });
  }

  // NOVO: Função para embaralhar um array (Algoritmo Fisher-Yates)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Funções de mesas
  function generateTables() {
    // Resetar dados de mesas
    matches = [];

    // Criar cópia dos jogadores para sortear
    let availablePlayers = [...players];

    // Ordenar por power level para tentar balancear as mesas
    availablePlayers.sort((a, b) => {
      const deckA = decks.find((d) => d.playerId === a.id);
      const deckB = decks.find((d) => d.playerId === b.id);
      const powerA = deckA ? deckA.analysis.powerLevel : 5;
      const powerB = deckB ? deckB.analysis.powerLevel : 5;
      return powerA - powerB;
    });

    // Estratégia: intercalar jogadores de diferentes power levels
    const balancedPlayers = [];
    const mid = Math.ceil(availablePlayers.length / 2);
    const firstHalf = availablePlayers.slice(0, mid);
    const secondHalf = availablePlayers.slice(mid).reverse();

    for (let i = 0; i < Math.max(firstHalf.length, secondHalf.length); i++) {
      if (i < firstHalf.length) balancedPlayers.push(firstHalf[i]);
      if (i < secondHalf.length) balancedPlayers.push(secondHalf[i]);
    }

    // FIX: Embaralhar a lista de jogadores balanceada
    // Isso garante que as mesas sejam sorteadas de forma diferente a cada rodada.
    shuffleArray(balancedPlayers);

    // Criar mesas com 4 jogadores
    while (balancedPlayers.length >= 4) {
      const tablePlayers = balancedPlayers.splice(0, 4);
      const match = {
        id: Date.now() + Math.random(),
        round: currentRound,
        players: tablePlayers.map((p) => p.id),
      };
      matches.push(match);
    }

    // Jogadores restantes recebem bye
    const byePlayersList = [...balancedPlayers];

    // Atualizar contagem de byes
    byePlayersList.forEach((player) => {
      const playerIndex = players.findIndex((p) => p.id === player.id);
      if (playerIndex !== -1) {
        players[playerIndex].byes++;
        players[playerIndex].points += 3; // 3 pontos por bye
      }
    });

    // Atualizar interface
    updateTablesDisplay();
    updateByesDisplay(byePlayersList);
    updateMatchSelect();
    saveData();
  }

  function updateTablesDisplay() {
    tablesContainer.innerHTML = "";

    if (matches.length === 0) {
      tablesContainer.innerHTML =
        '<p class="text-center">Nenhuma mesa sorteada ainda.</p>';
      return;
    }

    matches.forEach((match, index) => {
      const tableCard = document.createElement("div");
      tableCard.className = "match-card";

      let playersHtml = "";
      let totalPowerLevel = 0;
      let playerCount = 0;

      match.players.forEach((playerId) => {
        const player = players.find((p) => p.id === playerId);
        const deck = decks.find((d) => d.playerId === playerId);

        if (player) {
          const powerLevel = deck ? deck.analysis.powerLevel : "N/A";
          if (deck) {
            totalPowerLevel += deck.analysis.powerLevel;
            playerCount++;
          }

          playersHtml += `
                            <div class="player-card mb-2">
                                <i class="fas fa-user me-2"></i>${player.name}
                                ${
                                  deck
                                    ? `<span class="power-level-badge power-level-${powerLevel} ms-2">${powerLevel}/10</span>`
                                    : ""
                                }
                            </div>
                        `;
        }
      });

      const avgPowerLevel =
        playerCount > 0 ? (totalPowerLevel / playerCount).toFixed(1) : "N/A";

      tableCard.innerHTML = `
                    <h5><i class="fas fa-chess-board me-2"></i>Mesa ${
                      index + 1
                    } - Rodada ${match.round}</h5>
                    <p><small>Power Level Médio: <strong>${avgPowerLevel}</strong></small></p>
                    ${playersHtml}
                `;

      tablesContainer.appendChild(tableCard);
    });
  }

  function updateByesDisplay(byePlayersList) {
    byePlayers.innerHTML = "";

    if (byePlayersList.length === 0) {
      byePlayers.innerHTML =
        '<p class="text-center">Nenhum jogador com bye.</p>';
      return;
    }

    byePlayersList.forEach((player) => {
      const deck = decks.find((d) => d.playerId === player.id);
      const powerLevel = deck ? deck.analysis.powerLevel : "N/A";

      const byeCard = document.createElement("div");
      byeCard.className = "player-card mb-2";
      byeCard.innerHTML = `
                    <i class="fas fa-user-clock me-2"></i>${player.name}
                    ${
                      deck
                        ? `<span class="power-level-badge power-level-${powerLevel} ms-2">${powerLevel}/10</span>`
                        : ""
                    }
                    <br><small>Recebeu bye (+3 pontos)</small>
                `;
      byePlayers.appendChild(byeCard);
    });
  }

  function updateMatchSelect() {
    matchSelect.innerHTML = '<option value="">Selecione uma mesa</option>';

    matches.forEach((match, index) => {
      const option = document.createElement("option");
      option.value = match.id;
      option.textContent = `Mesa ${index + 1} - Rodada ${match.round}`;
      matchSelect.appendChild(option);
    });
  }

  // Funções de resultados
  function updatePlayersResults() {
    playersResults.innerHTML = "";
    const matchId = matchSelect.value;

    if (!matchId) return;

    const match = matches.find((m) => m.id === parseFloat(matchId));
    if (!match) return;

    match.players.forEach((playerId) => {
      const player = players.find((p) => p.id === playerId);
      if (player) {
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
      }
    });
  }

  function registerResults(e) {
    e.preventDefault();
    const matchId = parseFloat(matchSelect.value);

    if (!matchId) return;

    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    // Evita registrar duas vezes
    if (match.completed) {
      alert("Esta partida já teve o resultado registrado.");
      return;
    }

    // Contar vitórias para validar (deve haver exatamente 1 vencedor)
    let winCount = 0;

    // Primeiro, valida se todos os resultados foram selecionados e conta as vitórias
    for (const playerId of match.players) {
      const resultInput = document.querySelector(
        `input[name="result-${playerId}"]:checked`
      );
      if (!resultInput) {
        alert("Por favor, selecione um resultado para todos os jogadores.");
        return;
      }
      if (resultInput.value === "win") {
        winCount++;
      }
    }

    if (winCount !== 1) {
      alert("Deve haver exatamente 1 vencedor por mesa! Revise os resultados.");
      return;
    }

    // Registrar resultados
    match.players.forEach((playerId) => {
      const result = document.querySelector(
        `input[name="result-${playerId}"]:checked`
      ).value;
      const playerIndex = players.findIndex((p) => p.id === playerId);

      if (playerIndex !== -1) {
        if (result === "win") {
          players[playerIndex].wins++;
          players[playerIndex].points += 3;
        } else if (result === "draw") {
          players[playerIndex].draws++;
          players[playerIndex].points += 1;
        } else {
          players[playerIndex].losses++;
        }
      }
    });

    // Marcar partida como concluída
    match.completed = true;

    // Verificar se todas as partidas da rodada foram concluídas
    const allCompleted = matches
      .filter((m) => m.round === currentRound)
      .every((m) => m.completed);

    if (allCompleted) {
      currentRound++; // Avançar para a próxima rodada
    }

    // Atualizar interface
    updateRanking();
    updateTablesDisplay();
    saveData();

    alert(
      "Resultados registrados com sucesso! " +
        (allCompleted
          ? `Próxima rodada: ${currentRound}`
          : "Aguardando resultados das demais mesas.")
    );
    document.getElementById("result-form").reset();
    playersResults.innerHTML = "";
    updateMatchSelect(); // Atualiza o select para remover a mesa registrada e, se for o caso, prepara a próxima rodada.
  }

  function updateRanking() {
    rankingTable.innerHTML = "";

    // Ordenar jogadores por pontos
    const sortedPlayers = [...players].sort((a, b) => b.points - a.points);

    sortedPlayers.forEach((player, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${player.name}</td>
                    <td>${player.wins}</td>
                    <td>${player.draws}</td>
                    <td>${player.losses}</td>
                    <td>${player.byes}</td>
                    <td>${player.points}</td>
                `;
      rankingTable.appendChild(row);
    });
  }

  // NOVO: Funções de notas e Cronômetro
  function addNote(e) {
    e.preventDefault();
    const noteText = document.getElementById("note-text").value.trim();

    if (noteText) {
      const newNote = {
        id: Date.now(),
        text: noteText,
        timestamp: new Date().toLocaleString("pt-BR"),
      };

      notes.push(newNote);
      updateNotesList();
      saveData();
      document.getElementById("note-form").reset();
    }
  }

  function deleteNote(noteId) {
    if (confirm("Tem certeza que deseja remover esta nota?")) {
      notes = notes.filter((n) => n.id !== noteId);
      updateNotesList();
      saveData();
    }
  }

  function updateNotesList() {
    const notesList = document.getElementById("notes-list");
    notesList.innerHTML = "";

    if (notes.length === 0) {
      notesList.innerHTML =
        '<p class="text-center">Nenhuma nota adicionada ainda.</p>';
      return;
    }

    // Inverter para mostrar as mais recentes primeiro
    [...notes].reverse().forEach((note) => {
      const noteDiv = document.createElement("div");
      noteDiv.className = "card mb-3";
      noteDiv.style.backgroundColor = "rgba(255, 117, 24, 0.1)";
      noteDiv.innerHTML = `
                    <div class="card-body">
                        <p class="card-text">${note.text}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted"><i class="fas fa-clock me-1"></i>${note.timestamp}</small>
                            <button class="btn btn-sm btn-danger delete-note" data-id="${note.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
      notesList.appendChild(noteDiv);
    });

    // Adicionar event listeners para os botões de exclusão
    document.querySelectorAll(".delete-note").forEach((button) => {
      button.addEventListener("click", function () {
        const noteId = parseInt(this.getAttribute("data-id"));
        deleteNote(noteId);
      });
    });
  }

  // Variáveis do Cronômetro (60 minutos = 3600 segundos)
  let totalTimeSeconds = 60 * 60; // 60 minutos
  let timeRemaining = totalTimeSeconds;
  let timerInterval = null;
  const timerDisplay = document.getElementById("timer-display");
  const startTimerButton = document.getElementById("start-timer");
  const resetTimerButton = document.getElementById("reset-timer");

  // Funções do Cronômetro

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, "0");
    const paddedSeconds = String(seconds).padStart(2, "0");
    return `${paddedMinutes}:${paddedSeconds}`;
  }

  function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(timeRemaining);

    // Atualiza a classe de estilo
    timerDisplay.classList.remove(
      "timer-running",
      "timer-paused",
      "timer-finished"
    );

    if (timerInterval) {
      timerDisplay.classList.add("timer-running");
      startTimerButton.innerHTML = '<i class="fas fa-pause me-2"></i>Pausar';
      startTimerButton.classList.remove("btn-halloween");
      startTimerButton.classList.add("btn-warning");
    } else {
      startTimerButton.innerHTML = '<i class="fas fa-play me-2"></i>Iniciar';
      startTimerButton.classList.remove("btn-warning");
      startTimerButton.classList.add("btn-halloween");
      if (timeRemaining === 0) {
        timerDisplay.classList.add("timer-finished");
      } else {
        timerDisplay.classList.add("timer-paused");
      }
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
          timeRemaining = 0; // Garante que não fique negativo
          updateTimerDisplay();
        }
      }, 1000);
      updateTimerDisplay(); // Atualiza o botão para "Pausar"
    } else {
      stopTimer();
    }
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    updateTimerDisplay(); // Atualiza o botão para "Iniciar"
  }

  function resetTimer() {
    stopTimer();
    timeRemaining = totalTimeSeconds;
    updateTimerDisplay();
  }

  // Inicialização do cronômetro
  updateTimerDisplay();

  // Adicionar Event Listeners para os botões do cronômetro
  startTimerButton.addEventListener("click", startTimer);
  resetTimerButton.addEventListener("click", resetTimer);
}

// ALTERADO: Função para resetar o torneio
function resetTournament() {
  if (
    confirm(
      "Tem certeza que deseja RESETAR O TORNEIO? Todos os jogadores, decks, resultados e notas serão perdidos!"
    )
  ) {
    // Resetar variáveis globais
    players = [];
    decks = [];
    matches = [];
    results = [];
    currentRound = 1;
    notes = [];

    // Limpar Firebase (em vez de localStorage)
    tournamentRef
      .remove()
      .then(() => {
        console.log("Dados removidos do Firebase com sucesso!");
      })
      .catch((error) => {
        console.error("Erro ao remover dados do Firebase:", error);
      });

    // Removido: localStorage.removeItem("commanderTournament");

    // Atualizar todas as interfaces
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
}

// Funções de jogadores
function addPlayer(e) {
  e.preventDefault();
  const playerName = document.getElementById("player-name").value.trim();

  if (playerName) {
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
    document.getElementById("player-form").reset();
  }
}

function updatePlayersList() {
  playersList.innerHTML = "";

  players.forEach((player) => {
    const row = document.createElement("tr");
    row.innerHTML = `
                    <td>${player.name}</td>
                    <td>
                        <button class="btn btn-sm btn-halloween me-1 edit-player" data-id="${player.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-player" data-id="${player.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
    playersList.appendChild(row);
  });

  // Adicionar event listeners para os botões
  document.querySelectorAll(".edit-player").forEach((button) => {
    button.addEventListener("click", function () {
      const playerId = parseInt(this.getAttribute("data-id"));
      editPlayer(playerId);
    });
  });

  document.querySelectorAll(".delete-player").forEach((button) => {
    button.addEventListener("click", function () {
      const playerId = parseInt(this.getAttribute("data-id"));
      deletePlayer(playerId);
    });
  });
}

function updatePlayerSelect() {
  playerSelect.innerHTML = '<option value="">Selecione um jogador</option>';

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = player.name;
    playerSelect.appendChild(option);
  });
}

function editPlayer(playerId) {
  const player = players.find((p) => p.id === playerId);
  if (player) {
    document.getElementById("edit-player-id").value = player.id;
    document.getElementById("edit-player-name").value = player.name;

    const modal = new bootstrap.Modal(
      document.getElementById("editPlayerModal")
    );
    modal.show();
  }
}
function savePlayerChanges() {
  const playerId = parseInt(document.getElementById("edit-player-id").value);
  const newName = document.getElementById("edit-player-name").value.trim();

  if (newName) {
    const playerIndex = players.findIndex((p) => p.id === playerId);
    if (playerIndex !== -1) {
      players[playerIndex].name = newName;
      updatePlayersList();
      updatePlayerSelect();
      updateDecksList();
      saveData();

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("editPlayerModal")
      );
      modal.hide();
    }
  }
}

function deletePlayer(playerId) {
  if (confirm("Tem certeza que deseja remover este jogador?")) {
    players = players.filter((p) => p.id !== playerId);
    decks = decks.filter((d) => d.playerId !== playerId);
    updatePlayersList();
    updatePlayerSelect();
    updateDecksList();
    updateDeckAnalysis();
    updatePowerLevelChart();
    saveData();
  }
}

// Funções de decks
function addDeck(e) {
  e.preventDefault();
  const playerId = parseInt(playerSelect.value);
  const deckName = document.getElementById("deck-name").value.trim();
  const deckLink = document.getElementById("deck-link").value.trim();

  if (playerId && deckName && deckLink) {
    const newDeck = {
      id: Date.now(),
      playerId: playerId,
      name: deckName,
      link: deckLink,
    };

    // Analisar o deck
    newDeck.analysis = analyzeDeck(newDeck);

    decks.push(newDeck);
    updateDecksList();
    updateDeckAnalysis();
    updatePowerLevelChart();
    saveData();
    document.getElementById("deck-form").reset();
  }
}

function updateDecksList() {
  decksList.innerHTML = "";

  decks.forEach((deck) => {
    const player = players.find((p) => p.id === deck.playerId);
    if (player) {
      const row = document.createElement("tr");
      row.innerHTML = `
                        <td>${player.name}</td>
                        <td>${deck.name}</td>
                        <td>
                            <span class="power-level-badge power-level-${
                              deck.analysis.powerLevel
                            }">
                                ${deck.analysis.powerLevel}/10
                            </span>
                        </td>
                        <td>
                            <span class="bracket-badge bracket-${deck.analysis.bracket.toLowerCase()}">
                                ${deck.analysis.bracket}
                            </span>
                        </td>
                        <td><a href="${
                          deck.link
                        }" class="deck-link" target="_blank">Ver Deck</a></td>
                        <td>
                            <button class="btn btn-sm btn-halloween me-1 view-analysis" data-id="${
                              deck.id
                            }">
                                <i class="fas fa-chart-line"></i>
                            </button>
                            <button class="btn btn-sm btn-danger delete-deck" data-id="${
                              deck.id
                            }">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
      decksList.appendChild(row);
    }
  });

  // Adicionar event listeners para os botões
  document.querySelectorAll(".delete-deck").forEach((button) => {
    button.addEventListener("click", function () {
      const deckId = parseInt(this.getAttribute("data-id"));
      deleteDeck(deckId);
    });
  });

  document.querySelectorAll(".view-analysis").forEach((button) => {
    button.addEventListener("click", function () {
      const deckId = parseInt(this.getAttribute("data-id"));
      showDetailedAnalysis(deckId);
    });
  });
}

function deleteDeck(deckId) {
  if (confirm("Tem certeza que deseja remover este deck?")) {
    decks = decks.filter((d) => d.id !== deckId);
    updateDecksList();
    updateDeckAnalysis();
    updatePowerLevelChart();
    saveData();
  }
}
