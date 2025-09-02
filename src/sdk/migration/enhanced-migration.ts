/**
 * Migration utilities for transitioning from legacy CRE SDK to enhanced version
 *
 * This module provides backward compatibility and migration helpers
 * to ease the transition to the enhanced mode-safe SDK.
 */

import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { enhancedCre } from "@cre/sdk/cre/enhanced";
import { runtime as legacyRuntime } from "@cre/sdk/runtime";
import { host as legacyHost } from "@cre/sdk/utils/host";
import { runInNodeMode as legacyRunInNodeMode } from "@cre/sdk/runtime/run-in-node-mode";

/**
 * Migration configuration options
 */
export interface MigrationConfig {
  /** Enable deprecation warnings */
  enableWarnings: boolean;
  /** Automatically migrate to enhanced APIs where possible */
  autoMigrate: boolean;
  /** Log migration actions for debugging */
  logMigrations: boolean;
}

const defaultMigrationConfig: MigrationConfig = {
  enableWarnings: true,
  autoMigrate: false,
  logMigrations: false,
};

let migrationConfig = { ...defaultMigrationConfig };

/**
 * Configure migration behavior
 * @param config Migration configuration options
 */
export const configureMigration = (config: Partial<MigrationConfig>): void => {
  migrationConfig = { ...migrationConfig, ...config };
};

/**
 * Log migration actions if enabled
 * @param message Message to log
 * @param action Action being performed
 */
const logMigration = (message: string, action: string): void => {
  if (migrationConfig.logMigrations) {
    console.log(`[Migration] ${action}: ${message}`);
  }
};

/**
 * Show deprecation warning if enabled
 * @param oldApi Old API being used
 * @param newApi Recommended new API
 * @param reason Reason for deprecation
 */
const showDeprecationWarning = (
  oldApi: string,
  newApi: string,
  reason: string
): void => {
  if (migrationConfig.enableWarnings) {
    console.warn(
      `[DEPRECATED] ${oldApi} is deprecated. Use ${newApi} instead. Reason: ${reason}`
    );
  }
};

/**
 * Compatibility layer for legacy runtime
 * Wraps legacy runtime with enhanced safety where possible
 */
export const compatRuntime = {
  get mode() {
    showDeprecationWarning(
      "runtime.mode",
      "enhancedCre.getCurrentMode()",
      "Enhanced version provides better mode tracking"
    );
    return legacyRuntime.mode;
  },

  get logger() {
    return legacyRuntime.logger;
  },
};

/**
 * Compatibility layer for legacy host
 * Provides enhanced safety for host operations
 */
export const compatHost = {
  switchModes: (mode: Mode): void => {
    if (migrationConfig.autoMigrate) {
      logMigration("switchModes", "AUTO_MIGRATE");
      enhancedCre.switchModes(mode);
    } else {
      showDeprecationWarning(
        "host.switchModes",
        "enhancedCre.switchModes",
        "Enhanced version provides better state management"
      );
      legacyHost.switchModes(mode);
    }
  },

  log: (message: string): void => {
    if (migrationConfig.autoMigrate) {
      enhancedCre.log(message);
    } else {
      legacyHost.log(message);
    }
  },

  sendResponse: (payloadBase64: string): number => {
    if (migrationConfig.autoMigrate) {
      return enhancedCre.sendResponse(payloadBase64);
    } else {
      return legacyHost.sendResponse(payloadBase64);
    }
  },

  randomSeed: (mode: Mode.DON | Mode.NODE = Mode.DON): number => {
    showDeprecationWarning(
      "host.randomSeed",
      "enhancedCre.getRand",
      "Enhanced version provides mode-safe random number generation"
    );
    return legacyHost.randomSeed(mode);
  },
};

/**
 * Compatibility wrapper for runInNodeMode
 * @param buildConsensusInputs Function to build consensus inputs
 * @returns Promise that resolves to consensus result
 */
export const compatRunInNodeMode = async (
  buildConsensusInputs: () => Promise<any> | any
): Promise<any> => {
  if (migrationConfig.autoMigrate) {
    logMigration("runInNodeMode", "AUTO_MIGRATE");
    return enhancedCre.runInNodeMode(buildConsensusInputs);
  } else {
    showDeprecationWarning(
      "runInNodeMode",
      "enhancedCre.runInNodeMode",
      "Enhanced version provides better mode safety and error handling"
    );
    return legacyRunInNodeMode(buildConsensusInputs);
  }
};

/**
 * Migration checker that analyzes code patterns
 */
export class MigrationChecker {
  private issues: Array<{
    type: "warning" | "error" | "info";
    message: string;
    suggestion: string;
  }> = [];

  /**
   * Check for common migration issues
   * @param codeContext Context object representing the code being checked
   */
  checkMigrationIssues(codeContext: {
    usesRandomSeed?: boolean;
    usesRunInNodeMode?: boolean;
    usesSwitchModes?: boolean;
    usesDirectHostCalls?: boolean;
  }): void {
    this.issues = [];

    if (codeContext.usesRandomSeed) {
      this.issues.push({
        type: "warning",
        message: "Direct use of host.randomSeed detected",
        suggestion: "Use enhancedCre.getRand() for mode-safe random generation",
      });
    }

    if (codeContext.usesRunInNodeMode) {
      this.issues.push({
        type: "info",
        message: "Legacy runInNodeMode usage detected",
        suggestion:
          "Consider upgrading to enhancedCre.runInNodeMode for better safety",
      });
    }

    if (codeContext.usesSwitchModes) {
      this.issues.push({
        type: "info",
        message: "Direct mode switching detected",
        suggestion: "Use enhancedCre.switchModes for better state management",
      });
    }

    if (codeContext.usesDirectHostCalls) {
      this.issues.push({
        type: "warning",
        message: "Direct host function calls detected",
        suggestion: "Use enhanced API wrappers for better error handling",
      });
    }
  }

  /**
   * Get migration issues found
   * @returns Array of migration issues
   */
  getIssues() {
    return [...this.issues];
  }

  /**
   * Print migration report
   */
  printReport(): void {
    if (this.issues.length === 0) {
      console.log("[Migration] ✓ No migration issues found");
      return;
    }

    console.log(`[Migration] Found ${this.issues.length} migration issues:`);
    this.issues.forEach((issue, index) => {
      const icon =
        issue.type === "error" ? "❌" : issue.type === "warning" ? "⚠️" : "ℹ️";
      console.log(`${icon} ${index + 1}. ${issue.message}`);
      console.log(`   Suggestion: ${issue.suggestion}`);
    });
  }
}

/**
 * Automatic migration assistant
 */
export class MigrationAssistant {
  private config: MigrationConfig;

  constructor(config: Partial<MigrationConfig> = {}) {
    this.config = { ...defaultMigrationConfig, ...config };
  }

  /**
   * Migrate a legacy workflow to use enhanced APIs
   * @param legacyWorkflow Legacy workflow object
   * @returns Enhanced workflow object
   */
  migrateWorkflow(legacyWorkflow: any): any {
    logMigration("Starting workflow migration", "MIGRATE_WORKFLOW");

    // Wrap legacy workflow with enhanced safety markers
    // This allows gradual migration while maintaining compatibility
    return {
      ...legacyWorkflow,
      __enhanced: true,
      __migrationDate: new Date().toISOString(),
    };
  }

  /**
   * Create migration report for a codebase
   * @param analysisResult Result from static analysis
   * @returns Migration report
   */
  createMigrationReport(analysisResult: any): {
    totalIssues: number;
    criticalIssues: number;
    recommendations: string[];
    estimatedEffort: "low" | "medium" | "high";
  } {
    // Simplified migration report
    return {
      totalIssues: 0,
      criticalIssues: 0,
      recommendations: [
        "Start by migrating to enhancedCre.getRand() for random number generation",
        "Update runInNodeMode calls to use enhancedCre.runInNodeMode",
        "Replace direct host calls with enhanced API wrappers",
      ],
      estimatedEffort: "medium",
    };
  }
}

/**
 * Global migration assistant instance
 */
export const migrationAssistant = new MigrationAssistant();
