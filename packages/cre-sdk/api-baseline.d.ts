export * from './sdk';
export * as EVM_PB from '@cre/generated/capabilities/blockchain/evm/v1alpha/client_pb';
export * as CONFIDENTIAL_HTTP_CLIENT_PB from '@cre/generated/capabilities/networking/confidentialhttp/v1alpha/client_pb';
export * as HTTP_CLIENT_PB from '@cre/generated/capabilities/networking/http/v1alpha/client_pb';
export * as HTTP_TRIGGER_PB from '@cre/generated/capabilities/networking/http/v1alpha/trigger_pb';
export * as CRON_TRIGGER_PB from '@cre/generated/capabilities/scheduler/cron/v1/trigger_pb';
export * as SDK_PB from '@cre/generated/sdk/v1alpha/sdk_pb';
export * as VALUES_PB from '@cre/generated/values/v1/values_pb';
export * as BUFBUILD_TYPES from '@cre/sdk/types/bufbuild-types';
export * from './cre';
export * from './don-info';
export * from './errors';
export * from './report';
export type * from './runtime';
export * from './runtime';
export * from './types/bufbuild-types';
export * from './utils';
export * from './utils/capabilities/http/http-helpers';
export * from './wasm';
export * from './workflow';
import type { Message } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import type { ReportRequest, ReportRequestJson } from '@cre/generated/sdk/v1alpha/sdk_pb';
import type { Report } from '@cre/sdk/report';
import type { ConsensusAggregation, PrimitiveTypes, UnwrapOptions } from '@cre/sdk/utils';
import type { SecretsProvider } from '.';
export type { ReportRequest, ReportRequestJson };
export type CallCapabilityParams<I extends Message, O extends Message> = {
    capabilityId: string;
    method: string;
    payload: I;
    inputSchema: GenMessage<I>;
    outputSchema: GenMessage<O>;
};
/**
 * Base runtime available in both DON and Node execution modes.
 * Provides core functionality for calling capabilities and logging.
 */
export interface BaseRuntime<C> {
    config: C;
    callCapability<I extends Message, O extends Message>(params: CallCapabilityParams<I, O>): {
        result: () => O;
    };
    now(): Date;
    log(message: string): void;
}
/**
 * Runtime for Node mode execution.
 */
export interface NodeRuntime<C> extends BaseRuntime<C> {
    readonly _isNodeRuntime: true;
}
/**
 * Runtime for DON mode execution.
 */
export interface Runtime<C> extends BaseRuntime<C>, SecretsProvider {
    /**
     * Executes a function in Node mode and aggregates results via consensus.
     *
     * @param fn - Function to execute in each node (receives NodeRuntime)
     * @param consensusAggregation - How to aggregate results across nodes
     * @param unwrapOptions - Optional unwrapping config for complex return types
     * @returns Wrapped function that returns aggregated result
     */
    runInNodeMode<TArgs extends unknown[], TOutput>(fn: (nodeRuntime: NodeRuntime<C>, ...args: TArgs) => TOutput, consensusAggregation: ConsensusAggregation<TOutput, true>, unwrapOptions?: TOutput extends PrimitiveTypes ? never : UnwrapOptions<TOutput>): (...args: TArgs) => {
        result: () => TOutput;
    };
    report(input: ReportRequest | ReportRequestJson): {
        result: () => Report;
    };
}
import type { Message } from '@bufbuild/protobuf';
import type { Secret, SecretRequest, SecretRequestJson } from '@cre/generated/sdk/v1alpha/sdk_pb';
import { type Runtime } from '@cre/sdk/runtime';
import type { Trigger } from '@cre/sdk/utils/triggers/trigger-interface';
import type { CreSerializable } from './utils';
export type HandlerFn<TConfig, TTriggerOutput, TResult> = (runtime: Runtime<TConfig>, triggerOutput: TTriggerOutput) => Promise<CreSerializable<TResult>> | CreSerializable<TResult>;
export interface HandlerEntry<TConfig, TRawTriggerOutput extends Message<string>, TTriggerOutput, TResult> {
    trigger: Trigger<TRawTriggerOutput, TTriggerOutput>;
    fn: HandlerFn<TConfig, TTriggerOutput, TResult>;
}
export type Workflow<TConfig> = ReadonlyArray<HandlerEntry<TConfig, any, any, any>>;
export declare const handler: <TRawTriggerOutput extends Message<string>, TTriggerOutput, TConfig, TResult>(trigger: Trigger<TRawTriggerOutput, TTriggerOutput>, fn: HandlerFn<TConfig, TTriggerOutput, TResult>) => HandlerEntry<TConfig, TRawTriggerOutput, TTriggerOutput, TResult>;
export type SecretsProvider = {
    getSecret(request: SecretRequest | SecretRequestJson): {
        result: () => Secret;
    };
};
import type { SecretRequest } from '@cre/generated/sdk/v1alpha/sdk_pb';
export declare class DonModeError extends Error {
    constructor();
}
export declare class NodeModeError extends Error {
    constructor();
}
export declare class SecretsError extends Error {
    secretRequest: SecretRequest;
    error: string;
    constructor(secretRequest: SecretRequest, error: string);
}
export declare class NullReportError extends Error {
    constructor();
}
export declare class WrongSignatureCountError extends Error {
    constructor();
}
export declare class ParseSignatureError extends Error {
    constructor();
}
export declare class RecoverSignerError extends Error {
    constructor();
}
export declare class UnknownSignerError extends Error {
    constructor();
}
export declare class DuplicateSignerError extends Error {
    constructor();
}
export declare class RawReportTooShortError extends Error {
    readonly need: number;
    readonly got: number;
    constructor(need: number, got: number);
}
import { type ReportResponse, type ReportResponseJson } from '@cre/generated/sdk/v1alpha/sdk_pb';
import { type Environment, type Zone } from './don-info';
import type { BaseRuntime } from './runtime';
export type ReportParseConfig = {
    acceptedZones?: Zone[];
    acceptedEnvironments?: Environment[];
    skipSignatureVerification?: boolean;
};
export declare const REPORT_METADATA_HEADER_LENGTH = 109;
export type ReportMetadataHeader = {
    version: number;
    executionId: string;
    timestamp: number;
    donId: number;
    donConfigVersion: number;
    workflowId: string;
    workflowName: string;
    workflowOwner: string;
    reportId: string;
    body: Uint8Array;
};
export declare class Report {
    private readonly report;
    private cachedHeader;
    constructor(report: ReportResponse | ReportResponseJson);
    static parse(runtime: BaseRuntime<unknown>, rawReport: Uint8Array, signatures: Uint8Array[], reportContext: Uint8Array, config?: ReportParseConfig): Promise<Report>;
    private parseHeader;
    private verifySignaturesWithConfig;
    seqNr(): bigint;
    configDigest(): Uint8Array;
    reportContext(): Uint8Array;
    rawReport(): Uint8Array;
    version(): number;
    executionId(): string;
    timestamp(): number;
    donId(): number;
    donConfigVersion(): number;
    workflowId(): string;
    workflowName(): string;
    workflowOwner(): string;
    reportId(): string;
    body(): Uint8Array;
    x_generatedCodeOnly_unwrap(): ReportResponse;
}
