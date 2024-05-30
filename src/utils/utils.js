export const localExecutablePath =
  process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "linux"
      ? "/usr/bin/google-chrome"
      : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const remoteExecutablePath =
  "https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar";

export const isDev = process.env.NODE_ENV === "development";

function sleep(ms = 0) {
  return new Promise(resolve => {
    const t = setTimeout(() => {
      resolve()
      clearTimeout(t)
    }, ms)
  })
}

/**
 * 初始化视频
 * @param page
 * @returns {Promise<void>}
 * @private
 */
export const _initVideo = async (page) => {
  await page.waitForSelector('#bilibili-player video', {timeout: 60000});
  await page.click('.bpx-player-ctrl-btn.bpx-player-ctrl-wide');
  page.keyboard.press('F')

  return page.evaluate(async () => {
    const videoEl = document.querySelector('#bilibili-player video');
    videoEl.pause()
    videoEl.currentTime = 0
    const res = {
      duration: 0 // 视频总长度
    }
    if (videoEl) {
      res.duration = videoEl.duration
    }
    return res
  });
}

export
async function getVideoFrame(page, selector, frameTime = 30) {
  await page.waitForSelector(selector);

  // Evaluate script in the page context
  const base64 = await page.evaluate(async (selector, frameTime) => {
    const video = document.querySelector(selector);
    if (!video) {
      throw new Error('Video element not found');
    }

    // Ensure video is loaded
    await new Promise(resolve => {
      if (video.readyState >= 2) {
        resolve();
      } else {
        video.addEventListener('loadeddata', resolve, { once: true });
      }
    });

    // Seek to the specified time
    video.currentTime = frameTime;

    // Wait for the seeked event
    await new Promise(resolve => {
      video.addEventListener('seeked', resolve, { once: true });
    });

    // Draw the current frame to a canvas
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Return the base64 encoded image
    return canvas.toDataURL('image/png').split(',')[1];
  }, selector, frameTime);

  return base64;
}

