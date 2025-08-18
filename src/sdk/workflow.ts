import type { Message } from "@bufbuild/protobuf";
import type { Mode } from "@cre/generated/sdk/v1alpha/sdk_pb";
import type { Trigger } from "@cre/sdk/utils/triggers/trigger-interface";

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

export class Runner<TConfig = unknown> {
  constructor(
    private readonly env: Environment<TConfig> = {},
    private readonly rt: Runtime = {}
  ) {}

  async run(
    initFn: (
      env: Environment<TConfig>
    ) => Promise<Workflow<TConfig>> | Workflow<TConfig>
  ): Promise<unknown[]> {
    const wf = await initFn(this.env);
    const results: unknown[] = [];
    for (const entry of wf) {
      const out = entry.trigger.newOutput();
      const adapted = await entry.trigger.adapt(out);
      const res = await entry.fn(this.env, this.rt, adapted);
      results.push(res);
    }
    return results;
  }
}
