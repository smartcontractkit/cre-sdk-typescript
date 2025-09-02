import type { Secret, SecretRequest } from "@cre/generated/sdk/v1alpha/sdk_pb";
import { enhancedRuntimeGuards } from "@cre/sdk/utils/enhanced-runtime-guards";
import { modeStateManager } from "@cre/sdk/utils/mode-state-manager";
import { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";

/**
 * Enhanced secret retrieval with comprehensive mode safety
 * Secrets can only be accessed in DON mode for security reasons
 */
export class EnhancedSecretManager {
  private static instance: EnhancedSecretManager;

  private constructor() {}

  public static getInstance(): EnhancedSecretManager {
    if (!EnhancedSecretManager.instance) {
      EnhancedSecretManager.instance = new EnhancedSecretManager();
    }
    return EnhancedSecretManager.instance;
  }

  /**
   * Get a secret by ID with mode safety enforcement
   * @param request Secret request containing the secret ID
   * @returns Promise that resolves to the secret
   * @throws Error if not in DON mode or secret not found
   */
  async getSecret(request: SecretRequest): Promise<Secret> {
    // Enforce that secrets can only be accessed in DON mode
    try {
      enhancedRuntimeGuards.assertSecretSafe();
    } catch (error) {
      throw new Error(
        `Secret '${request.id}' cannot be accessed outside DON mode: ${
          (error as Error).message
        }`
      );
    }

    // Check if we have the secret cached in mode state
    const cached = modeStateManager.getStoredSecret(request.id);
    if (cached) {
      console.log(`[Enhanced] Retrieved cached secret: ${request.id}`);
      return cached;
    }

    // Call the host's getSecrets function
    try {
      const { doGetSecret } = await import(
        "@cre/sdk/utils/secrets/do-get-secret"
      );
      const { awaitAsyncSecret } = await import(
        "@cre/sdk/utils/secrets/await-async-secret"
      );

      console.log(`[Enhanced] Requesting secret from host: ${request.id}`);

      // Make async secret request to host (doGetSecret expects just the ID string)
      const callbackId = doGetSecret(request.id);

      // Await the secret response (returns the secret value directly)
      const secretValue = await awaitAsyncSecret(callbackId);

      const { create } = await import("@bufbuild/protobuf");
      const { SecretSchema } = await import(
        "@cre/generated/sdk/v1alpha/sdk_pb"
      );

      const secret = create(SecretSchema, {
        id: request.id,
        value: secretValue,
      });

      // Store in mode state for caching
      modeStateManager.storeSecret(request.id, secret);

      console.log(`[Enhanced] Retrieved secret from host: ${request.id}`);
      return secret;
    } catch (error) {
      console.error(
        `[Enhanced] Failed to retrieve secret '${request.id}':`,
        error
      );
      throw new Error(
        `Failed to retrieve secret '${request.id}': ${(error as Error).message}`
      );
    }
  }

  /**
   * Get multiple secrets at once
   * @param requests Array of secret requests
   * @returns Promise that resolves to array of secrets
   * @throws Error if not in DON mode
   */
  async getSecrets(requests: SecretRequest[]): Promise<Secret[]> {
    // Ensure we're in DON mode before processing any secrets
    enhancedRuntimeGuards.assertSecretSafe();

    const promises = requests.map((request) => this.getSecret(request));
    return Promise.all(promises);
  }

  /**
   * Check if a secret is cached without retrieving it
   * @param secretId Secret identifier
   * @returns true if secret is cached, false otherwise
   * @throws Error if not in DON mode
   */
  hasSecret(secretId: string): boolean {
    enhancedRuntimeGuards.assertSecretSafe();
    return modeStateManager.getStoredSecret(secretId) !== undefined;
  }

  /**
   * Clear all cached secrets
   * @throws Error if not in DON mode
   */
  clearSecrets(): void {
    enhancedRuntimeGuards.assertSecretSafe();
    modeStateManager.clearSecrets();
    console.log("[Enhanced] Cleared all cached secrets");
  }

  /**
   * Get debug information about cached secrets
   * @returns Object with secret cache information
   * @throws Error if not in DON mode
   */
  getSecretDebugInfo(): {
    currentMode: Mode;
    secretCount: number;
    canAccessSecrets: boolean;
  } {
    const currentMode = enhancedRuntimeGuards.getMode();
    const canAccess = currentMode === Mode.DON;

    return {
      currentMode,
      secretCount: canAccess ? modeStateManager.getDebugInfo().secretCount : -1,
      canAccessSecrets: canAccess,
    };
  }

  /**
   * Safe secret retrieval that doesn't throw on mode violations
   * @param request Secret request
   * @returns Promise that resolves to secret or null if mode violation
   */
  async safeGetSecret(request: SecretRequest): Promise<Secret | null> {
    try {
      return await this.getSecret(request);
    } catch (error) {
      console.warn(
        `[Enhanced] Safe secret retrieval failed for '${request.id}':`,
        (error as Error).message
      );
      return null;
    }
  }
}

/**
 * Global enhanced secret manager instance
 */
export const enhancedSecretManager = EnhancedSecretManager.getInstance();

/**
 * Convenience function for getting a single secret
 * @param secretId Secret identifier
 * @returns Promise that resolves to secret
 * @throws Error if not in DON mode or secret not found
 */
export const getEnhancedSecret = async (secretId: string): Promise<Secret> => {
  const { create } = await import("@bufbuild/protobuf");
  const { SecretRequestSchema } = await import(
    "@cre/generated/sdk/v1alpha/sdk_pb"
  );

  const request = create(SecretRequestSchema, { id: secretId });
  return enhancedSecretManager.getSecret(request);
};

/**
 * Convenience function for safe secret retrieval
 * @param secretId Secret identifier
 * @returns Promise that resolves to secret or null
 */
export const safeGetEnhancedSecret = async (
  secretId: string
): Promise<Secret | null> => {
  const { create } = await import("@bufbuild/protobuf");
  const { SecretRequestSchema } = await import(
    "@cre/generated/sdk/v1alpha/sdk_pb"
  );

  const request = create(SecretRequestSchema, { id: secretId });
  return enhancedSecretManager.safeGetSecret(request);
};
