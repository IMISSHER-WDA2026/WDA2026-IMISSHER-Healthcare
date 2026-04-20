const DEFAULT_JWT_SECRET = 'healthcare-dev-secret';
const DEFAULT_DATABASE_URL =
    'postgres://postgres:password123@localhost:5432/healthcare_local_db';

function isProductionEnvironment(): boolean {
    return (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
}

export function resolveJwtSecret(): string {
    const configuredSecret = process.env.JWT_SECRET?.trim();

    if (!configuredSecret) {
        if (isProductionEnvironment()) {
            throw new Error('JWT_SECRET must be set in production.');
        }
        return DEFAULT_JWT_SECRET;
    }

    if (isProductionEnvironment() && configuredSecret === DEFAULT_JWT_SECRET) {
        throw new Error('JWT_SECRET cannot use the development default in production.');
    }

    if (isProductionEnvironment() && configuredSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters in production.');
    }

    return configuredSecret;
}

export function resolveDatabaseUrl(): string {
    const databaseUrl =
        process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim() || '';

    if (databaseUrl) {
        return databaseUrl;
    }

    if (isProductionEnvironment()) {
        throw new Error('DATABASE_URL (or SUPABASE_DB_URL) must be set in production.');
    }

    return DEFAULT_DATABASE_URL;
}

export function assertSecureCorsConfiguration(allowAllOrigins: boolean): void {
    if (isProductionEnvironment() && allowAllOrigins) {
        throw new Error('CORS_ORIGIN must be explicitly configured in production.');
    }
}
