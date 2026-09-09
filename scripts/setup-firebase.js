#!/usr/bin/env node

/**
 * SkillSwap Firebase Setup Script
 *
 * This script replaces the placeholder Firebase config in the service worker
 * with the actual values from your .env file.
 *
 * Usage: node scripts/setup-firebase.js
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

function loadEnv() {
  try {
    const envPath = resolve(rootDir, ".env");
    const envContent = readFileSync(envPath, "utf-8");
    const env = {};
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) return;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      env[key] = value;
    });
    return env;
  } catch (err) {
    console.error("Could not read .env file:", err.message);
    process.exit(1);
  }
}

function setupServiceWorker(env) {
  const swPath = resolve(rootDir, "public", "firebase-messaging-sw.js");
  let swContent = readFileSync(swPath, "utf-8");

  const replacements = {
    "__FIREBASE_API_KEY__": env.VITE_FIREBASE_API_KEY,
    "__FIREBASE_AUTH_DOMAIN__": env.VITE_FIREBASE_AUTH_DOMAIN,
    "__FIREBASE_PROJECT_ID__": env.VITE_FIREBASE_PROJECT_ID,
    "__FIREBASE_STORAGE_BUCKET__": env.VITE_FIREBASE_STORAGE_BUCKET,
    "__FIREBASE_MESSAGING_SENDER_ID__": env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    "__FIREBASE_APP_ID__": env.VITE_FIREBASE_APP_ID,
  };

  let hasPlaceholders = false;
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (value && !value.startsWith("your-")) {
      swContent = swContent.replace(placeholder, value);
    } else {
      hasPlaceholders = true;
      console.warn(`Warning: ${placeholder} is not set in .env`);
    }
  }

  writeFileSync(swPath, swContent, "utf-8");

  if (hasPlaceholders) {
    console.log("\n⚠️  Some Firebase config values are missing from .env");
    console.log("Please set them in your .env file and run this script again.");
  } else {
    console.log("✅ Service worker configured successfully!");
  }
}

const env = loadEnv();
setupServiceWorker(env);
