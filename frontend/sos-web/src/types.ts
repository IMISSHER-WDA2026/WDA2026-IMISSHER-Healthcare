export type SosStatus = 'open' | 'acknowledged' | 'resolved' | string;

export interface SosIncident {
    id: number;
    userId: string;
    triggerSource: string;
    status: SosStatus;
    note?: string;
    updatedAt: string;
}

export interface CreateSosIncidentPayload {
    userId: string;
    triggerSource: string;
    note?: string;
}
