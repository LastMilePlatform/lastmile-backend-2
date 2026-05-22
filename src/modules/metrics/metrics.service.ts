import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry: Registry;

  // === MÉTRICAS DE NEGOCIO ===
  readonly sessionsStarted: Counter<string>;
  readonly interactions: Counter<string>;
  readonly activeUsers: Gauge<string>;

  // === MÉTRICAS TÉCNICAS ===
  readonly httpDuration: Histogram<string>;
  readonly httpErrors: Counter<string>;
  readonly httpRequests: Counter<string>;
  readonly wsConnectedUsers: Gauge<string>;

  constructor() {
    this.registry = new Registry();
    this.registry.setDefaultLabels({ app: 'lastmile-backend-2' });
    collectDefaultMetrics({ register: this.registry });

    // Negocio
    this.sessionsStarted = new Counter({
      name: 'sessions_started_total',
      help: 'Total de sesiones iniciadas (logins)',
      registers: [this.registry],
    });

    this.interactions = new Counter({
      name: 'interactions_total',
      help: 'Interacciones realizadas por tipo',
      labelNames: ['type'] as const,
      registers: [this.registry],
    });

    this.activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Usuarios activos (con sesión WebSocket activa)',
      registers: [this.registry],
    });

    // Técnicas
    this.httpDuration = new Histogram({
      name: 'http_request_duration_ms',
      help: 'Duración de requests HTTP en milisegundos',
      labelNames: ['method', 'route', 'status'] as const,
      buckets: [10, 25, 50, 100, 250, 500, 1000, 2000],
      registers: [this.registry],
    });

    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Total de requests HTTP',
      labelNames: ['method', 'route', 'status'] as const,
      registers: [this.registry],
    });

    this.httpErrors = new Counter({
      name: 'http_errors_total',
      help: 'Total de errores HTTP (4xx y 5xx)',
      labelNames: ['status'] as const,
      registers: [this.registry],
    });

    this.wsConnectedUsers = new Gauge({
      name: 'websocket_concurrent_users',
      help: 'Usuarios concurrentes conectados por WebSocket',
      registers: [this.registry],
    });
  }

  // ---- Listeners de eventos de negocio ----

  @OnEvent('bid.placed')
  onBidPlaced() {
    this.interactions.inc({ type: 'bid' });
  }

  @OnEvent('auction.sold')
  onAuctionSold() {
    this.interactions.inc({ type: 'auction_buy' });
  }

  @OnEvent('auction.created')
  onAuctionCreated() {
    this.interactions.inc({ type: 'auction_created' });
  }

  @OnEvent('donation.created')
  onDonationCreated() {
    this.interactions.inc({ type: 'donation' });
  }

  @OnEvent('message.sent')
  onMessageSent() {
    this.interactions.inc({ type: 'message' });
  }

  @OnEvent('shipment.status.changed')
  onShipmentStatusChanged() {
    this.interactions.inc({ type: 'shipment_update' });
  }

  @OnEvent('shipment.assigned')
  onShipmentAssigned() {
    this.interactions.inc({ type: 'shipment_assigned' });
  }

  @OnEvent('shipment.delivered')
  onShipmentDelivered() {
    this.interactions.inc({ type: 'shipment_delivered' });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
