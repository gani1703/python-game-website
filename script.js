/* ========================================
   STRATEGYX — HAND CRICKET GAME ENGINE
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // CANVAS PARTICLES (Background)
    // ==========================================
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.3;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.4 + 0.1;
            this.color = ['#00d4ff', '#00ff88', '#a855f7'][Math.floor(Math.random() * 3)];
        }
        update() {
            this.x += this.speedX;
            this.y += this.speedY;
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = this.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    function initParticles() {
        const count = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 80);
        particles = [];
        for (let i = 0; i < count; i++) particles.push(new Particle());
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#ffffff';
                    ctx.globalAlpha = 0.025 * (1 - d / 120);
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                }
            }
        }
        requestAnimationFrame(animateParticles);
    }

    resizeCanvas();
    initParticles();
    animateParticles();
    window.addEventListener('resize', () => { resizeCanvas(); initParticles(); });


    // ==========================================
    // GAME STATE
    // ==========================================
    const state = {
        phase: 'welcome',       // welcome, toss, toss-result, playing, innings-break, result
        tossChoice: null,        // 'odd' or 'even'
        tossPlayerNum: 0,
        tossAINum: 0,
        tossWinner: null,        // 'player' or 'ai'

        currentInnings: 1,
        playerBatting: false,    // is the player batting in the current innings?
        innings1Score: 0,
        innings1Batter: null,    // 'player' or 'ai'
        innings2Score: 0,
        innings2Batter: null,
        target: 0,

        currentScore: 0,
        roundNum: 0,

        wins: 0,
        losses: 0,
        ties: 0,

        isProcessing: false,
    };

    // ==========================================
    // DOM REFERENCES
    // ==========================================
    const screens = {
        welcome: document.getElementById('screen-welcome'),
        howto: document.getElementById('screen-howto'),
        toss: document.getElementById('screen-toss'),
        tossResult: document.getElementById('screen-toss-result'),
        play: document.getElementById('screen-play'),
        inningsBreak: document.getElementById('screen-innings-break'),
        result: document.getElementById('screen-result'),
    };

    const dom = {
        navStatus: document.getElementById('nav-status'),
        navWins: document.getElementById('nav-wins'),
        navLosses: document.getElementById('nav-losses'),

        // Toss result
        tossResultTitle: document.getElementById('toss-result-title'),
        tossDetails: document.getElementById('toss-details'),
        batBowlChoice: document.getElementById('bat-bowl-choice'),
        btnContinueToss: document.getElementById('btn-continue-toss'),

        // Play
        sbInnings: document.getElementById('sb-innings'),
        sbBatterLabel: document.getElementById('sb-batter-label'),
        sbBatterName: document.getElementById('sb-batter-name'),
        sbBatterScore: document.getElementById('sb-batter-score'),
        sbBowlerLabel: document.getElementById('sb-bowler-label'),
        sbBowlerName: document.getElementById('sb-bowler-name'),
        sbTargetRow: document.getElementById('sb-target-row'),
        sbTargetVal: document.getElementById('sb-target-val'),

        playerHandVal: document.getElementById('player-hand-val'),
        aiHandVal: document.getElementById('ai-hand-val'),
        playerHand: document.getElementById('player-hand'),
        aiHand: document.getElementById('ai-hand'),
        roundResult: document.getElementById('round-result'),
        playPrompt: document.getElementById('play-prompt'),
        playAction: document.getElementById('play-action'),

        logBody: document.getElementById('log-body'),

        // Innings break
        inningsSummary: document.getElementById('innings-summary'),

        // Result
        resultIcon: document.getElementById('result-icon'),
        resultTitle: document.getElementById('result-title'),
        resultSubtitle: document.getElementById('result-subtitle'),
        resultScores: document.getElementById('result-scores'),
        overallRecord: document.getElementById('overall-record'),
    };


    // ==========================================
    // SCREEN MANAGEMENT
    // ==========================================
    function showScreen(name) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        const screen = screens[name];
        if (screen) {
            screen.classList.remove('active');
            // Force reflow for re-animation
            void screen.offsetWidth;
            screen.classList.add('active');
        }
    }

    function setNavStatus(text) {
        dom.navStatus.textContent = text;
    }


    // ==========================================
    // AI LOGIC
    // ==========================================
    function getAINumber() {
        // Weighted random — slightly favors mid-range numbers
        const weights = [1, 2, 3, 3, 2, 1]; // 1-6
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < weights.length; i++) {
            r -= weights[i];
            if (r <= 0) return i + 1;
        }
        return Math.floor(Math.random() * 6) + 1;
    }


    // ==========================================
    // GAME LOG
    // ==========================================
    function clearLog() {
        dom.logBody.innerHTML = '';
    }

    function addLog(text, className = '') {
        const entry = document.createElement('span');
        entry.className = 'log-entry' + (className ? ' ' + className : '');
        entry.textContent = text;
        dom.logBody.appendChild(entry);
        dom.logBody.scrollTop = dom.logBody.scrollHeight;
    }


    // ==========================================
    // BUTTON EVENT HANDLERS
    // ==========================================

    // Start Game
    document.getElementById('btn-start-game').addEventListener('click', () => {
        showScreen('toss');
        setNavStatus('Toss Phase');
        state.phase = 'toss';
    });

    // How to Play
    document.getElementById('btn-how-to-play').addEventListener('click', () => {
        showScreen('howto');
    });

    // Back from How to Play
    document.getElementById('btn-back-welcome').addEventListener('click', () => {
        showScreen('welcome');
    });

    // Toss — ODD/EVEN selection
    document.querySelectorAll('input[name="toss-choice"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.tossChoice = e.target.value;
        });
    });

    // Toss — Number click
    document.querySelectorAll('#toss-numbers .num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!state.tossChoice) {
                // Flash the ODD/EVEN options
                document.querySelectorAll('.toss-label').forEach(label => {
                    label.style.borderColor = 'var(--neon-red)';
                    setTimeout(() => label.style.borderColor = '', 500);
                });
                return;
            }
            state.tossPlayerNum = parseInt(btn.dataset.num);
            executeToss();
        });
    });

    // Bat / Bowl choice
    document.getElementById('btn-choose-bat').addEventListener('click', () => {
        state.playerBatting = true;
        state.innings1Batter = 'player';
        startInnings(1);
    });

    document.getElementById('btn-choose-bowl').addEventListener('click', () => {
        state.playerBatting = false;
        state.innings1Batter = 'ai';
        startInnings(1);
    });

    // Continue from toss (when AI wins)
    document.getElementById('btn-continue-toss').addEventListener('click', () => {
        // AI decides — AI always bats first
        const aiBats = Math.random() > 0.5;
        if (aiBats) {
            state.playerBatting = false;
            state.innings1Batter = 'ai';
        } else {
            state.playerBatting = true;
            state.innings1Batter = 'player';
        }
        startInnings(1);
    });

    // Play — Number click
    document.querySelectorAll('#play-numbers .num-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.isProcessing) return;
            const num = parseInt(btn.dataset.num);
            executeRound(num);
        });
    });

    // Start Innings 2
    document.getElementById('btn-start-innings2').addEventListener('click', () => {
        startInnings(2);
    });

    // Play Again
    document.getElementById('btn-play-again').addEventListener('click', () => {
        resetGame();
        showScreen('toss');
        setNavStatus('Toss Phase');
    });


    // ==========================================
    // TOSS LOGIC
    // ==========================================
    function executeToss() {
        state.tossAINum = getAINumber();
        const sum = state.tossPlayerNum + state.tossAINum;
        const isOdd = sum % 2 !== 0;
        const playerCalledOdd = state.tossChoice === 'odd';
        const playerWins = (isOdd && playerCalledOdd) || (!isOdd && !playerCalledOdd);

        state.tossWinner = playerWins ? 'player' : 'ai';

        // Show toss result screen
        showScreen('tossResult');

        dom.tossDetails.innerHTML = `
      <div>You picked: <strong>${state.tossPlayerNum}</strong> &nbsp;|&nbsp; AI picked: <strong>${state.tossAINum}</strong></div>
      <div>Sum: <strong>${sum}</strong> (${isOdd ? 'ODD' : 'EVEN'})</div>
      <div>You called: <strong>${state.tossChoice.toUpperCase()}</strong></div>
    `;

        if (playerWins) {
            dom.tossResultTitle.textContent = '🎉 You Won the Toss!';
            dom.tossResultTitle.style.cssText = 'background: linear-gradient(135deg, #00ff88, #00d4ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
            dom.batBowlChoice.style.display = 'block';
            dom.btnContinueToss.style.display = 'none';
        } else {
            dom.tossResultTitle.textContent = '😤 AI Won the Toss!';
            dom.tossResultTitle.style.cssText = 'background: linear-gradient(135deg, #ff3366, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';
            dom.batBowlChoice.style.display = 'none';
            dom.btnContinueToss.style.display = 'inline-flex';
        }
    }


    // ==========================================
    // INNINGS MANAGEMENT
    // ==========================================
    function startInnings(inningsNum) {
        state.currentInnings = inningsNum;
        state.currentScore = 0;
        state.roundNum = 0;
        state.isProcessing = false;

        if (inningsNum === 1) {
            state.playerBatting = state.innings1Batter === 'player';
        } else {
            // Swap batting
            state.innings2Batter = state.innings1Batter === 'player' ? 'ai' : 'player';
            state.playerBatting = state.innings2Batter === 'player';
            state.target = state.innings1Score + 1;
        }

        // Update UI
        showScreen('play');
        setNavStatus(inningsNum === 1 ? '1st Innings' : '2nd Innings');

        // Scoreboard
        dom.sbInnings.textContent = inningsNum === 1 ? '1st Innings' : '2nd Innings';
        const batterName = state.playerBatting ? 'You' : 'AI';
        const bowlerName = state.playerBatting ? 'AI' : 'You';
        dom.sbBatterName.textContent = batterName;
        dom.sbBowlerName.textContent = bowlerName;
        dom.sbBatterLabel.textContent = '🏏 Batter';
        dom.sbBowlerLabel.textContent = '🎯 Bowler';
        dom.sbBatterScore.textContent = '0';

        if (inningsNum === 2) {
            dom.sbTargetRow.style.display = 'block';
            dom.sbTargetVal.textContent = state.target;
        } else {
            dom.sbTargetRow.style.display = 'none';
        }

        // Reset round display
        dom.playerHandVal.textContent = '?';
        dom.aiHandVal.textContent = '?';
        dom.playerHand.classList.remove('revealed');
        dom.aiHand.classList.remove('revealed');
        dom.roundResult.textContent = '';
        dom.roundResult.className = 'round-result';

        // Clear log
        clearLog();
        addLog(`── ${inningsNum === 1 ? '1st' : '2nd'} Innings Start ──`, 'log-info');
        addLog(`${batterName} is batting | ${bowlerName} is bowling`, 'log-info');
        if (inningsNum === 2) {
            addLog(`Target: ${state.target} runs`, 'log-highlight');
        }

        // Set prompt
        dom.playPrompt.textContent = state.playerBatting ? 'Pick your batting number:' : 'Pick your bowling number:';

        // Enable buttons
        enablePlayButtons();
    }


    // ==========================================
    // ROUND EXECUTION
    // ==========================================
    function executeRound(playerNum) {
        state.isProcessing = true;
        state.roundNum++;
        disablePlayButtons();

        const aiNum = getAINumber();

        // Reset hand display
        dom.playerHandVal.textContent = '?';
        dom.aiHandVal.textContent = '?';
        dom.playerHand.classList.remove('revealed');
        dom.aiHand.classList.remove('revealed');
        dom.roundResult.textContent = '';
        dom.roundResult.className = 'round-result';

        // Reveal player number
        setTimeout(() => {
            dom.playerHandVal.textContent = playerNum;
            dom.playerHand.classList.add('revealed');
        }, 200);

        // Reveal AI number
        setTimeout(() => {
            dom.aiHandVal.textContent = aiNum;
            dom.aiHand.classList.add('revealed');
        }, 600);

        // Process result
        setTimeout(() => {
            const isOut = playerNum === aiNum;

            if (isOut) {
                // BATTER IS OUT
                dom.roundResult.textContent = '💥 OUT!';
                dom.roundResult.className = 'round-result out';
                addLog(`Round ${state.roundNum}: You → ${playerNum} | AI → ${aiNum} — OUT!`, 'log-out');

                // End innings
                setTimeout(() => {
                    endInnings();
                }, 1200);
            } else {
                // Score runs
                const runs = state.playerBatting ? playerNum : aiNum;
                state.currentScore += runs;
                dom.sbBatterScore.textContent = state.currentScore;

                dom.roundResult.textContent = `+${runs} runs!`;
                dom.roundResult.className = 'round-result scored';
                addLog(`Round ${state.roundNum}: You → ${playerNum} | AI → ${aiNum} — +${runs} runs (Total: ${state.currentScore})`, 'log-scored');

                // Check if target chased in 2nd innings
                if (state.currentInnings === 2 && state.currentScore >= state.target) {
                    setTimeout(() => {
                        endInnings();
                    }, 1000);
                    return;
                }

                // Continue
                state.isProcessing = false;
                enablePlayButtons();
            }
        }, 1000);
    }


    // ==========================================
    // END INNINGS
    // ==========================================
    function endInnings() {
        if (state.currentInnings === 1) {
            state.innings1Score = state.currentScore;

            // Show innings break
            showScreen('inningsBreak');
            setNavStatus('Innings Break');

            const batterName = state.innings1Batter === 'player' ? 'You' : 'AI';
            dom.inningsSummary.innerHTML = `
        <div><strong>${batterName}</strong> scored: <span class="summary-highlight">${state.innings1Score} runs</span></div>
        <div>Balls played: <strong>${state.roundNum}</strong></div>
        <br>
        <div>🎯 Target for 2nd innings: <span class="summary-highlight">${state.innings1Score + 1} runs</span></div>
      `;
        } else {
            state.innings2Score = state.currentScore;
            showMatchResult();
        }
    }


    // ==========================================
    // MATCH RESULT
    // ==========================================
    function showMatchResult() {
        showScreen('result');
        setNavStatus('Match Over');

        const playerScore = state.innings1Batter === 'player' ? state.innings1Score : state.innings2Score;
        const aiScore = state.innings1Batter === 'ai' ? state.innings1Score : state.innings2Score;

        let resultType, title, subtitle;

        if (playerScore > aiScore) {
            resultType = 'win';
            title = 'You Win!';
            subtitle = `You beat the AI by ${playerScore - aiScore} runs!`;
            state.wins++;
            dom.resultIcon.innerHTML = '<i class="fa-solid fa-trophy"></i>';
        } else if (aiScore > playerScore) {
            resultType = 'lose';
            title = 'AI Wins!';
            subtitle = `The AI beat you by ${aiScore - playerScore} runs. Try again!`;
            state.losses++;
            dom.resultIcon.innerHTML = '<i class="fa-solid fa-skull"></i>';
        } else {
            resultType = 'tie';
            title = "It's a Tie!";
            subtitle = 'What a match! Both scored the same.';
            state.ties++;
            dom.resultIcon.innerHTML = '<i class="fa-solid fa-handshake"></i>';
        }

        dom.resultIcon.className = 'result-icon ' + resultType;
        dom.resultTitle.className = 'result-title ' + resultType + '-text';
        dom.resultTitle.textContent = title;
        dom.resultSubtitle.textContent = subtitle;

        dom.resultScores.innerHTML = `
      <div>🧑 You: <strong style="color: var(--neon-green);">${playerScore}</strong> runs</div>
      <div>🤖 AI: <strong style="color: var(--neon-purple);">${aiScore}</strong> runs</div>
    `;

        // Update nav
        dom.navWins.textContent = state.wins;
        dom.navLosses.textContent = state.losses;

        dom.overallRecord.textContent = `Record: ${state.wins}W - ${state.losses}L - ${state.ties}T`;
    }


    // ==========================================
    // HELPERS
    // ==========================================
    function enablePlayButtons() {
        document.querySelectorAll('#play-numbers .num-btn').forEach(btn => {
            btn.disabled = false;
        });
    }

    function disablePlayButtons() {
        document.querySelectorAll('#play-numbers .num-btn').forEach(btn => {
            btn.disabled = true;
        });
    }

    function resetGame() {
        state.phase = 'toss';
        state.tossChoice = null;
        state.tossPlayerNum = 0;
        state.tossAINum = 0;
        state.tossWinner = null;
        state.currentInnings = 1;
        state.playerBatting = false;
        state.innings1Score = 0;
        state.innings1Batter = null;
        state.innings2Score = 0;
        state.innings2Batter = null;
        state.target = 0;
        state.currentScore = 0;
        state.roundNum = 0;
        state.isProcessing = false;

        // Reset toss UI
        document.querySelectorAll('input[name="toss-choice"]').forEach(r => r.checked = false);

        // Reset bat/bowl display
        dom.batBowlChoice.style.display = 'none';
        dom.btnContinueToss.style.display = 'none';
    }

});
