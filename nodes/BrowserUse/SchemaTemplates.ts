/* eslint-disable n8n-nodes-base/node-filename-against-convention -- Shared helper module, not an n8n node file. */

/**
 * Pre-built structured-output schemas offered by every API version of the node.
 */
export function getSchemaTemplate(templateType: string): any {
	const templates: Record<string, any> = {
		product: {
			type: 'object',
			properties: {
				productName: { type: 'string' },
				price: { type: 'string' },
				description: { type: 'string' },
				inStock: { type: 'boolean' },
				images: {
					type: 'array',
					items: { type: 'string' },
				},
				specifications: { type: 'object' },
				rating: { type: 'number' },
				reviews: { type: 'number' },
			},
			required: ['productName', 'price'],
		},
		contact: {
			type: 'object',
			properties: {
				companyName: { type: 'string' },
				email: { type: 'string' },
				phone: { type: 'string' },
				address: { type: 'string' },
				website: { type: 'string' },
				socialMedia: {
					type: 'object',
					properties: {
						twitter: { type: 'string' },
						linkedin: { type: 'string' },
						facebook: { type: 'string' },
					},
				},
			},
			required: ['companyName'],
		},
		article: {
			type: 'object',
			properties: {
				title: { type: 'string' },
				author: { type: 'string' },
				publishDate: { type: 'string' },
				content: { type: 'string' },
				summary: { type: 'string' },
				tags: {
					type: 'array',
					items: { type: 'string' },
				},
				readTime: { type: 'string' },
				category: { type: 'string' },
			},
			required: ['title', 'content'],
		},
		company: {
			type: 'object',
			properties: {
				companyName: { type: 'string' },
				industry: { type: 'string' },
				description: { type: 'string' },
				foundedYear: { type: 'string' },
				headquarters: { type: 'string' },
				employees: { type: 'string' },
				revenue: { type: 'string' },
				website: { type: 'string' },
				contactInfo: {
					type: 'object',
					properties: {
						email: { type: 'string' },
						phone: { type: 'string' },
						address: { type: 'string' },
					},
				},
				keyPeople: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							name: { type: 'string' },
							position: { type: 'string' },
						},
					},
				},
			},
			required: ['companyName', 'description'],
		},
	};

	return templates[templateType] || templates.product;
}
