/**
 * Platform Default Configuration
 * This file contains default branding and configuration values for EaseLMS
 * Used across the application for open-source installations
 */

export const PLATFORM_DEFAULTS = {
  // Platform branding defaults
  platformName: "EaseLMS",
  platformDescription: "EaseLMS is a modern, open-source Learning Management System built with modern tech stack. It provides a complete solution for creating, managing, and delivering online courses with features like video lessons, interactive quizzes, progress tracking, certificates, and payment integration.",
  logoBlack: "https://cldup.com/VQGhFU5kd6.svg",
  logoWhite: "https://cldup.com/bwlFqC4f8I.svg",
  favicon: "https://cldup.com/6yEKvPtX22.svg",
  
  // Platform credits (Powered by EaseLMS)
  credits: {
    enabled: true, // Can be disabled for hosted/paid versions
    poweredByWhite: "https://cldup.com/-U7IFSEK-m.svg",
    poweredByBlack: "https://cldup.com/rIhf7ALxYw.svg",
  },
} as const
