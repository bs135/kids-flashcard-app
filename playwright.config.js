// playwright.config.js
import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';

function getExecutablePath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    launchOptions: {
      executablePath: getExecutablePath()
    }
  },
  projects: [
    {
      name: 'desktop-browser',
      use: {
        viewport: { width: 1280, height: 800 }
      }
    },
    {
      name: 'iphone-se-portrait',
      use: {
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: 'ipad-mini-portrait',
      use: {
        viewport: { width: 768, height: 1024 },
        isMobile: true,
        hasTouch: true
      }
    },
    {
      name: 'ipad-mini-landscape',
      use: {
        viewport: { width: 1024, height: 768 },
        isMobile: true,
        hasTouch: true
      }
    }
  ]
});
