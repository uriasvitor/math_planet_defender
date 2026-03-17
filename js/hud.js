export class Hud {
  constructor({
    baseLifeEl,
    scoreEl,
    paceEl,
    timeLeftEl,
    phaseEl,
    bestScoreEl,
    overlay,
    overlayTitle,
    overlaySubtitle,
    healthEl,
    waveEl,
    bossBarEl,
    bossBarFill,
    matchPowerBarEl,
    matchPowerFill,
    matchPowerTimeEl,
    options = {},
  }) {
    this.baseLifeEl = baseLifeEl;
    this.scoreEl = scoreEl;
    this.paceEl = paceEl;
    this.timeLeftEl = timeLeftEl;
    this.phaseEl = phaseEl;
    this.bestScoreEl = bestScoreEl;
    this.overlay = overlay;
    this.overlayTitle = overlayTitle;
    this.overlaySubtitle = overlaySubtitle;
    this.healthEl = healthEl;
    this.waveEl = waveEl;
    this.bossBarEl = bossBarEl;
    this.bossBarFill = bossBarFill;
    this.matchPowerBarEl = matchPowerBarEl;
    this.matchPowerFill = matchPowerFill;
    this.matchPowerTimeEl = matchPowerTimeEl;
    this.options = {
      bossBarEnabled: options.bossBarEnabled !== false,
    };
  }

  setOptions(nextOptions = {}) {
    this.options = {
      ...this.options,
      ...nextOptions,
    };
  }

  update({
    baseLife,
    score,
    timeLeft,
    scenario,
    healthLabel,
    healthClass,
    wave,
    bossActive,
    bossHpPct,
    matchPowerActive,
    matchPowerPct,
    matchPowerTimeLabel,
  }, pace, best, formattedTime) {
    this.baseLifeEl.textContent = baseLife;
    this.scoreEl.textContent = score;
    this.paceEl.textContent = `${pace} inim/seg`;
    this.timeLeftEl.textContent = formattedTime;
    if (this.phaseEl) this.phaseEl.textContent = scenario;
    this.bestScoreEl.textContent = best;
    if (this.healthEl) {
      this.healthEl.textContent = healthLabel;
      this.healthEl.className = healthClass;
    }
    if (this.waveEl) {
      this.waveEl.textContent = wave;
    }
    if (this.bossBarEl && this.bossBarFill) {
      if (this.options.bossBarEnabled && bossActive) {
        this.bossBarEl.classList.remove('hidden');
        this.bossBarFill.style.width = `${bossHpPct}%`;
      } else {
        this.bossBarEl.classList.add('hidden');
      }
    }
    if (this.matchPowerBarEl && this.matchPowerFill) {
      if (matchPowerActive) {
        this.matchPowerBarEl.classList.remove("hidden");
        const width = Math.max(0, Math.min(100, Number(matchPowerPct) || 0));
        this.matchPowerFill.style.width = `${width}%`;
        if (this.matchPowerTimeEl) {
          this.matchPowerTimeEl.textContent = matchPowerTimeLabel || "0.0s";
        }
      } else {
        this.matchPowerBarEl.classList.add("hidden");
        this.matchPowerFill.style.width = "0%";
        if (this.matchPowerTimeEl) this.matchPowerTimeEl.textContent = "0.0s";
      }
    }
  }

  setPhaseLabel(label) {
    if (this.phaseEl) this.phaseEl.textContent = label;
  }

  showOverlay(title, subtitle) {
    this.overlayTitle.textContent = title;
    this.overlaySubtitle.textContent = subtitle;
    this.overlay.classList.remove('hidden');
  }

  hideOverlay() {
    this.overlay.classList.add('hidden');
  }

  flashInput(el) {
    el.classList.remove('shake');
    // force reflow
    void el.offsetWidth;
    el.classList.add('shake');
  }
}
