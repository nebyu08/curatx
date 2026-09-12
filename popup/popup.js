/**
 * CuratX - Popup Script
 * Handles settings persistence, presets, and live statistics.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const masterSwitch = document.getElementById('masterSwitch');
  const filterVideos = document.getElementById('filterVideos');
  const filterImages = document.getElementById('filterImages');
  const filterGifs = document.getElementById('filterGifs');
  const filterCards = document.getElementById('filterCards');
  const modeHide = document.getElementById('modeHide');
  const modePlaceholder = document.getElementById('modePlaceholder');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const refreshBtn = document.getElementById('refreshBtn');

  // Stats elements
  const statTotal = document.getElementById('statTotal');
  const statVideos = document.getElementById('statVideos');
  const statGifs = document.getElementById('statGifs');
  const statImages = document.getElementById('statImages');

  // Presets configuration definitions
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
      filterGifs: true,
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

  // 1. Load settings from storage
  chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
    currentSettings = { ...DEFAULT_SETTINGS, ...stored };
    renderUI(currentSettings);
    queryTabStats();
  });

  // Render UI according to state
  function renderUI(cfg) {
    masterSwitch.checked = cfg.enabled;
    filterVideos.checked = cfg.filterVideos;
    filterImages.checked = cfg.filterImages;
    filterGifs.checked = cfg.filterGifs;
    filterCards.checked = cfg.filterCards;

    if (cfg.hideMode === 'placeholder') {
      modePlaceholder.checked = true;
    } else {
      modeHide.checked = true;
    }

    updatePresetActiveState(cfg.preset);
    updateMasterEnabledState(cfg.enabled);
  }

  // Update active preset button highlight
  function updatePresetActiveState(presetName) {
    presetButtons.forEach((btn) => {
      if (btn.dataset.preset === presetName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Disable/enable controls when master switch is off/on
  function updateMasterEnabledState(isEnabled) {
    const sections = document.querySelectorAll('.section:not(:first-of-type)');
    sections.forEach((sec) => {
      if (!isEnabled) {
        sec.classList.add('disabled-overlay');
      } else {
        sec.classList.remove('disabled-overlay');
      }
    });
  }

  // Save current settings to chrome.storage
  function saveSettings(newSettings) {
    currentSettings = { ...currentSettings, ...newSettings };
    chrome.storage.sync.set(currentSettings);
  }

  // Detect which preset matches the current filter settings
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

  // Master switch handler
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

  // Preset buttons handler
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

  // Refresh / re-apply button
  refreshBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'REFRESH_NOW' }, () => {
          setTimeout(queryTabStats, 200);
        });
      }
    });
  });

  // Query live stats from content script on active tab
  function queryTabStats() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) return;

      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATS' }, (response) => {
        if (chrome.runtime.lastError) {
          // Tab might not be on x.com or content script not injected
          return;
        }
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
