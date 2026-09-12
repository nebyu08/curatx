const { JSDOM } = require('jsdom');
const assert = require('assert');

// Mock HTML template simulating Twitter / X timeline
const html = `
<!DOCTYPE html>
<html>
<body>
  <div id="react-root">
    <main>
      <div data-testid="primaryColumn">
        <!-- 1. Text-only post -->
        <div data-testid="cellInnerDiv" id="cell-text">
          <article data-testid="tweet">
            <div data-testid="Tweet-User-Avatar">
              <img src="https://pbs.twimg.com/profile_images/user1.jpg">
            </div>
            <div data-testid="tweetText">Hello world! Just plain text here.</div>
          </article>
        </div>

        <!-- 2. Image post -->
        <div data-testid="cellInnerDiv" id="cell-image">
          <article data-testid="tweet">
            <div data-testid="Tweet-User-Avatar">
              <img src="https://pbs.twimg.com/profile_images/user2.jpg">
            </div>
            <div data-testid="tweetText">Look at this photo!</div>
            <div data-testid="tweetPhoto">
              <img src="https://pbs.twimg.com/media/sample1.jpg">
            </div>
          </article>
        </div>

        <!-- 3. Video post -->
        <div data-testid="cellInnerDiv" id="cell-video">
          <article data-testid="tweet">
            <div data-testid="Tweet-User-Avatar">
              <img src="https://pbs.twimg.com/profile_images/user3.jpg">
            </div>
            <div data-testid="tweetText">Watch this cool clip!</div>
            <div data-testid="videoPlayer">
              <video src="blob:https://x.com/video1"></video>
            </div>
          </article>
        </div>

        <!-- 4. GIF post -->
        <div data-testid="cellInnerDiv" id="cell-gif">
          <article data-testid="tweet">
            <div data-testid="Tweet-User-Avatar">
              <img src="https://pbs.twimg.com/profile_images/user4.jpg">
            </div>
            <div data-testid="tweetText">My reaction when:</div>
            <div data-testid="videoPlayer">
              <div aria-label="Play GIF"></div>
              <span>GIF</span>
              <video loop src="https://video.twimg.com/tweet_video/123.mp4"></video>
            </div>
          </article>
        </div>

        <!-- 5. Link card post -->
        <div data-testid="cellInnerDiv" id="cell-card">
          <article data-testid="tweet">
            <div data-testid="Tweet-User-Avatar">
              <img src="https://pbs.twimg.com/profile_images/user5.jpg">
            </div>
            <div data-testid="tweetText">Read this article:</div>
            <div data-testid="card.wrapper">
              <a href="https://example.com">Preview</a>
            </div>
          </article>
        </div>
      </div>
    </main>
  </div>
</body>
</html>
`;

// Helper detection logic matching content.js
function isGifElement(container) {
  if (!container) return false;
  if (container.querySelector('[aria-label*="GIF" i]')) return true;
  if (container.getAttribute('aria-label')?.toLowerCase().includes('gif')) return true;
  const badges = container.querySelectorAll('span, div');
  for (const el of badges) {
    if (el.textContent && el.textContent.trim() === 'GIF') return true;
  }
  if (container.querySelector('img[src*="tweet_video_thumb"]')) return true;
  return false;
}

function detectMedia(tweetArticle, settings) {
  const result = {
    hasVideo: false,
    hasGif: false,
    hasImage: false,
    hasCard: false,
    reasons: [],
  };

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

  if (!foundGif && tweetArticle.querySelector('[aria-label*="Play GIF" i], [aria-label="GIF"]')) {
    foundGif = true;
  }

  result.hasVideo = foundVideo;
  result.hasGif = foundGif;

  const photoContainers = tweetArticle.querySelectorAll('[data-testid="tweetPhoto"]');
  if (photoContainers.length > 0) {
    result.hasImage = true;
  } else {
    const mediaImages = tweetArticle.querySelectorAll('img[src*="pbs.twimg.com/media"]');
    if (mediaImages.length > 0) {
      result.hasImage = true;
    }
  }

  const cardContainers = tweetArticle.querySelectorAll(
    '[data-testid="card.wrapper"], [data-testid="card.layoutLarge.media"], [data-testid="card.layoutSmall.media"]'
  );
  if (cardContainers.length > 0) {
    result.hasCard = true;
  }

  if (settings.filterVideos && result.hasVideo) result.reasons.push('Video');
  if (settings.filterGifs && result.hasGif) result.reasons.push('GIF');
  if (settings.filterImages && result.hasImage) result.reasons.push('Image');
  if (settings.filterCards && result.hasCard) result.reasons.push('Card');

  return result;
}

function runTests() {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  const textTweet = document.getElementById('cell-text').querySelector('article');
  const imageTweet = document.getElementById('cell-image').querySelector('article');
  const videoTweet = document.getElementById('cell-video').querySelector('article');
  const gifTweet = document.getElementById('cell-gif').querySelector('article');
  const cardTweet = document.getElementById('cell-card').querySelector('article');

  console.log('--- Test 1: Media Detection Accuracy ---');
  const defaultSettings = { filterVideos: true, filterGifs: true, filterImages: true, filterCards: true };

  const mText = detectMedia(textTweet, defaultSettings);
  assert.strictEqual(mText.hasVideo, false);
  assert.strictEqual(mText.hasImage, false);
  assert.strictEqual(mText.hasGif, false);
  assert.strictEqual(mText.hasCard, false);
  console.log('✓ Text-only post detected correctly with 0 media');

  const mImage = detectMedia(imageTweet, defaultSettings);
  assert.strictEqual(mImage.hasImage, true);
  assert.strictEqual(mImage.hasVideo, false);
  console.log('✓ Image post detected correctly (hasImage=true, hasVideo=false)');

  const mVideo = detectMedia(videoTweet, defaultSettings);
  assert.strictEqual(mVideo.hasVideo, true);
  assert.strictEqual(mVideo.hasGif, false);
  console.log('✓ Video post detected correctly (hasVideo=true, hasGif=false)');

  const mGif = detectMedia(gifTweet, defaultSettings);
  assert.strictEqual(mGif.hasGif, true);
  assert.strictEqual(mGif.hasVideo, false);
  console.log('✓ GIF post detected correctly (hasGif=true, hasVideo=false)');

  const mCard = detectMedia(cardTweet, defaultSettings);
  assert.strictEqual(mCard.hasCard, true);
  console.log('✓ Card post detected correctly (hasCard=true)');

  console.log('\n--- Test 2: Selective Filter Settings ---');
  // Preset: "Text + Images" (filterVideos: true, filterGifs: true, filterImages: false)
  const textAndImgPreset = { filterVideos: true, filterGifs: true, filterImages: false, filterCards: false };
  
  const blockImg = detectMedia(imageTweet, textAndImgPreset).reasons.length > 0;
  const blockVid = detectMedia(videoTweet, textAndImgPreset).reasons.length > 0;
  const blockGif = detectMedia(gifTweet, textAndImgPreset).reasons.length > 0;
  const blockTxt = detectMedia(textTweet, textAndImgPreset).reasons.length > 0;

  assert.strictEqual(blockTxt, false, 'Text post should NOT be blocked');
  assert.strictEqual(blockImg, false, 'Image post should NOT be blocked in Text + Images mode');
  assert.strictEqual(blockVid, true, 'Video post SHOULD be blocked');
  assert.strictEqual(blockGif, true, 'GIF post SHOULD be blocked');
  console.log('✓ "Text + Images" preset filters only videos and GIFs, keeping text and images visible');

  // Preset: "Text Only" (filterVideos: true, filterGifs: true, filterImages: true, filterCards: true)
  const textOnlyPreset = { filterVideos: true, filterGifs: true, filterImages: true, filterCards: true };
  assert.strictEqual(detectMedia(textTweet, textOnlyPreset).reasons.length > 0, false);
  assert.strictEqual(detectMedia(imageTweet, textOnlyPreset).reasons.length > 0, true);
  assert.strictEqual(detectMedia(videoTweet, textOnlyPreset).reasons.length > 0, true);
  assert.strictEqual(detectMedia(gifTweet, textOnlyPreset).reasons.length > 0, true);
  console.log('✓ "Text Only" preset filters everything except pure text posts');

  console.log('\nALL TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests();
