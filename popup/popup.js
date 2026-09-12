/**
 * TuneX - Popup Script
 * Handles settings persistence, presets, real-time live tab statistics, and UI state.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const masterSwitch = document.getElementById('masterSwitch');
  const mainContent = document.getElementById('mainContent');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  const filterVideos = document.getElementById('filterVideos');
  const filterImages = document.getElementById('filterImages');
  const filterGifs = document.getElementById('filterGifs');
  const filterCards = document.getElementById('filterCards');

  const modeHide = document.getElementById('modeHide');
  const modePlaceholder = document.getElementById('modePlaceholder');
  const presetButtons = document.querySelectorAll('.preset');
  const refreshBtn = document.getElementById('refreshBtn');

  // Stats elements
  const statTotal = document.getElementById('statTotal');
  const statVideos = document.getElementById('statVideos');
  const statGifs = document.getElementById('statGifs');
  const statImages = document.getElementById('statImages');

  // Presets definition
  const PRESETS = {
    text_only: {
      filterVideos: true,
      filterImages: true,
      filterGifs: true,
      filterCards: true,
    },
    text_and_images: {
      filterVideos: true,
      filterImages: false,
      filterGifs: true,
      filterCards: false,
    },
    no_videos: {
      filterVideos: true,
      filterImages: false,
      filterGifs: false,
      filterCards: false,
    },
  };

  const DEFAULT_SETTINGS = {
    enabled: true,
    preset: 'custom',
    filterVideos: true,
    filterGifs: true,
    filterImages: false,
    filterCards: false,
    hideMode: 'hide',
  };

  let currentSettings = { ...DEFAULT_SETTINGS };

  // Storage API helper (sync with fallback to local)
  const storage = chrome.storage.sync || chrome.storage.local;

  // 1. Load settings
  storage.get(DEFAULT_SETTINGS, (stored) => {
    currentSettings = { ...DEFAULT_SETTINGS, ...stored };
    renderUI(currentSettings);
    queryTabStats();
  });

  // Render UI according to state
  function renderUI(cfg) {
    masterSwitch.checked = Boolean(cfg.enabled);
    filterVideos.checked = Boolean(cfg.filterVideos);
    filterImages.checked = Boolean(cfg.filterImages);
    filterGifs.checked = Boolean(cfg.filterGifs);
    filterCards.checked = Boolean(cfg.filterCards);

    if (cfg.hideMode === 'placeholder') {
      modePlaceholder.checked = true;
    } else {
      modeHide.checked = true;
    }

    updatePresetActiveState(cfg.preset);
    updateMasterEnabledState(cfg.enabled);
  }

  // Update preset active pill
  function updatePresetActiveState(presetName) {
    presetButtons.forEach((btn) => {
      if (btn.dataset.preset === presetName) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  // Update master toggle UI state
  function updateMasterEnabledState(isEnabled) {
    if (isEnabled) {
      mainContent.classList.remove('disabled-mode');
      statusDot.classList.remove('inactive');
      statusText.textContent = 'Filtering is on';
    } else {
      mainContent.classList.add('disabled-mode');
      statusDot.classList.add('inactive');
      statusText.textContent = 'Filtering is paused';
    }
  }

  // Save settings helper
  function saveSettings(newSettings) {
    currentSettings = { ...currentSettings, ...newSettings };
    storage.set(currentSettings);
  }

  // Determine which preset matches current toggles
  function determinePreset(filters) {
    for (const [name, p] of Object.entries(PRESETS)) {
      if (
        filters.filterVideos === p.filterVideos &&
        filters.filterImages === p.filterImages &&
        filters.filterGifs === p.filterGifs &&
        filters.filterCards === p.filterCards
      ) {
        return name;
      }
    }
    return 'custom';
  }

  // Master switch event
  masterSwitch.addEventListener('change', () => {
    const enabled = masterSwitch.checked;
    updateMasterEnabledState(enabled);
    saveSettings({ enabled });
  });

  // Individual filter switches
  const filterInputs = [filterVideos, filterImages, filterGifs, filterCards];
  filterInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const filters = {
        filterVideos: filterVideos.checked,
        filterImages: filterImages.checked,
        filterGifs: filterGifs.checked,
        filterCards: filterCards.checked,
      };
      const preset = determinePreset(filters);
      updatePresetActiveState(preset);
      saveSettings({ ...filters, preset });
    });
  });

  // Preset buttons
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      if (preset === 'custom') {
        updatePresetActiveState('custom');
        saveSettings({ preset: 'custom' });
        return;
      }

      const presetConfig = PRESETS[preset];
      if (presetConfig) {
        filterVideos.checked = presetConfig.filterVideos;
        filterImages.checked = presetConfig.filterImages;
        filterGifs.checked = presetConfig.filterGifs;
        filterCards.checked = presetConfig.filterCards;

        updatePresetActiveState(preset);
        saveSettings({
          ...presetConfig,
          preset,
        });
      }
    });
  });

  // Mode radio change (Hide vs Placeholder)
  [modeHide, modePlaceholder].forEach((radio) => {
    radio.addEventListener('change', () => {
      const hideMode = modeHide.checked ? 'hide' : 'placeholder';
      saveSettings({ hideMode });
    });
  });

  // Refresh button
  refreshBtn.addEventListener('click', () => {
    refreshBtn.style.transform = 'rotate(180deg)';
    setTimeout(() => {
      refreshBtn.style.transform = '';
    }, 300);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'REFRESH_NOW' }, () => {
          setTimeout(queryTabStats, 150);
        });
      }
    });
  });

  // Query live tab stats
  function queryTabStats() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) return;

      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response && response.stats) {
          statTotal.textContent = response.stats.totalBlocked || 0;
          statVideos.textContent = response.stats.videos || 0;
          statGifs.textContent = response.stats.gifs || 0;
          statImages.textContent = response.stats.images || 0;
        }
      });
    });
  }
});
