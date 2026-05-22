import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('should be defined with all metric properties', () => {
    expect(service).toBeDefined();
    expect(service.registry).toBeDefined();
    expect(service.sessionsStarted).toBeDefined();
    expect(service.interactions).toBeDefined();
    expect(service.activeUsers).toBeDefined();
    expect(service.httpDuration).toBeDefined();
    expect(service.httpRequests).toBeDefined();
    expect(service.httpErrors).toBeDefined();
    expect(service.wsConnectedUsers).toBeDefined();
  });

  it('getMetrics returns a non-empty string', async () => {
    const result = await service.getMetrics();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contentType returns a non-empty string', () => {
    const result = service.contentType();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('onBidPlaced increments interactions with type bid', () => {
    const incSpy = jest.spyOn(service.interactions, 'inc');
    service.onBidPlaced();
    expect(incSpy).toHaveBeenCalledWith({ type: 'bid' });
  });

  it('onAuctionSold increments interactions with type auction_buy', () => {
    const incSpy = jest.spyOn(service.interactions, 'inc');
    service.onAuctionSold();
    expect(incSpy).toHaveBeenCalledWith({ type: 'auction_buy' });
  });

  it('onAuctionCreated increments interactions with type auction_created', () => {
    const incSpy = jest.spyOn(service.interactions, 'inc');
    service.onAuctionCreated();
    expect(incSpy).toHaveBeenCalledWith({ type: 'auction_created' });
  });

  it('onDonationCreated increments interactions with type donation', () => {
    const incSpy = jest.spyOn(service.interactions, 'inc');
    service.onDonationCreated();
    expect(incSpy).toHaveBeenCalledWith({ type: 'donation' });
  });

  it('onMessageSent increments interactions with type message', () => {
    const incSpy = jest.spyOn(service.interactions, 'inc');
    service.onMessageSent();
    expect(incSpy).toHaveBeenCalledWith({ type: 'message' });
  });

  it('onShipmentStatusChanged increments interactions with type shipment_update', () => {
    const incSpy = jest.spyOn(service.interactions, 'inc');
    service.onShipmentStatusChanged();
    expect(incSpy).toHaveBeenCalledWith({ type: 'shipment_update' });
  });

  it('onShipmentAssigned increments interactions with type shipment_assigned', () => {
    const incSpy = jest.spyOn(service.interactions, 'inc');
    service.onShipmentAssigned();
    expect(incSpy).toHaveBeenCalledWith({ type: 'shipment_assigned' });
  });

  it('onShipmentDelivered increments interactions with type shipment_delivered', () => {
    const incSpy = jest.spyOn(service.interactions, 'inc');
    service.onShipmentDelivered();
    expect(incSpy).toHaveBeenCalledWith({ type: 'shipment_delivered' });
  });
});
