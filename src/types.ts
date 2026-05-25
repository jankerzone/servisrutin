export interface RateLimit {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export type Bindings = {
	DB: D1Database;
	TURNSTILE_SECRET_KEY: string;
	ASSETS: Fetcher;
	AUTH_LIMITER: RateLimit;
	ENVIRONMENT?: string;
};
