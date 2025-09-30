import { fromJson } from '@bufbuild/protobuf'
import {
	type ReportResponse,
	type ReportResponseJson,
	ReportResponseSchema,
} from '@cre/generated/sdk/v1alpha/sdk_pb'

export class Report {
	private readonly report: ReportResponse
	public constructor(report: ReportResponse | ReportResponseJson) {
		this.report = (report as unknown as { $typeName?: string }).$typeName
			? (report as ReportResponse)
			: fromJson(ReportResponseSchema, report as ReportResponseJson)
	}

	// x_generatedCodeOnly_unwrap is meant to be used by the code generator only.
	x_generatedCodeOnly_unwrap(): ReportResponse {
		return this.report
	}
}
