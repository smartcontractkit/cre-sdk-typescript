import { cre } from "@cre/sdk/cre";
import {
  type ConsenusAggregator,
  getAggregatedValue,
} from "@cre/sdk/utils/values/consensus";
import { type SupportedValueTypes, val } from "@cre/sdk/utils/values/value";

export const useConsensus = <TReturn>(
  valueType: SupportedValueTypes,
  aggregationType: ConsenusAggregator
) => {
  return <T extends (...args: any[]) => Promise<TReturn>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) => {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: any, ...args: Parameters<T>) {
      return cre.runInNodeMode(async () => {
        const result = await originalMethod.apply(this, args);
        return getAggregatedValue(val[valueType](result), aggregationType);
      });
    } as T;

    return descriptor;
  };
};
