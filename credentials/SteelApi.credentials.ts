import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SteelApi implements ICredentialType {
	name = 'steelApi';

	displayName = 'Steel API';

	documentationUrl = 'https://docs.steel.dev';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.steel.dev',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
	];

	authenticate = {
		type: 'generic' as const,
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
}
