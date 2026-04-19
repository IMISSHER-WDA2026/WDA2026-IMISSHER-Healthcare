import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export class JsonPersistenceStore<T> {
    private readonly persistenceEnabled: boolean;
    private readonly filePath: string;

    constructor(fileName: string) {
        this.persistenceEnabled = process.env.NODE_ENV !== 'test';

        const configuredDir = process.env.IMISSHER_DATA_DIR;
        const baseDir = configuredDir
            ? resolve(process.cwd(), configuredDir)
            : resolve(process.cwd(), '.runtime-data');

        this.filePath = resolve(baseDir, fileName);

        if (this.persistenceEnabled && !existsSync(dirname(this.filePath))) {
            mkdirSync(dirname(this.filePath), { recursive: true });
        }
    }

    load(defaultValue: T[] = []): T[] {
        if (!this.persistenceEnabled) {
            return [...defaultValue];
        }

        if (!existsSync(this.filePath)) {
            return [...defaultValue];
        }

        try {
            const content = readFileSync(this.filePath, 'utf8');
            const parsed = JSON.parse(content) as unknown;

            if (!Array.isArray(parsed)) {
                return [...defaultValue];
            }

            return parsed as T[];
        } catch {
            return [...defaultValue];
        }
    }

    save(items: T[]): void {
        if (!this.persistenceEnabled) {
            return;
        }

        writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf8');
    }

    nextId(items: Array<{ id: number }>): number {
        if (items.length === 0) {
            return 1;
        }

        const maxId = items.reduce((max, item) => (item.id > max ? item.id : max), 0);
        return maxId + 1;
    }
}