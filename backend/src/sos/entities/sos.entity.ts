import type { CreateSosDto } from '../dto/create-sos.dto';
import type { SosStatus } from '../dto/update-sos.dto';

export interface SosEntity {
  id: number;
  userId: string;
  triggerSource: CreateSosDto['triggerSource'];
  status: SosStatus;
  latitude?: number;
  longitude?: number;
  note?: string;
  responderPhone?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}