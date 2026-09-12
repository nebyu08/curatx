/**
 * TuneX - Content Script
 * Monitors X (Twitter) timeline and hides tweets based on media preferences.
 */

(function () {
  'use strict';

  // Default configuration
  const DEFAULT_SETTINGS = {
    enabled: true,
    preset: 'custom',       // 'all_media', 'no_videos', 'text_only', 'text_and_images', 'custom'
    filterVideos: true,     // Block posts with videos
    filterGifs: true,       // Block posts with GIFs
    filterImages: false,    // Block posts with images
    filterCards: false,     // Block posts with link preview cards
    hideMode: 'hide',       // 'hide' (completely remove) or 'placeholder' (click to reveal)
  };

  let settings = { ...DEFAULT_SETTINGS };

  // Runtime stats for current tab
  const sessionStats = {
    totalBlocked: 0,
    videos: 0,
    gifs: 0,
    images: 0,
    cards: 0,
  };

  // Set of post cell elements currently blocked
  const blockedElements = new WeakSet();

  // Storage helper
  const storage = chrome.storage.sync || chrome.storage.local;

  // Load saved settings
  storage.get(DEFAULT_SETTINGS, (stored) => {
    if (stored) {
      settings = { ...DEFAULT_SETTINGS, ...stored };
    }
    processAllTweets();
  });

  // Listen for real-time updates from popup or other contexts
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' || areaName === 'local') {
      for (const [key, change] of Object.entries(changes)) {
        settings[key] = change.newValue;
      }
      processAllTweets(true);
    }
  });

  // Listen for messages from popup (e.g. stats query)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_STATS') {
      sendResponse({ stats: sessionStats });
    } else if (request.type === 'REFRESH_NOW') {
      processAllTweets(true);
      sendResponse({ status: 'ok' });
    }
    return true;
  });

  /**
   * Determine if a video element or container is a GIF.
   */
  function isGifElement(container) {
    if (!container) return false;

    // Check aria-labels
    if (container.querySelector('[aria-label*="GIF" i]')) return true;
    if (container.getAttribute('aria-label')?.toLowerCase().includes('gif')) return true;

    // Check text badges like "GIF" overlay badge
    const badges = container.querySelectorAll('span, div');
    for (const el of badges) {
      if (el.textContent && el.textContent.trim() === 'GIF') {
        return true;
      }
    }

    // Check preview thumbnail or video src
    const thumb = container.querySelector('img[src*="tweet_video_thumb"]');
    if (thumb) return true;

    return false;
  }

  /**
   * Classify the media present inside a tweet element.
   */
  function detectMedia(tweetArticle) {
    const result = {
      hasVideo: false,
      hasGif: false,
      hasImage: false,
      hasCard: false,
      reasons: [],
    };

    // 1. Check for Videos and GIFs
    const videoContainers = tweetArticle.querySelectorAll(
      '[data-testid="videoPlayer"], [data-testid="videoComponent"], div[aria-label="Embedded video"], video'
    );

    let foundVideo = false;
    let foundGif = false;

    if (videoContainers.length > 0) {
      for (const vc of videoContainers) {
        if (isGifElement(vc) || isGifElement(vc.parentElement)) {
          foundGif = true;
        } else {
          foundVideo = true;
        }
      }
    }

    // Sometimes GIF button exists on the tweet without playing yet
    if (!foundGif && tweetArticle.querySelector('[aria-label*="Play GIF" i], [aria-label="GIF"]')) {
      foundGif = true;
    }

    result.hasVideo = foundVideo;
    result.hasGif = foundGif;

    // 2. Check for Photos / Images (excluding avatars and emojis)
    const photoContainers = tweetArticle.querySelectorAll('[data-testid="tweetPhoto"]');
    if (photoContainers.length > 0) {
      result.hasImage = true;
    } else {
      // Fallback: Check for tweet photos in media grids (pbs.twimg.com/media) outside avatar container
      const mediaImages = tweetArticle.querySelectorAll('img[src*="pbs.twimg.com/media"]');
      if (mediaImages.length > 0) {
        result.hasImage = true;
      }
    }

    // 3. Check for Link Cards / Previews
    const cardContainers = tweetArticle.querySelectorAll(
      '[data-testid="card.wrapper"], [data-testid="card.layoutLarge.media"], [data-testid="card.layoutSmall.media"]'
    );
    if (cardContainers.length > 0) {
      result.hasCard = true;
    }

    // Compile reasons why this post matches blocked media
    if (settings.filterVideos && result.hasVideo) {
      result.reasons.push('Video');
    }
    if (settings.filterGifs && result.hasGif) {
      result.reasons.push('GIF');
    }
    if (settings.filterImages && result.hasImage) {
      result.reasons.push('Image');
    }
    if (settings.filterCards && result.hasCard) {
      result.reasons.push('Card');
    }

    return result;
  }

  /**
   * Get the top-level container for a tweet (the virtualized cell if available).
   */
  function getTweetCell(tweetArticle) {
    return tweetArticle.closest('div[data-testid="cellInnerDiv"]') || tweetArticle;
  }

  /**
   * Create or update a reveal placeholder bar for collapsed posts.
   */
  function createPlaceholder(cell, reasons, onReveal) {
    let existing = cell.querySelector('.curatx-placeholder');
    if (existing) {
      existing.remove();
    }

    const placeholder = document.createElement('div');
    placeholder.className = 'curatx-placeholder';

    const info = document.createElement('div');
    info.className = 'curatx-placeholder-info';

    const badge = document.createElement('span');
    badge.className = 'curatx-badge';
    badge.textContent = 'TuneX';

    const text = document.createElement('span');
    text.className = 'curatx-tag';
    text.textContent = `Post hidden (${reasons.join(', ')})`;

    info.appendChild(badge);
    info.appendChild(text);

    const btn = document.createElement('button');
    btn.className = 'curatx-reveal-btn';
    btn.type = 'button';
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg> Show`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      onReveal();
    });

    placeholder.appendChild(info);
    placeholder.appendChild(btn);

    // Insert at top of cell
    cell.prepend(placeholder);
  }

  /**
   * Process an individual tweet.
   */
  function processTweet(tweetArticle) {
    if (!tweetArticle || !tweetArticle.isConnected) return;

    const cell = getTweetCell(tweetArticle);
    const media = detectMedia(tweetArticle);

    const shouldBlock = settings.enabled && media.reasons.length > 0;

    if (shouldBlock) {
      // If user clicked reveal earlier, don't re-hide on scroll unless settings changed
      if (cell.dataset.curatxRevealed === 'true') {
        return;
      }

      if (!blockedElements.has(cell)) {
        blockedElements.add(cell);
        sessionStats.totalBlocked++;
        if (media.hasVideo) sessionStats.videos++;
        if (media.hasGif) sessionStats.gifs++;
        if (media.hasImage) sessionStats.images++;
        if (media.hasCard) sessionStats.cards++;
      }

      if (settings.hideMode === 'placeholder') {
        cell.classList.remove('curatx-post-hidden');
        cell.classList.add('curatx-post-collapsed');
        createPlaceholder(cell, media.reasons, () => {
          cell.dataset.curatxRevealed = 'true';
          cell.classList.remove('curatx-post-collapsed');
          const p = cell.querySelector('.curatx-placeholder');
          if (p) p.remove();
        });
      } else {
        // Completely hide
        cell.classList.remove('curatx-post-collapsed');
        cell.classList.add('curatx-post-hidden');
        const p = cell.querySelector('.curatx-placeholder');
        if (p) p.remove();
      }
    } else {
      // Unblock if previously blocked or no longer matches criteria
      cell.classList.remove('curatx-post-hidden');
      cell.classList.remove('curatx-post-collapsed');
      delete cell.dataset.curatxRevealed;
      const p = cell.querySelector('.curatx-placeholder');
      if (p) p.remove();
    }
  }

  /**
   * Process all visible tweets on the page.
   */
  function processAllTweets(resetReveals = false) {
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    tweets.forEach((tweet) => {
      const cell = getTweetCell(tweet);
      if (resetReveals && cell) {
        delete cell.dataset.curatxRevealed;
      }
      processTweet(tweet);
    });
  }

  // Debounced observer handler to batch DOM updates
  let scheduled = false;
  function scheduleProcess() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      processAllTweets(false);
      scheduled = false;
    });
  }

  // MutationObserver to watch for infinite scroll additions
  const observer = new MutationObserver((mutations) => {
    let hasRelevantNodes = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasRelevantNodes = true;
        break;
      }
    }
    if (hasRelevantNodes) {
      scheduleProcess();
    }
  });

  // Start observing once DOM is ready
  function initObserver() {
    const target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
      });
      processAllTweets();
    } else {
      setTimeout(initObserver, 50);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }
})();
