const BASE_HEADERS: HeadersInit = {
	'Content-Type': 'application/json',
};

const BASE_OPTIONS: RequestInit = {
	credentials: 'include',
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...BASE_OPTIONS,
		...options,
		headers: {
			...BASE_HEADERS,
			...options?.headers,
		},
	});

	if (!response.ok) {
		const data = await response.json().catch(() => ({ error: 'Request failed' }));
		throw new ApiError(data.error || `HTTP ${response.status}`, response.status);
	}

	return response.json();
}

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

export const api = {
	get: <T>(url: string) => request<T>(url),

	post: <T>(url: string, body?: unknown) =>
		request<T>(url, {
			method: 'POST',
			body: body ? JSON.stringify(body) : undefined,
		}),

	put: <T>(url: string, body?: unknown) =>
		request<T>(url, {
			method: 'PUT',
			body: body ? JSON.stringify(body) : undefined,
		}),

	delete: <T>(url: string) =>
		request<T>(url, {
			method: 'DELETE',
		}),
};
