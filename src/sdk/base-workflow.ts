import { cre, type Environment } from "@cre/sdk/cre";
import { type HandlerEntry } from "@cre/sdk/workflow";
import type { ConfigHandlerParams } from "./utils/config";

/**
 * Abstract base class for all CRE workflows
 * Provides common functionality and patterns
 */
export abstract class Workflow<TConfig = unknown> {
  constructor(private readonly configHandlerParams?: ConfigHandlerParams) {}

  /**
   * Override this method to define your workflow handlers
   */
  protected abstract initHandlers(env: Environment<TConfig>): HandlerEntry[];

  /**
   * Main workflow initialization - called by the runner
   */
  public initWorkflow = (env: Environment<TConfig>) => {
    return this.initHandlers(env);
  };

  /**
   * Creates and runs the workflow runner
   */
  public async run(): Promise<void> {
    try {
      const runner = await cre.newRunner<TConfig>(this.configHandlerParams);
      await runner.run(this.initWorkflow);
    } catch (error) {
      console.log("Workflow error:", JSON.stringify(error, null, 2));
      throw error;
    }
  }
}
