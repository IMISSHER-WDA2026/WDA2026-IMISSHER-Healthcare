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

export interface EmergencyContact {
    name: string;
    phone: string;
}

export interface PublicUserProfile {
    id: string;
    fullName: string;
    phone?: string;
    bloodType?: string;
    allergies?: string;
    chronicConditions?: string;
    emergencyContacts?: EmergencyContact[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
}
