import type { Message } from "@bufbuild/protobuf";
import type { CapabilityResponse } from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Trigger } from "@cre/sdk/utils/triggers/trigger-interface";
import { handleExecuteRequest } from "@cre/sdk/engine/execute";
import { getRequest } from "@cre/sdk/utils/get-request";
import { configHandler, type ConfigHandlerParams } from "@cre/sdk/utils/config";
import { runtime, type Runtime } from "@cre/sdk/runtime";

export type HandlerFn<TConfig, TPayload> = (
  config: TConfig,
  runtime: Runtime,
  output: TPayload
) => Promise<unknown> | unknown;

export interface HandlerEntry<
  TConfig = unknown,
  TOutput extends Message<string> = Message<string>,
  TAdapted = TOutput
> {
  trigger: Trigger<TOutput, TAdapted>;
  fn: HandlerFn<TConfig, TAdapted>;
}

export type Workflow<TConfig = unknown> = ReadonlyArray<
  HandlerEntry<TConfig, any, any>
>;

export const handler = <
  TOutput extends Message<string>,
  TAdapted = TOutput,
  TConfig = unknown
>(
  trigger: Trigger<TOutput, TAdapted>,
  fn: HandlerFn<TConfig, TAdapted>
): HandlerEntry<TConfig, TOutput, TAdapted> => ({ trigger, fn });

export class Runner<TConfig> {
  private readonly config: TConfig;
  private readonly runtime: Runtime;

  private constructor(config: TConfig) {
    this.config = config;
    this.runtime = runtime;
  }

  static async newRunner<T>(
    configHandlerParams: ConfigHandlerParams = {}
  ): Promise<Runner<T>> {
    const config = await configHandler<T>(configHandlerParams);

    return new Runner<T>(config);
  }

  async run(
    initFn: (config: TConfig) => Promise<Workflow<TConfig>> | Workflow<TConfig>
  ): Promise<CapabilityResponse | void> {
    const req = getRequest();
    const workflow = await initFn(this.config);
    return await handleExecuteRequest(req, workflow, this.config, this.runtime);
  }
}
