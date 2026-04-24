import { SosService } from './sos.service';
import { SosTriggerSource } from './dto/create-sos.dto';
import { SosStatus } from './dto/update-sos.dto';

describe('SosService', () => {
  let service: SosService;

  beforeEach(() => {
    service = new SosService();
  });

  it('creates an incident and returns active incident by user', () => {
    const created = service.create({
      userId: '8f5ff605-f764-4f95-9d1d-64cbba89c3d9',
      triggerSource: SosTriggerSource.BUTTON,
      latitude: 10.762622,
      longitude: 106.660172,
      note: 'Severe chest pain',
    });

    const active = service.findActiveByUser(created.userId);

    expect(created.status).toBe(SosStatus.OPEN);
    expect(active?.id).toBe(created.id);
  });

  it('marks incident as resolved with auto resolvedAt', () => {
    const created = service.create({
      userId: '47aa2970-3f32-4b7d-83a6-4ecf7034d12a',
      triggerSource: SosTriggerSource.QR,
    });

    const updated = service.update(created.id, {
      status: SosStatus.RESOLVED,
      resolutionNote: 'Emergency contact reached and confirmed safe.',
    });

    expect(updated.status).toBe(SosStatus.RESOLVED);
    expect(updated.resolvedAt).toBeDefined();
  });

  it('filters incidents by status', () => {
    const openIncident = service.create({
      userId: 'a9cf113f-0f8f-4f7d-af66-452d6766f365',
      triggerSource: SosTriggerSource.FACE,
    });

    const resolvedIncident = service.create({
      userId: 'a9cf113f-0f8f-4f7d-af66-452d6766f365',
      triggerSource: SosTriggerSource.BUTTON,
    });

    service.update(resolvedIncident.id, {
      status: SosStatus.RESOLVED,
      resolutionNote: 'Paramedic team completed support.',
    });

    const openItems = service.findAll({ status: SosStatus.OPEN });

    expect(openItems.some((item) => item.id === openIncident.id)).toBe(true);
    expect(openItems.some((item) => item.id === resolvedIncident.id)).toBe(
      false,
    );
  });
});
