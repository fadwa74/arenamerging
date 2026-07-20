/* === JAVASCRIPT === */

// ========== APP STATE & DATA ==========
const state = {
    currentPage: "hero",
    battles: 0,
    votes: 0,
    currentBattle: null,
    hasVoted: false
};
state.battleMode = 'video'; // Image mode addition — 'video' keeps existing behavior unchanged
// NOTE: this is now just fallback/decorative data for the hero stat counters

// leaderboard anymore — those all come from the real backend.
let modelCountForStats = 7;

const videoColors = [
    'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)',
    'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d2d5e 100%)',
    'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    'linear-gradient(135deg, #0f0f23 0%, #1a1a40 50%, #333370 100%)',
    'linear-gradient(135deg, #141e30 0%, #243b55 100%)'
];

// Change this if your backend runs somewhere other than localhost:5000
const VIDEO_API = "http://localhost:5000/api/video";
const ARENA_API = "http://localhost:5000/api/arena";
const IMAGE_API = "http://localhost:5000/api/image";
        // ========== HELPERS ==========
function showVideoError(el, message) {
  if (!el) return;
  el.innerHTML = `
    <div class="video-error">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      <span>${message}</span>
    </div>
  `;
}

// ========== LEADERBOARD ==========
async function renderLeaderboard() {
  const list = document.getElementById('leaderboardList');
  if (!list) return;
  list.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:24px 0;">Loading rankings...</p>';

  try {
    const endpoint =
    state.battleMode === "image"
        ? `${ARENA_API}/leaderboard/image`
        : `${ARENA_API}/leaderboard/video`;
    
    const res = await fetch(endpoint);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to load leaderboard");
    
    list.innerHTML = '';
    data.leaderboard.forEach((model, index) => {
      const rank = index + 1;
      const card = document.createElement('div');
      card.className = 'rank-card' + (rank === 1 ? ' rank-1 champion' : rank === 2 ? ' rank-2' :
          rank === 3 ? ' rank-3' : '');
      const battles = (model.wins || 0) + (model.losses || 0);
      card.innerHTML = `
        <div class="rank-badge">${rank}</div>
        <div class="rank-info">
          <div class="rank-name">${model.name}</div>
          <div class="rank-meta">
            <span>${model.provider}</span>
            <span>${model.wins}W / ${model.losses}L</span>
            <span>Battles: ${battles}</span>
          </div>
        </div>
        <div class="rank-score">
          <div class="rank-elo">${Math.round(model.elo_rating)}</div>
        </div>
        ${rank === 1 ? '<div class="champion-crown">👑</div>' : ''}
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    list.innerHTML =
      '<p style="color:var(--danger);text-align:center;padding:24px 0;">Could not load leaderboard. Is the server running on ' +
      ARENA_API + '?</p>';
  }
}

// ========== NAVIGATION ==========
function navigateTo(page) {
  if (state.currentPage === page) return;
  state.currentPage = page;

  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.page === page);
  });

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  const pageMap = {
    hero: 'pageHero',
    compare: 'pageCompare',
    leaderboard: 'pageLeaderboard',
    methodology: 'pageMethodology',
    about: 'pageAbout'
  };

  const target = document.getElementById(pageMap[page]);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (page === 'leaderboard') renderLeaderboard();
}

document.getElementById('navTabs')?.addEventListener('click', (e) => {
  const tab = e.target.closest('.nav-tab');
  if (tab) navigateTo(tab.dataset.page);
});

document.getElementById('navLogo')?.addEventListener('click', (e) => {
  e.preventDefault();
  navigateTo('hero');
});

// ========== THEME ==========
function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('Eden-theme', next);
}

document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
(() => {
  const saved = localStorage.getItem('Eden-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

// ========== HERO INPUT ==========
const promptInput = document.getElementById('promptInput');

promptInput?.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = this.scrollHeight + 'px';
});

document.getElementById('btnGenerate')?.addEventListener('click', () => {
  const prompt = promptInput?.value.trim();

  if (!prompt) {
      alert("Please enter a prompt.");
      return;
  }
  if (promptInput) {
      promptInput.value = "";
      promptInput.style.height = "auto";
  }

  startBattle(prompt);
});

promptInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('btnGenerate')?.click();
  }
});

// ========== BATTLE MODE TOGGLE (Image mode addition) ==========
const modeVideoBtn = document.getElementById('modeVideoBtn');
const modeImageBtn = document.getElementById('modeImageBtn');

function setBattleMode(mode) {
  state.battleMode = mode;
  const isImage = mode === 'image';

  if (modeVideoBtn) {
    modeVideoBtn.classList.toggle('active', !isImage);
    modeVideoBtn.setAttribute('aria-selected', String(!isImage));
  }
  if (modeImageBtn) {
    modeImageBtn.classList.toggle('active', isImage);
    modeImageBtn.setAttribute('aria-selected', String(isImage));
  }
  if (promptInput) {
    promptInput.placeholder = isImage
      ? 'Describe an image scenario to battle...'
      : 'Describe a video scenario to battle...';
  }

  const compareTitleEl = document.getElementById('compareTitle');
  const compareSubtitleEl = document.getElementById('compareSubtitle');
  if (compareTitleEl) compareTitleEl.textContent = isImage ? 'Image Arena Battle' : 'Arena Battle';
  if (compareSubtitleEl) {
      compareSubtitleEl.textContent = isImage
        ? 'Watch two AI models compete. Vote for the better image.'
        : 'Watch two AI models compete. Vote for the better video.';
  }

  const downloadALabel = document.getElementById('downloadALabel');
  const downloadBLabel = document.getElementById('downloadBLabel');
  if (downloadALabel) downloadALabel.textContent = isImage ? 'Download Image' : 'Download Video';
  if (downloadBLabel) downloadBLabel.textContent = isImage ? 'Download Image' : 'Download Video';
  renderLeaderboard();
  loadStats();
}
async function loadStats() {
  try {
    const res = await fetch(`${ARENA_API}/stats`);
    const data = await res.json();

    if (!data.success) return;
    state.battles = Number(data.battles || 0);
    state.votes = Number(data.votes || 0);
    modelCountForStats = Number(data.models || 0);
    
    document.getElementById("statBattles").textContent = state.battles;
    document.getElementById("statVotes").textContent = state.votes;
    document.getElementById("statModels").textContent = modelCountForStats;

  } catch (err) {
      console.error(err);
  }
}

modeVideoBtn?.addEventListener('click', () => setBattleMode('video'));
modeImageBtn?.addEventListener('click', () => setBattleMode('image'));

// ========== COUNTERS ==========
function animateCounter(el, target, duration) {
    const startTime = performance.now();

    function step(now) {
        const t = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(eased * target).toLocaleString();
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const statBattles = document.getElementById('statBattles');
        const statModels = document.getElementById('statModels');
        const statVotes = document.getElementById('statVotes');
        if (statBattles) animateCounter(statBattles, state.battles, 2000);
        if (statModels) animateCounter(statModels, modelCountForStats, 1500);
        if (statVotes) animateCounter(statVotes, state.votes, 2500);
        statsObserver.disconnect();
    });
}, { threshold: 0.5 });
const heroStatsEl = document.getElementById('heroStats');
if (heroStatsEl) statsObserver.observe(heroStatsEl);

// ========== BATTLE ==========


async function startBattle(prompt) {
  if (state.battleMode === 'image') { return startImageBattle(prompt); } // Image mode addition
  navigateTo('compare');

  state.currentBattle = null;
  state.hasVoted = false;
  const actions = document.getElementById("compareActions");
  if (actions) actions.style.display = "none";
  document.getElementById('downloadA').style.display = 'none';
  document.getElementById('downloadB').style.display = 'none';
  const currentPromptEl = document.getElementById('currentPrompt');
  const eloAEl = document.getElementById('eloA');
  const eloBEl = document.getElementById('eloB');
  const placeholderAEl = document.getElementById('videoPlaceholderA');
  const placeholderBEl = document.getElementById('videoPlaceholderB');
  const voteAEl = document.getElementById('voteA');
  const voteBEl = document.getElementById('voteB');
  const contenderAEl = document.getElementById('contenderA');
  const contenderBEl = document.getElementById('contenderB');
  const voteResultEl = document.getElementById('voteResult');
  const videoAEl = document.getElementById('videoA');
  const videoBEl = document.getElementById('videoB');

  if (currentPromptEl) currentPromptEl.textContent = prompt;
  if (eloAEl) eloAEl.textContent = '—';
  if (eloBEl) eloBEl.textContent = '—';
  if (placeholderAEl) placeholderAEl.style.background = videoColors[Math.floor(Math.random() * videoColors
  .length)];
  if (placeholderBEl) placeholderBEl.style.background = videoColors[Math.floor(Math.random() * videoColors
  .length)];
  if (voteAEl) voteAEl.classList.remove('voted');
  if (voteBEl) voteBEl.classList.remove('voted');
  if (contenderAEl) contenderAEl.classList.remove('winner', 'loser');
  if (contenderBEl) contenderBEl.classList.remove('winner', 'loser');
  if (voteResultEl) voteResultEl.style.display = 'none';
  // also reset the winner/loser text
  const wName = document.getElementById('resultWinnerName');
  const lName = document.getElementById('resultLoserName');
  if (wName) wName.textContent = '—';
  if (lName) lName.textContent = '—';
  const inner = document.getElementById('resultInner');
  if (inner) inner.classList.remove('has-winner');

  // Reset placeholders, hide videos
  if (videoAEl) { videoAEl.removeAttribute('src');
      videoAEl.style.display = 'none'; }
  if (videoBEl) { videoBEl.removeAttribute('src');
      videoBEl.style.display = 'none'; }
  // Image mode addition — clear any leftover image from a previous Image battle
  const imageAElReset = document.getElementById('imageA');
  const imageBElReset = document.getElementById('imageB');
  if (imageAElReset) { imageAElReset.removeAttribute('src'); imageAElReset.style.display = 'none'; }
  if (imageBElReset) { imageBElReset.removeAttribute('src'); imageBElReset.style.display = 'none'; }
  if (placeholderAEl) {
      placeholderAEl.style.display = 'flex';
      placeholderAEl.innerHTML =
          '<div class="video-play-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div><div class="video-shimmer"></div>';
  }
  if (placeholderBEl) {
      placeholderBEl.style.display = 'flex';
      placeholderBEl.innerHTML =
          '<div class="video-play-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div><div class="video-shimmer"></div>';
  }

  // Disable voting while loading
  if (voteAEl) voteAEl.disabled = true;
  if (voteBEl) voteBEl.disabled = true;

  try {
    const res = await fetch(`${VIDEO_API}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    console.log("Stats response:", data);
    if (data.success) {
      // This is the real battle returned by the server — store it so
      // handleVote() can send the correct battle_id back for scoring.
      state.currentBattle = {
        battle_id: data.battle_id,
        model_a_name: data.model_a_name,
        model_b_name: data.model_b_name,
        elo_a: data.elo_a,
        elo_b: data.elo_b
      };
      const contenderANameEl = document.getElementById('contenderAName');
      const contenderBNameEl = document.getElementById('contenderBName');

      if (contenderANameEl) {
          contenderANameEl.textContent = data.model_a_name;
      }
      if (contenderBNameEl) {
          contenderBNameEl.textContent = data.model_b_name;
      }
      if (eloAEl) eloAEl.textContent = Math.round(Number(data.elo_a || 0));
      if (eloBEl) eloBEl.textContent = Math.round(Number(data.elo_b || 0));

      // VIDEO A
      if (data.output_a?.success) {
        videoAEl.src = data.output_a.url;
        videoAEl.style.display = "block";
        videoAEl.load();

        await new Promise(resolve => {
          videoAEl.onloadeddata = resolve;
        });

        await videoAEl.play().catch(() => {});
        if (placeholderAEl) {
          placeholderAEl.style.display = "none";
          const downloadA = document.getElementById('downloadA');
          downloadA.style.display = 'flex';
          downloadA.onclick = function(e) {
            e.preventDefault();
            const a = document.createElement('a');
            a.href = videoAEl.src;
            a.download = 'video_A.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };
        }
      } else {
        showVideoError(
          placeholderAEl,
          data.output_a?.error || "Video A generation failed."
        );
      }
      // VIDEO B
      if (data.output_b?.success) {
        videoBEl.src = data.output_b.url;
        videoBEl.style.display = "block";
        videoBEl.load();

        await new Promise(resolve => {
            videoBEl.onloadeddata = resolve;
        });

        await videoBEl.play().catch(() => {});

        if (placeholderBEl) {
          placeholderBEl.style.display = "none";
          const downloadB = document.getElementById('downloadB');
          downloadB.style.display = 'flex';
          downloadB.onclick = function(e) {
            e.preventDefault();
            const a = document.createElement('a');
            a.href = videoBEl.src;
            a.download = 'video_B.mp4';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };
        }
      } else {
        showVideoError(
          placeholderBEl,
          data.output_b?.error || "Video B generation failed."
        );
      }
      // Enable voting only if BOTH videos generated
      const canVote = data.output_a?.success && data.output_b?.success;

      if (voteAEl) voteAEl.disabled = !canVote;
      if (voteBEl) voteBEl.disabled = !canVote;
    } else {
      console.error("Generation failed:", data.error);
      showVideoError(placeholderAEl, "Unable to generate videos.<br>Please try again.");
      showVideoError(placeholderBEl, "Unable to generate videos.<br>Please try again.");
    }
  } catch (err) {
    console.error("Backend not reachable:", err);
    showVideoError(placeholderAEl, "Cannot connect to server.<br>Please try again.");
    showVideoError(placeholderBEl, "Cannot connect to server.<br>Please try again.");
  }
}
// Image mode addition — mirrors startBattle() above 1:1, but calls IMAGE_API
// and drives the imageA/imageB <img> elements instead of videoA/videoB.
// Voting reuses handleVote()/ARENA_API unchanged (battle_id already carries
// the type on the backend), so nothing below duplicates that logic.
async function startImageBattle(prompt) {
  navigateTo('compare');

  state.currentBattle = null;
  state.hasVoted = false;
  const actions = document.getElementById("compareActions");
  if (actions) actions.style.display = "none";
  document.getElementById('downloadA').style.display = 'none';
  document.getElementById('downloadB').style.display = 'none';

  const currentPromptEl = document.getElementById('currentPrompt');
  const eloAEl = document.getElementById('eloA');
  const eloBEl = document.getElementById('eloB');
  const placeholderAEl = document.getElementById('videoPlaceholderA');
  const placeholderBEl = document.getElementById('videoPlaceholderB');
  const voteAEl = document.getElementById('voteA');
  const voteBEl = document.getElementById('voteB');
  const contenderAEl = document.getElementById('contenderA');
  const contenderBEl = document.getElementById('contenderB');
  const voteResultEl = document.getElementById('voteResult');
  const imageAEl = document.getElementById('imageA');
  const imageBEl = document.getElementById('imageB');
  const videoAEl = document.getElementById('videoA');
  const videoBEl = document.getElementById('videoB');

  if (currentPromptEl) currentPromptEl.textContent = prompt;
  if (eloAEl) eloAEl.textContent = '—';
  if (eloBEl) eloBEl.textContent = '—';

  if (placeholderAEl) placeholderAEl.style.background = videoColors[Math.floor(Math.random() * videoColors.length)];
  if (placeholderBEl) placeholderBEl.style.background = videoColors[Math.floor(Math.random() * videoColors.length)];

  if (voteAEl) voteAEl.classList.remove('voted');
  if (voteBEl) voteBEl.classList.remove('voted');
  if (contenderAEl) contenderAEl.classList.remove('winner', 'loser');
  if (contenderBEl) contenderBEl.classList.remove('winner', 'loser');
  if (voteResultEl) voteResultEl.style.display = 'none';

  const wName = document.getElementById('resultWinnerName');
  const lName = document.getElementById('resultLoserName');

  if (wName) wName.textContent = '—';
  if (lName) lName.textContent = '—';

  const inner = document.getElementById('resultInner');

  if (inner) inner.classList.remove('has-winner');

  // Clear any leftover video from a previous Video battle
  if (videoAEl) {
    videoAEl.removeAttribute('src');
    videoAEl.style.display = 'none';
  }

  if (videoBEl) {
    videoBEl.removeAttribute('src');
    videoBEl.style.display = 'none';
  }

  // Reset placeholders, hide images
  if (imageAEl) {
    imageAEl.removeAttribute('src');
    imageAEl.style.display = 'none';
  }

  if (imageBEl) {
    imageBEl.removeAttribute('src');
    imageBEl.style.display = 'none';
  }

  if (placeholderAEl) {
    placeholderAEl.style.display = 'flex';
    placeholderAEl.innerHTML =
      '<div class="video-play-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div class="video-shimmer"></div>';
  }

  if (placeholderBEl) {
    placeholderBEl.style.display = 'flex';
    placeholderBEl.innerHTML =
      '<div class="video-play-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div><div class="video-shimmer"></div>';
  }

  // Disable voting while loading
  if (voteAEl) voteAEl.disabled = true;
  if (voteBEl) voteBEl.disabled = true;

  try {
    const res = await fetch(`${IMAGE_API}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();

    if (data.success) {
      state.currentBattle = {
        battle_id: data.battle_id,
        model_a_name: data.model_a_name,
        model_b_name: data.model_b_name,
        elo_a: data.elo_a,
        elo_b: data.elo_b
      };

      const contenderANameEl = document.getElementById('contenderAName');
      const contenderBNameEl = document.getElementById('contenderBName');

      if (contenderANameEl) contenderANameEl.textContent = data.model_a_name;
      if (contenderBNameEl) contenderBNameEl.textContent = data.model_b_name;
      if (eloAEl) eloAEl.textContent = Math.round(Number(data.elo_a || 0));
      if (eloBEl) eloBEl.textContent = Math.round(Number(data.elo_b || 0));

      // IMAGE A
      if (data.output_a?.success) {
        imageAEl.src = data.output_a.url;
        imageAEl.style.display = "block";

        await new Promise(resolve => {
          imageAEl.onload = resolve;
          imageAEl.onerror = resolve;
        });

        if (placeholderAEl) {
          placeholderAEl.style.display = "none";
          const downloadA = document.getElementById('downloadA');

          downloadA.style.display = 'flex';
          downloadA.onclick = function(e) {
            e.preventDefault();
            const a = document.createElement('a');
            a.href = imageAEl.src;
            a.download = 'image_A.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };
        }
      } else {
        showVideoError(placeholderAEl, data.output_a?.error || "Image A generation failed.");
      }

      // IMAGE B
      if (data.output_b?.success) {
        imageBEl.src = data.output_b.url;
        imageBEl.style.display = "block";

        await new Promise(resolve => {
          imageBEl.onload = resolve;
          imageBEl.onerror = resolve;
        });

        if (placeholderBEl) {
          placeholderBEl.style.display = "none";
          const downloadB = document.getElementById('downloadB');

          downloadB.style.display = 'flex';
          downloadB.onclick = function(e) {
            e.preventDefault();
            const a = document.createElement('a');
            a.href = imageBEl.src;
            a.download = 'image_B.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          };
        }
      } else {
        showVideoError(placeholderBEl, data.output_b?.error || "Image B generation failed.");
      }

      // Enable voting only if BOTH images generated
      const canVote = data.output_a?.success && data.output_b?.success;

      if (voteAEl) voteAEl.disabled = !canVote;
      if (voteBEl) voteBEl.disabled = !canVote;

    } else {
      console.error("Generation failed:", data.error);
      showVideoError(placeholderAEl, "Unable to generate images.<br>Please try again.");
      showVideoError(placeholderBEl, "Unable to generate images.<br>Please try again.");
    }

  } catch (err) {
    console.error("Backend not reachable:", err);
    showVideoError(placeholderAEl, "Cannot connect to server.<br>Please try again.");
    showVideoError(placeholderBEl, "Cannot connect to server.<br>Please try again.");
  }
}
function setupNewBattle() {
  startBattle(document.getElementById("currentPrompt")?.textContent || "");
}

// ========== VOTING ==========
// Elo is now calculated server-side in POST /api/video/vote — the client
// no longer computes or mutates ratings itself, and every vote is persisted.
document.getElementById('voteA')?.addEventListener('click', () => handleVote('A'));
document.getElementById('voteB')?.addEventListener('click', () => handleVote('B'));

async function handleVote(choice) {
  if (!state.currentBattle || state.hasVoted) return;
  state.hasVoted = true;

  const battle = state.currentBattle;
  const winnerLetter = choice.toLowerCase(); // 'a' or 'b', matches backend contract
  const voteAEl = document.getElementById('voteA');
  const voteBEl = document.getElementById('voteB');

  if (voteAEl) voteAEl.disabled = true;
  if (voteBEl) voteBEl.disabled = true;

  try {
    const res = await fetch(`${ARENA_API}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ battle_id: battle.battle_id, winner: winnerLetter })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Vote failed");

    const voteBtn = document.getElementById('vote' + choice);
    if (voteBtn) voteBtn.classList.add('voted');

    const winnerCard = document.getElementById('contender' + choice);
    if (winnerCard) winnerCard.classList.add('winner');

    const loserSide = choice === 'A' ? 'B' : 'A';
    const loserCard = document.getElementById('contender' + loserSide);

    if (loserCard) loserCard.classList.add('loser');

    const winnerName = choice === 'A' ? battle.model_a_name : battle.model_b_name;
    const loserName = choice === 'A' ? battle.model_b_name : battle.model_a_name;
    const beforeWinnerElo = choice === 'A' ? battle.elo_a : battle.elo_b;
    const beforeLoserElo = choice === 'A' ? battle.elo_b : battle.elo_a;
    const changeW = Math.round(data.winner.elo - beforeWinnerElo);
    const changeL = Math.round(data.loser.elo - beforeLoserElo);
    const winnerEl = document.getElementById('resultWinnerName');
    const loserEl = document.getElementById('resultLoserName');

    if (winnerEl) winnerEl.textContent = winnerName;
    if (loserEl) loserEl.textContent = loserName;

    const resultInner = document.getElementById('resultInner');
    if (resultInner) resultInner.classList.add('has-winner');

    const eloUp = document.getElementById('eloUp');
    if (eloUp) eloUp.textContent = `+${changeW}`;

    const eloDown = document.getElementById('eloDown');
    if (eloDown) eloDown.textContent = `${changeL}`;

    const voteResultEl = document.getElementById('voteResult');
    if (voteResultEl) voteResultEl.style.display = 'block';

    const actions = document.getElementById("compareActions");
    if (actions && state.hasVoted) {
      actions.style.display = "flex";
    }

    const eloAEl = document.getElementById('eloA');
    const eloBEl = document.getElementById('eloB');

    if (eloAEl) {
      eloAEl.textContent = Math.round(Number(choice === 'A' ? data.winner.elo : data.loser.elo) || 0);
    }
    if (eloBEl) {
      eloBEl.textContent = Math.round(Number(choice === 'B' ? data.winner.elo : data.loser.elo) || 0);
    }

  } catch (err) {
    console.error("Vote failed:", err);
    state.hasVoted = false;

    if (voteAEl) voteAEl.disabled = false;
    if (voteBEl) voteBEl.disabled = false;
  }
}
// ========== ACTIONS ==========
document.getElementById('btnNewBattle')?.addEventListener('click', () => {
  const prompt = document.getElementById("currentPrompt")?.textContent?.trim();

  if (prompt) startBattle(prompt);
});

/* =========================================================

   ========================================================= */
(function() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 1. Turn About card paragraphs (with blank-line breaks) into
  //         separate <p> tags for a nicer, scannable layout. ----
  document.querySelectorAll('.about-card-text').forEach(el => {
    const raw = el.textContent;
    const chunks = raw.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

    if (chunks.length > 1) {
      el.innerHTML = chunks.map(c => `<p>${c}</p>`).join('');
    }
  });

  // ---- 2. Scroll-triggered reveal for cards across the app ----
  const revealTargets = document.querySelectorAll(
    '.about-card, .method-card, .rank-card, .contender-card'
  );

  revealTargets.forEach(el => el.classList.add('reveal-up'));

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealTargets.forEach(el => revealObserver.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  }

  // Re-check reveals whenever a page becomes active (since pages start hidden)
  const pageObserver = new MutationObserver(() => {
    document.querySelectorAll('.reveal-up:not(.is-visible)').forEach(el => {
      const rect = el.getBoundingClientRect();

      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('is-visible');
      }
    });
  });

  document.querySelectorAll('.page').forEach(p => {
    pageObserver.observe(p, { attributes: true, attributeFilter: ['class'] });
  });

  // ---- 3. Button ripple micro-interaction ----
  function addRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');

    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

    btn.appendChild(ripple);
  }

  if (!reduceMotion) {
    document.querySelectorAll('.btn-generate, .btn-vote, .btn-secondary, .nav-tab, .theme-toggle')
      .forEach(btn => btn.addEventListener('click', addRipple));
  }

  // ---- 4. Confetti burst on voting (purely decorative, additive listener) ----
  function burstConfetti(originEl) {
    if (reduceMotion || !originEl) return;

    const rect = originEl.getBoundingClientRect();
    const colors = ['#4F7DFF', '#F5C451', '#39D98A', '#FF5E5E', '#FFFFFF'];
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;

    for (let i = 0; i < 24; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';

      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 90;

      piece.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      piece.style.setProperty('--dy', Math.sin(angle) * dist - 20 + 'px');
      piece.style.setProperty('--rot', (Math.random() * 360) + 'deg');
      piece.style.left = originX + 'px';
      piece.style.top = originY + 'px';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (0.7 + Math.random() * 0.5) + 's';

      document.body.appendChild(piece);

      setTimeout(() => piece.remove(), 1300);
    }
  }

  document.getElementById('voteA')?.addEventListener('click', (e) => burstConfetti(e.currentTarget));
  document.getElementById('voteB')?.addEventListener('click', (e) => burstConfetti(e.currentTarget));
  // ---- 5. Gentle 3D tilt on hoverable cards ----
  function attachTilt(selector, maxTilt) {
    document.querySelectorAll(selector).forEach(card => {
      card.addEventListener('mousemove', (e) => {
        if (reduceMotion) return;

        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;

        const tiltX = (0.5 - py) * maxTilt;
        const tiltY = (px - 0.5) * maxTilt;

        card.style.transform = `translateY(-4px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  attachTilt('.about-card', 5);
  attachTilt('.method-card', 4);
  attachTilt('.contender-card', 3);

  // ---- 6. Subtle floating particles inside the About section ----
  const aboutSection = document.getElementById('aboutSection');

  if (aboutSection && !reduceMotion) {
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.className = 'about-particle';

      const size = 3 + Math.random() * 4;

      p.style.width = p.style.height = size + 'px';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = Math.random() * 100 + '%';
      p.style.animationDelay = (Math.random() * 6) + 's';
      p.style.animationDuration = (6 + Math.random() * 6) + 's';

      aboutSection.appendChild(p);
    }
  }

  // ---- 7. Gentle parallax on background orbs while scrolling ----
  if (!reduceMotion) {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;

      ticking = true;

      requestAnimationFrame(() => {
        const y = window.scrollY;

        const orb1 = document.querySelector('.orb-1');
        const orb2 = document.querySelector('.orb-2');
        const orb3 = document.querySelector('.orb-3');

        if (orb1) orb1.style.marginTop = (y * 0.08) + 'px';
        if (orb2) orb2.style.marginTop = (-y * 0.05) + 'px';
        if (orb3) orb3.style.marginTop = (y * 0.03) + 'px';

        ticking = false;
      });
    }, { passive: true });
  }

  // ---- 8. Decorative custom cursor (desktop / fine-pointer only) ----
  const isFinePointer = window.matchMedia('(pointer: fine)').matches;
  const cursorDot = document.getElementById('cursorDot');
  const cursorRing = document.getElementById('cursorRing');

  if (isFinePointer && cursorDot && cursorRing && !reduceMotion) {
    let dotX = 0,
      dotY = 0,
      ringX = 0,
      ringY = 0;

    let shown = false;

    window.addEventListener('mousemove', (e) => {
      dotX = e.clientX;
      dotY = e.clientY;

      if (!shown) {
        shown = true;

        cursorDot.classList.add('cursor-visible');
        cursorRing.classList.add('cursor-visible');

        ringX = dotX;
        ringY = dotY;
      }

      cursorDot.style.left = dotX + 'px';
      cursorDot.style.top = dotY + 'px';
    });

    window.addEventListener('mouseout', (e) => {
      if (!e.relatedTarget && !e.toElement) {
        cursorDot.classList.remove('cursor-visible');
        cursorRing.classList.remove('cursor-visible');
      }
    });

    window.addEventListener('mousemove', () => {
      cursorDot.classList.add('cursor-visible');
      cursorRing.classList.add('cursor-visible');
    });

    function ringLoop() {
      ringX += (dotX - ringX) * 0.18;
      ringY += (dotY - ringY) * 0.18;

      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';

      requestAnimationFrame(ringLoop);
    }

    requestAnimationFrame(ringLoop);

    const hoverTargets =
      'a, button, .btn-generate, .btn-vote, .btn-secondary, .nav-tab, .theme-toggle, .contender-card, .about-card, .method-card, .rank-card, textarea, input';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverTargets)) {
        cursorRing.classList.add('cursor-hover');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverTargets)) {
        cursorRing.classList.remove('cursor-hover');
      }
    });
  }
  // ---- 9. Subtle mouse-parallax on the hero content ----
  const heroSection = document.getElementById('heroSection');
  const heroParallaxEl = document.getElementById('heroContentParallax');

  if (heroSection && heroParallaxEl && isFinePointer && !reduceMotion) {
    heroParallaxEl.classList.add('hero-parallax');

    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;

      heroParallaxEl.style.transform = `translate(${px * -10}px, ${py * -8}px)`;
    });

    heroSection.addEventListener('mouseleave', () => {
      heroParallaxEl.style.transform = '';
    });

    document.querySelectorAll('.hero-piece-parallax').forEach((wrap, i) => {
      heroSection.addEventListener('mousemove', (e) => {
        const rect = heroSection.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;

        const strength = 14 + i * 4;

        wrap.style.transform = `translate(${px * strength}px, ${py * strength}px)`;
      });
    });
  }
})();

// ─── NEW: inject provider chips into the homepage footer ───
(function initProviders() {
  const container = document.getElementById('footerProviders');

  if (!container) return;

  const providers = [
    { name: 'Amazon Nova' },
    { name: 'Google Veo 3.1' },
    { name: 'MiniMax Hailuo 02' },
    { name: 'Seedance Lite' },
    { name: 'Seedance Pro' },
    { name: 'GPT Image' },
    { name: 'Imagen' },
    { name: 'FLUX' },
    { name: 'Recraft' },
    { name: 'Ideogram' },
    { name: 'OpenAI Sora' },
    { name: 'DALL·E 3' }
  ];

  providers.forEach(p => {
    const chip = document.createElement('span');

    chip.className = 'provider-chip';
    chip.innerHTML = `
      <span class="chip-dot"></span>
      <span>${p.name}</span>
    `;

    container.appendChild(chip);
  });
})();

// ─── ensure "Battles" appears on initial leaderboard load ───
// (renderLeaderboard already includes it; this just triggers a refresh
//  if the leaderboard is the active page on first load)
(function initialLeaderboardCheck() {
  if (document.getElementById('pageLeaderboard').classList.contains('active')) {
    renderLeaderboard();
  }
})();

window.addEventListener("DOMContentLoaded", () => {
  loadStats();
});
/* =========================================================

   ========================================================= */
(function() {
  const GENERATE_PATHS = ['/video/generate', '/image/generate']; // Image mode addition

  const messages = [
    ' Analyzing your prompt...',
    ' Understanding your request...',
    '🎬 Preparing the generation...',
    ' Creating your video...',
    ' Enhancing quality...',
    ' Rendering frames...',
    '✨ Applying final touches...',
    ' Almost done...'
  ];

  // Known backend error codes → friendly copy. If the backend already
  // sends a readable sentence in `error`/`message`, that text is shown
  // as-is instead of this map (see friendlyError below).
  const errorMap = {
    insufficient_credits: 'Not enough credits.',
    no_credits: 'Not enough credits.',
    provider_unavailable: 'API provider unavailable.',
    provider_error: 'API provider unavailable.',
    auth_failed: 'Authentication failed.',
    unauthorized: 'Authentication failed.',
    invalid_api_key: 'Authentication failed.',
    network_error: 'Network connection lost.',
    timeout: 'Request timed out.',
    request_timeout: 'Request timed out.',
    server_error: 'Server error.',
    internal_error: 'Server error.',
    invalid_prompt: 'Invalid prompt.'
  };

  const overlay = document.getElementById('loadingOverlay');
  const progressEl = document.getElementById('loadingProgress');
  const textEl = document.getElementById('loadingText');
  const retryBtn = document.getElementById('edenRetryBtn');
  const generateBtn = document.getElementById('btnGenerate');
  const newBattleBtn = document.getElementById('btnNewBattle');

  if (!overlay || !progressEl || !textEl) return;
  let msgTimer = null;
  let progressTimer = null;
  let msgIndex = 0;
  let progress = 0;
  let lastPrompt = '';

  function setLoadingButtonsDisabled(disabled) {
    if (generateBtn) generateBtn.disabled = disabled;
    if (newBattleBtn) newBattleBtn.disabled = disabled;
  }

  function setText(msg) {
    textEl.classList.remove('fade');
    void textEl.offsetWidth; // restart the existing fade animation
    textEl.textContent = msg;
    textEl.classList.add('fade');
  }

  function scheduleNextMessage() {
    const delay = 2000 + Math.random() * 2000; // 2–4s, loops for long generations

    msgTimer = setTimeout(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setText(messages[msgIndex]);
      scheduleNextMessage();
    }, delay);
  }

  function startProgressCrawl() {
    progress = 6;
    progressEl.style.width = progress + '%';

    progressTimer = setInterval(() => {
      progress += (92 - progress) * 0.06; // eases toward ~92%, never claims completion early
      progressEl.style.width = Math.min(progress, 92) + '%';
    }, 300);
  }

  function stopTimers() {
    clearTimeout(msgTimer);
    clearInterval(progressTimer);

    msgTimer = null;
    progressTimer = null;
  }

  function showLoading() {
    stopTimers();

    overlay.classList.remove('eden-error');
    overlay.style.display = 'flex';

    setLoadingButtonsDisabled(true);

    msgIndex = 0;
    setText(messages[0]);

    scheduleNextMessage();
    startProgressCrawl();
  }

  function hideLoading() {
    stopTimers();

    progressEl.style.width = '100%';
    setLoadingButtonsDisabled(false);

    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('eden-error');
      progressEl.style.width = '0%';
    }, 220);
  }

  function showError(message) {
    stopTimers();

    overlay.classList.add('eden-error');
    progressEl.style.width = '100%';

    setText(message || 'Unknown error.');

    setLoadingButtonsDisabled(false);

    // Auto-dismiss so it never blocks the UI. Your existing placeholder
    // error text (already part of startBattle) remains visible underneath
    // as a fallback the whole time.
    setTimeout(() => {
      if (overlay.classList.contains('eden-error')) {
        overlay.style.display = 'none';
        overlay.classList.remove('eden-error');
        progressEl.style.width = '0%';
      }
    }, 5000);
  }

  function friendlyError(raw) {
    if (!raw || typeof raw !== 'string') return null;

    const trimmed = raw.trim();

    if (!trimmed) return null;

    const key = trimmed.toLowerCase().replace(/[\s-]+/g, '_');

    return errorMap[key] || trimmed; // trust the backend's own text if we don't recognize a code
  }

  retryBtn?.addEventListener('click', () => {
    overlay.style.display = 'none';
    overlay.classList.remove('eden-error');

    if (lastPrompt && typeof window.startBattle === 'function') {
      window.startBattle(lastPrompt); // reuses your existing generation flow as-is
    }
  });

  // ---- Transparent fetch observer ----
  // The exact same request goes out and the exact same response comes
  // back to your app; this only peeks at a clone of the response.
  const originalFetch = window.fetch.bind(window);

  window.fetch = function(input, init) {
    const url = typeof input === 'string'
      ? input
      : (input && input.url) || '';

    if (!GENERATE_PATHS.some(p => url.indexOf(p) !== -1)) {
      return originalFetch(input, init);
    }

    try {
      const body = init && init.body ? JSON.parse(init.body) : null;

      if (body && body.prompt) {
        lastPrompt = body.prompt;
      }
    } catch (e) {
      // ignore — purely cosmetic for the retry button
    }

    showLoading();

    const promise = originalFetch(input, init);

    promise
      .then((response) =>
        response.clone().json().catch(() => null).then((data) => ({
          status: response.status,
          data
        }))
      )
      .then(({ status, data }) => {
        if (data && data.success) {
          hideLoading();
          return;
        }

        const raw = data && (data.error || data.message);

        let friendly = friendlyError(raw);

        if (!friendly) {
          if (status === 401 || status === 403) {
            friendly = 'Authentication failed.';
          } else if (status === 402) {
            friendly = 'Not enough credits.';
          } else if (status === 408 || status === 504) {
            friendly = 'Request timed out.';
          } else if (status === 502 || status === 503) {
            friendly = 'API provider unavailable.';
          } else if (status >= 500) {
            friendly = 'Server error.';
          } else {
            friendly = 'Unknown error.';
          }
        }

        showError(friendly);
      })
      .catch((err) => {
        const msg = (err && err.message ? err.message : '').toLowerCase();

        if (msg.indexOf('abort') !== -1 || msg.indexOf('timeout') !== -1) {
          showError('Request timed out.');
        } else if (msg.indexOf('fetch') !== -1 || msg.indexOf('network') !== -1) {
          showError('Network connection lost.');
        } else {
          showError('Unknown error.');
        }
      });

    return promise;
  };
})();
