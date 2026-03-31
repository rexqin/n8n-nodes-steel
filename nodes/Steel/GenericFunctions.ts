import type { IDataObject, IExecuteFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export async function steelApiRequest(
	this: IExecuteFunctions,
	method: 'GET' | 'POST',
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
) {
	const credentials = await this.getCredentials('steelApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		json: true,
		qs,
		body,
	};

	if (method === 'GET') {
		delete options.body;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'steelApi', options);
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Steel API request failed (${method} ${endpoint}): ${(error as Error).message}`,
		);
	}
}
