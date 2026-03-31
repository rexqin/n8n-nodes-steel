import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { steelApiRequest } from './GenericFunctions';

export class Steel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Steel',
		name: 'steel',
		icon: 'file:steel.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with Steel API',
		defaults: {
			name: 'Steel',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'steelApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Steel', value: 'steel' },
					{ name: 'Sessions', value: 'sessions' },
				],
				default: 'steel',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['steel'] } },
				options: [
					{ name: 'PDF', value: 'pdf', action: 'Create a PDF from a URL' },
					{ name: 'Scrape', value: 'scrape', action: 'Scrape a URL' },
					{ name: 'Screenshot', value: 'screenshot', action: 'Take a screenshot from a URL' },
				],
				default: 'pdf',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['steel'], operation: ['pdf', 'scrape', 'screenshot'] } },
				default: '',
				placeholder: 'https://example.com',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['sessions'] } },
				options: [
					{ name: 'Create', value: 'create', action: 'Create a session' },
					{ name: 'Get', value: 'get', action: 'Get a session' },
					{ name: 'List', value: 'list', action: 'List sessions' },
					{ name: 'Release', value: 'release', action: 'Release a session' },
				],
				default: 'create',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				required: true,
				displayOptions: { show: { resource: ['sessions'], operation: ['get', 'release'] } },
				default: '',
			},
			{
				displayName: 'Timeout (ms)',
				name: 'timeout',
				type: 'number',
				displayOptions: { show: { resource: ['sessions'], operation: ['create'] } },
				default: 20000,
			},
			{
				displayName: 'Use Proxy',
				name: 'useProxy',
				type: 'boolean',
				displayOptions: { show: { resource: ['sessions'], operation: ['create'] } },
				default: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			const resource = this.getNodeParameter('resource', i) as string;
			const operation = this.getNodeParameter('operation', i) as string;

			try {
				let responseData: IDataObject;

				if (resource === 'steel') {
					const url = this.getNodeParameter('url', i) as string;
					const body: IDataObject = { url };
					const endpoint = operation === 'pdf' ? '/v1/pdf' : operation === 'scrape' ? '/v1/scrape' : '/v1/screenshot';
					responseData = (await steelApiRequest.call(this, 'POST', endpoint, body)) as IDataObject;
				} else if (resource === 'sessions') {
					if (operation === 'create') {
						const timeout = this.getNodeParameter('timeout', i) as number;
						const useProxy = this.getNodeParameter('useProxy', i) as boolean;
						responseData = (await steelApiRequest.call(this, 'POST', '/v1/sessions', {
							timeout,
							useProxy,
						})) as IDataObject;
					} else if (operation === 'get') {
						const sessionId = this.getNodeParameter('sessionId', i) as string;
						responseData = (await steelApiRequest.call(this, 'GET', `/v1/sessions/${sessionId}`)) as IDataObject;
					} else if (operation === 'list') {
						responseData = (await steelApiRequest.call(this, 'GET', '/v1/sessions')) as IDataObject;
					} else if (operation === 'release') {
						const sessionId = this.getNodeParameter('sessionId', i) as string;
						responseData = (await steelApiRequest.call(this, 'POST', `/v1/sessions/${sessionId}/release`)) as IDataObject;
					} else {
						throw new NodeOperationError(this.getNode(), `Unsupported sessions operation: ${operation}`, {
							itemIndex: i,
						});
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported resource: ${resource}`, { itemIndex: i });
				}

				returnData.push(responseData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as Error).message, itemIndex: i });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
