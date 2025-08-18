import type { Message } from "@bufbuild/protobuf";
import type {
  Mode,
  CapabilityResponse,
} from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Trigger } from "@cre/sdk/utils/triggers/trigger-interface";
import { handleExecuteRequest } from "@cre/sdk/engine/execute";
import { getRequest } from "@cre/sdk/utils/get-request";

export type Logger = {
  log: (message: string) => void;
};

export type Environment<TConfig = unknown> = {
  config?: TConfig;
  mode?: Mode;
  logger?: Logger;
};

export type Runtime = {
  // Reserved for future runtime operations (e.g., generateReport)
};

export type HandlerFn<TConfig, TOutput, TAdapted> = (
  env: Environment<TConfig>,
  rt: Runtime,
  output: TAdapted
) => Promise<unknown> | unknown;

export interface HandlerEntry<
  TConfig = unknown,
  TOutput extends Message<string> = Message<string>,
  TAdapted = TOutput
> {
  trigger: Trigger<TOutput, TAdapted>;
  fn: HandlerFn<TConfig, TAdapted, TAdapted>;
}

export type Workflow<TConfig = unknown> = ReadonlyArray<
  HandlerEntry<TConfig, any, any>
>;

export const Handler = <
  TOutput extends Message<string>,
  TAdapted = TOutput,
  TConfig = unknown
>(
  trigger: Trigger<TOutput, TAdapted>,
  fn: HandlerFn<TConfig, TAdapted, TAdapted>
): HandlerEntry<TConfig, TOutput, TAdapted> => ({ trigger, fn });

export class Runner<TConfig> {
  constructor(
    private readonly env: Environment<TConfig> = {},
    private readonly rt: Runtime = {}
  ) {}

  async run(
    initFn: (
      env: Environment<TConfig>
    ) => Promise<Workflow<TConfig>> | Workflow<TConfig>
  ): Promise<CapabilityResponse | void> {
    const req = getRequest();
    const workflow = await initFn(this.env);
    return await handleExecuteRequest(req, workflow, this.env, this.rt);
  }
}
