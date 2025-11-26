// Roulette Configuration
const ROULETTE_CONFIG = {
    totalNumbers: 37,
    doubleStreetPayout: 5, // 5:1 payout
    evenMoneyPayout: 1, // 1:1 payout (Manque/Passe)
    initialBankroll: 7207.0,
    laPartage: true,
};

// Progressive Betting System with REPLAY TIMES
const PROGRESSIONS = [
    { level: 1, totalBet: 1.0, profit: 0.2, replayTimes: 0 },
    { level: 2, totalBet: 6.0, profit: 1.2, replayTimes: 0 },
    { level: 3, totalBet: 18.0, profit: 3.6, replayTimes: 1 },
    { level: 4, totalBet: 54.0, profit: 10.8, replayTimes: 2 },
    { level: 5, totalBet: 216.0, profit: 43.2, replayTimes: 1 },
    { level: 6, totalBet: 864.0, profit: 172.8, replayTimes: 1 },
    { level: 7, totalBet: 6048.0, profit: 1209.6, replayTimes: 0 },
];

const BET_DISTRIBUTION = {
    evenBet: 0.6,
    doubleStreet: 0.2,
};

const STRATEGIES = [
    {
        id: 'strategy1',
        name: 'Manque + Double Streets 19-24 & 31-36',
        evenLabel: 'Manque 1-18',
        evenNumbers: range(1, 18),
        doubleStreets: [range(19, 24), range(31, 36)],
        doubleLabels: ['19-24', '31-36'],
    },
    {
        id: 'strategy2',
        name: 'Manque + Double Streets 19-24 & 25-30',
        evenLabel: 'Manque 1-18',
        evenNumbers: range(1, 18),
        doubleStreets: [range(19, 24), range(25, 30)],
        doubleLabels: ['19-24', '25-30'],
    },
    {
        id: 'strategy3',
        name: 'Manque + Double Streets 25-30 & 31-36',
        evenLabel: 'Manque 1-18',
        evenNumbers: range(1, 18),
        doubleStreets: [range(25, 30), range(31, 36)],
        doubleLabels: ['25-30', '31-36'],
    },
    {
        id: 'strategy4',
        name: 'Passe + Double Streets 1-6 & 13-18',
        evenLabel: 'Passe 19-36',
        evenNumbers: range(19, 36),
        doubleStreets: [range(1, 6), range(13, 18)],
        doubleLabels: ['1-6', '13-18'],
    },
];

const strategyResults = {};

function range(start, end) {
    const numbers = [];
    for (let i = start; i <= end; i++) {
        numbers.push(i);
    }
    return numbers;
}

function createInitialState(strategyId) {
    return {
        strategyId,
        bankroll: ROULETTE_CONFIG.initialBankroll,
        currentProgression: 1,
        winsAtCurrentProgression: 0,
        totalWins: 0,
        totalLosses: 0,
        spinsCompleted: 0,
        maxProgressionReached: 1,
        history: [],
        stopped: false,
        stopReason: '',
    };
}

function getCurrentProgression(state) {
    return PROGRESSIONS.find((p) => p.level === state.currentProgression);
}

function canAffordBet(state, progressionLevel) {
    const progression = PROGRESSIONS.find((p) => p.level === progressionLevel);
    return progression ? state.bankroll >= progression.totalBet : false;
}

function calculateBetDistribution(totalBet) {
    return {
        evenBet: totalBet * BET_DISTRIBUTION.evenBet,
        doubleStreetBet: totalBet * BET_DISTRIBUTION.doubleStreet,
    };
}

function checkBetResult(strategy, number) {
    if (number === 0) {
        return { type: 'zero', label: 'Zero (La Partage)' };
    }

    if (strategy.evenNumbers.includes(number)) {
        return { type: 'even', label: strategy.evenLabel };
    }

    for (let i = 0; i < strategy.doubleStreets.length; i++) {
        if (strategy.doubleStreets[i].includes(number)) {
            return { type: 'double', label: `Double Street ${strategy.doubleLabels[i]}` };
        }
    }

    return { type: 'loss', label: 'Loss' };
}

function handleProgressionLoss(state, currentProg) {
    const nextLevel = state.currentProgression + 1;
    if (currentProg.level === PROGRESSIONS.length) {
        state.stopped = true;
        state.stopReason = 'Progression 7 failed - simulation stopped';
        return;
    }

    if (nextLevel <= PROGRESSIONS.length && canAffordBet(state, nextLevel)) {
        state.currentProgression = nextLevel;
        state.winsAtCurrentProgression = 0;
        if (nextLevel > state.maxProgressionReached) {
            state.maxProgressionReached = nextLevel;
        }
    } else {
        state.stopped = true;
        state.stopReason = 'Bankroll exhausted';
    }
}

function runSingleSpin(state, strategy, number) {
    const currentProg = getCurrentProgression(state);
    const totalBet = currentProg.totalBet;
    const distribution = calculateBetDistribution(totalBet);

    state.bankroll -= totalBet;

    const outcome = checkBetResult(strategy, number);
    const historyEntry = {
        spin: state.spinsCompleted + 1,
        number,
        progression: currentProg.level,
        bet: totalBet,
        bankroll: 0,
        result: 'loss',
        winType: outcome.label,
    };

    if (outcome.type === 'zero') {
        const refund = distribution.evenBet * 0.5;
        state.bankroll += refund;
        state.totalLosses++;
        handleProgressionLoss(state, currentProg);
        historyEntry.loss = totalBet - refund;
    } else if (outcome.type === 'even' || outcome.type === 'double') {
        const netProfit = currentProg.profit;
        state.bankroll += totalBet + netProfit;
        state.totalWins++;
        state.winsAtCurrentProgression++;

        if (state.winsAtCurrentProgression > currentProg.replayTimes) {
            state.currentProgression = 1;
            state.winsAtCurrentProgression = 0;
        }

        historyEntry.result = 'win';
        historyEntry.profit = netProfit;
        historyEntry.winsAtLevel = state.winsAtCurrentProgression;
    } else {
        state.totalLosses++;
        handleProgressionLoss(state, currentProg);
        historyEntry.loss = totalBet;
    }

    historyEntry.bankroll = state.bankroll;
    state.history.push(historyEntry);
    state.spinsCompleted++;
}

function runStrategiesOnSingleTable(spins, progressCallback) {
    const states = {};
    STRATEGIES.forEach((strategy) => {
        states[strategy.id] = createInitialState(strategy.id);
    });

    for (let i = 0; i < spins; i++) {
        const number = Math.floor(Math.random() * ROULETTE_CONFIG.totalNumbers);

        STRATEGIES.forEach((strategy) => {
            const state = states[strategy.id];
            if (state.stopped) return;

            if (!canAffordBet(state, state.currentProgression)) {
                state.stopped = true;
                state.stopReason = 'Bankroll exhausted';
                return;
            }

            runSingleSpin(state, strategy, number);
        });

        if (progressCallback) {
            progressCallback(i + 1, spins, number);
        }
    }

    return states;
}

function updateProgress(completed, total, label = '') {
    const percentage = Math.min((completed / total) * 100, 100);
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }

    if (progressText) {
        progressText.textContent =
            label ||
            `Running simulations... ${completed} / ${total} steps (${percentage.toFixed(1)}%)`;
    }
}

function formatCurrency(value) {
    const sign = value >= 0 ? '' : '-';
    return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function renderStrategyCards() {
    const container = document.getElementById('strategiesContainer');
    container.innerHTML = '';

    STRATEGIES.forEach((strategy) => {
        const card = document.createElement('div');
        card.className = 'strategy-card';
        card.id = `${strategy.id}-card`;
        card.innerHTML = `
            <div class="strategy-header">
                <div>
                    <h3>${strategy.name}</h3>
                    <p class="strategy-bets"><strong>Even Bet:</strong> ${strategy.evenLabel} &nbsp;|&nbsp; <strong>Double Streets:</strong> ${strategy.doubleLabels.join(', ')}</p>
                </div>
            </div>
            <div class="summary-grid">
                <div class="summary-item">
                    <span>Final Bankroll</span>
                    <strong id="${strategy.id}-bankroll">$0.00</strong>
                </div>
                <div class="summary-item">
                    <span>Total Profit/Loss</span>
                    <strong id="${strategy.id}-profit">$0.00</strong>
                </div>
                <div class="summary-item">
                    <span>Total Wins</span>
                    <strong id="${strategy.id}-wins">0</strong>
                </div>
                <div class="summary-item">
                    <span>Total Losses</span>
                    <strong id="${strategy.id}-losses">0</strong>
                </div>
            </div>
            <div class="strategy-status" id="${strategy.id}-status">Waiting for simulation...</div>
            <div class="strategy-stats">
                <div>Spins Completed: <span id="${strategy.id}-spins">0</span></div>
                <div>Current Progression: <span id="${strategy.id}-current">1</span></div>
                <div>Max Progression: <span id="${strategy.id}-max">1</span></div>
                <div>Wins at Current Level: <span id="${strategy.id}-wins-level">0</span></div>
            </div>
            <div class="strategy-history">
                <div class="history-header">
                    <h4>Recent Spins</h4>
                    <button class="btn-download" data-strategy="${strategy.id}" style="display:none;">Download CSV</button>
                </div>
                <div class="history-content" id="${strategy.id}-history">
                    <p style="color:#b8b8b8;text-align:center;">No data yet.</p>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function displayStrategyResults(strategy, result) {
    const initialBankroll = ROULETTE_CONFIG.initialBankroll;
    const profit = result.bankroll - initialBankroll;

    document.getElementById(`${strategy.id}-bankroll`).textContent = formatCurrency(result.bankroll);

    const profitEl = document.getElementById(`${strategy.id}-profit`);
    profitEl.textContent = `${profit >= 0 ? '+' : ''}${formatCurrency(profit).replace('+', '')}`;
    profitEl.className = `value ${profit >= 0 ? 'profit' : 'loss'}`;

    document.getElementById(`${strategy.id}-wins`).textContent = result.totalWins;
    document.getElementById(`${strategy.id}-losses`).textContent = result.totalLosses;
    document.getElementById(`${strategy.id}-spins`).textContent = result.spinsCompleted;
    document.getElementById(`${strategy.id}-current`).textContent = result.currentProgression;
    document.getElementById(`${strategy.id}-max`).textContent = result.maxProgressionReached;
    document.getElementById(`${strategy.id}-wins-level`).textContent =
        result.winsAtCurrentProgression || 0;

    const statusEl = document.getElementById(`${strategy.id}-status`);
    if (result.stopped && result.stopReason) {
        statusEl.textContent = `🛑 ${result.stopReason}`;
        statusEl.className = 'strategy-status danger';
    } else if (profit >= 0) {
        statusEl.textContent = `✅ Profit of ${formatCurrency(profit)} after ${result.spinsCompleted} spins.`;
        statusEl.className = 'strategy-status success';
    } else {
        statusEl.textContent = `⚠️ Loss of ${formatCurrency(Math.abs(profit))} after ${result.spinsCompleted} spins.`;
        statusEl.className = 'strategy-status danger';
    }

    const historyContainer = document.getElementById(`${strategy.id}-history`);
    historyContainer.innerHTML = '';
    const recentHistory = result.history.slice(-30).reverse();

    if (recentHistory.length === 0) {
        historyContainer.innerHTML = '<p style="color:#b8b8b8;text-align:center;">No spins recorded.</p>';
    } else {
        recentHistory.forEach((entry) => {
            const item = document.createElement('div');
            item.className = `history-item ${entry.result}`;
            const resultText =
                entry.result === 'win'
                    ? `${entry.winType}: +$${entry.profit.toFixed(2)}`
                    : `${entry.winType}: -$${entry.loss ? entry.loss.toFixed(2) : '0.00'}`;
            item.innerHTML = `
                <span>Spin ${entry.spin}: Number ${entry.number} (Progression ${entry.progression})</span>
                <span>${resultText} | Bankroll: $${entry.bankroll.toFixed(2)}</span>
            `;
            historyContainer.appendChild(item);
        });
    }

    const downloadBtn = document.querySelector(
        `.btn-download[data-strategy="${strategy.id}"]`
    );
    if (downloadBtn) {
        downloadBtn.style.display = 'inline-block';
    }
}

function convertHistoryToCSV(history) {
    const headers = [
        'Spin',
        'Number',
        'Result',
        'Win Type',
        'Progression',
        'Bet',
        'Profit/Loss',
        'Bankroll',
        'Wins at Level',
    ];
    const rows = [headers.join(',')];

    history.forEach((entry) => {
        const row = [
            entry.spin,
            entry.number,
            entry.result,
            entry.winType || '',
            entry.progression,
            entry.bet ? entry.bet.toFixed(2) : '0.00',
            entry.result === 'win'
                ? entry.profit
                    ? `+${entry.profit.toFixed(2)}`
                    : '0.00'
                : entry.loss
                ? `-${entry.loss.toFixed(2)}`
                : '0.00',
            entry.bankroll.toFixed(2),
            entry.winsAtLevel || '',
        ];
        rows.push(
            row
                .map((cell) => {
                    const str = String(cell);
                    return str.includes(',') || str.includes('"') || str.includes('\n')
                        ? `"${str.replace(/"/g, '""')}"`
                        : str;
                })
                .join(',')
        );
    });

    return rows.join('\n');
}

function downloadStrategyHistory(strategyId) {
    const result = strategyResults[strategyId];
    if (!result || !result.history || result.history.length === 0) {
        alert('No history data available for this strategy.');
        return;
    }

    const csv = convertHistoryToCSV(result.history);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.href = URL.createObjectURL(blob);
    link.download = `${strategyId}-history-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function displayAggregateSummary(statesMap) {
    const summaryEl = document.getElementById('aggregateSummary');
    if (!summaryEl) return;

    const states = Object.values(statesMap);
    if (states.length === 0) {
        summaryEl.style.display = 'none';
        return;
    }

    let totalProfit = 0;
    let profitableCount = 0;
    let stoppedCount = 0;

    states.forEach((state) => {
        const profit = state.bankroll - ROULETTE_CONFIG.initialBankroll;
        totalProfit += profit;
        if (profit > 0) profitableCount++;
        if (state.stopped) stoppedCount++;
    });

    const averageProfit = totalProfit / states.length;

    const totalEl = document.getElementById('summaryTotalProfit');
    const avgEl = document.getElementById('summaryAverageProfit');
    const profitableEl = document.getElementById('summaryProfitable');
    const stoppedEl = document.getElementById('summaryStopped');

    if (totalEl) {
        totalEl.textContent = `${totalProfit >= 0 ? '+' : '-'}$${Math.abs(totalProfit).toFixed(2)}`;
        totalEl.className = 'result-value ' + (totalProfit >= 0 ? 'profit' : 'loss');
    }

    if (avgEl) {
        avgEl.textContent = `${averageProfit >= 0 ? '+' : '-'}$${Math.abs(averageProfit).toFixed(2)}`;
        avgEl.className = 'result-value ' + (averageProfit >= 0 ? 'profit' : 'loss');
    }

    if (profitableEl) {
        profitableEl.textContent = `${profitableCount} / ${states.length}`;
    }

    if (stoppedEl) {
        stoppedEl.textContent = stoppedCount.toString();
    }

    summaryEl.style.display = 'block';
}

function resetStrategyDisplays() {
    STRATEGIES.forEach((strategy) => {
        document.getElementById(`${strategy.id}-bankroll`).textContent = '$0.00';
        document.getElementById(`${strategy.id}-profit`).textContent = '$0.00';
        document.getElementById(`${strategy.id}-profit`).className = 'value';
        document.getElementById(`${strategy.id}-wins`).textContent = '0';
        document.getElementById(`${strategy.id}-losses`).textContent = '0';
        document.getElementById(`${strategy.id}-spins`).textContent = '0';
        document.getElementById(`${strategy.id}-current`).textContent = '1';
        document.getElementById(`${strategy.id}-max`).textContent = '1';
        document.getElementById(`${strategy.id}-wins-level`).textContent = '0';
        document.getElementById(`${strategy.id}-status`).textContent = 'Waiting for simulation...';
        document.getElementById(`${strategy.id}-status`).className = 'strategy-status';
        document.getElementById(`${strategy.id}-history`).innerHTML =
            '<p style="color:#b8b8b8;text-align:center;">No data yet.</p>';
        const downloadBtn = document.querySelector(
            `.btn-download[data-strategy="${strategy.id}"]`
        );
        if (downloadBtn) downloadBtn.style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    renderStrategyCards();

    const runButton = document.getElementById('runSimulation');
    const resetButton = document.getElementById('resetSimulation');
    const spinCountInput = document.getElementById('spinCount');
    const progressSection = document.getElementById('progressSection');
    const resultsSection = document.getElementById('resultsSection');

    document.getElementById('strategiesContainer').addEventListener('click', (event) => {
        if (event.target.matches('.btn-download')) {
            const strategyId = event.target.getAttribute('data-strategy');
            downloadStrategyHistory(strategyId);
        }
    });

    runButton.addEventListener('click', () => {
        const spins = parseInt(spinCountInput.value, 10);

        if (Number.isNaN(spins) || spins < 1) {
            alert('Please enter a valid number of spins (1 or more).');
            return;
        }

        runButton.disabled = true;
        runButton.textContent = 'Running...';
        resetButton.style.display = 'none';
        progressSection.style.display = 'block';
        resultsSection.style.display = 'none';
        resetStrategyDisplays();

        updateProgress(0, spins, 'Preparing table spins...');

        setTimeout(() => {
            const states = runStrategiesOnSingleTable(spins, (currentSpin, totalSpins, number) => {
                updateProgress(
                    currentSpin,
                    totalSpins,
                    `Spin ${currentSpin}/${totalSpins} • Result: ${number}`
                );
            });

            STRATEGIES.forEach((strategy) => {
                const result = states[strategy.id];
                strategyResults[strategy.id] = result;
                displayStrategyResults(strategy, result);
            });
            displayAggregateSummary(strategyResults);

            progressSection.style.display = 'none';
            resultsSection.style.display = 'block';
            resetButton.style.display = 'inline-block';
            runButton.disabled = false;
            runButton.textContent = 'Run Simulation';
        }, 100);
    });

    resetButton.addEventListener('click', () => {
        spinCountInput.value = '2100';
        progressSection.style.display = 'none';
        resultsSection.style.display = 'none';
        resetButton.style.display = 'none';
        updateProgress(0, 1, 'Ready');
        resetStrategyDisplays();
        const summaryEl = document.getElementById('aggregateSummary');
        if (summaryEl) summaryEl.style.display = 'none';
        Object.keys(strategyResults).forEach((key) => delete strategyResults[key]);
    });
});

// Run multiple simulations and aggregate results

// Convert history to CSV format
function convertHistoryToCSV(history) {
    // CSV header
    const headers = ['Spin', 'Number', 'Result', 'Win Type', 'Progression', 'Bet', 'Profit/Loss', 'Bankroll', 'Wins at Level'];
    const rows = [headers.join(',')];
    
    // Add data rows
    history.forEach(entry => {
        const row = [
            entry.spin,
            entry.number,
            entry.result,
            entry.winType || '',
            entry.progression,
            entry.bet ? entry.bet.toFixed(2) : '0.00',
            entry.result === 'win' 
                ? (entry.profit ? '+' + entry.profit.toFixed(2) : '0.00')
                : (entry.loss ? '-' + entry.loss.toFixed(2) : '0.00'),
            entry.bankroll.toFixed(2),
            entry.winsAtLevel || ''
        ];
        // Escape commas and quotes in CSV
        rows.push(row.map(cell => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }).join(','));
    });
    
    return rows.join('\n');
}

// Download history as CSV
function downloadHistoryAsCSV(history) {
    if (!history || history.length === 0) {
        alert('No history data to download');
        return;
    }
    
    const csvContent = convertHistoryToCSV(history);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.setAttribute('href', url);
    link.setAttribute('download', `roulette-simulation-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download all sessions as CSV
function downloadAllSessionsAsCSV(sessionsData) {
    if (!sessionsData || sessionsData.length === 0) {
        alert('No session data to download');
        return;
    }
    
    // Create CSV with session summary
    const headers = ['Session', 'Spins', 'Final Bankroll', 'Profit/Loss', 'Total Wins', 'Total Losses', 'Max Progression', 'Stopped', 'Stop Reason'];
    const rows = [headers.join(',')];
    
    sessionsData.forEach(session => {
        const profit = session.bankroll - ROULETTE_CONFIG.initialBankroll;
        const row = [
            session.sessionNumber,
            session.spinsCompleted,
            session.bankroll.toFixed(2),
            profit >= 0 ? '+' + profit.toFixed(2) : profit.toFixed(2),
            session.totalWins,
            session.totalLosses,
            session.maxProgressionReached,
            session.stopped ? 'Yes' : 'No',
            session.stopReason || ''
        ];
        rows.push(row.map(cell => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        }).join(','));
    });
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.setAttribute('href', url);
    link.setAttribute('download', `roulette-sessions-${sessionsData.length}-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Event Listeners
