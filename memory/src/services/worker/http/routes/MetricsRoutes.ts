/**
 * Metrics Routes
 *
 * Exposes metrics in JSON and Prometheus formats.
 */

import express, { Request, Response } from 'express';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { MetricsService } from '../../MetricsService.js';

export class MetricsRoutes extends BaseRouteHandler {
  private metricsService: MetricsService;

  constructor(metricsService: MetricsService) {
    super();
    this.metricsService = metricsService;
  }

  setupRoutes(app: express.Application): void {
    // JSON metrics
    app.get('/api/metrics', this.handleGetMetrics.bind(this));

    // Prometheus format
    app.get('/metrics', this.handleGetPrometheus.bind(this));
  }

  /**
   * Get metrics as JSON
   * GET /api/metrics
   */
  private handleGetMetrics = this.wrapHandler(async (_req: Request, res: Response): Promise<void> => {
    const metrics = await this.metricsService.getMetrics();
    res.json(metrics);
  });

  /**
   * Get metrics in Prometheus format
   * GET /metrics
   */
  private handleGetPrometheus = this.wrapHandler(async (_req: Request, res: Response): Promise<void> => {
    const prometheus = await this.metricsService.toPrometheus();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheus);
  });
}
