/**
 * Tag Routes
 *
 * Handles tag management and observation tagging operations.
 */

import express, { Request, Response } from 'express';
import { DatabaseManager } from '../../../worker/DatabaseManager.js';
import { BaseRouteHandler } from '../BaseRouteHandler.js';
import { logger } from '../../../../utils/logger.js';

export class TagRoutes extends BaseRouteHandler {
  constructor(
    private dbManager: DatabaseManager
  ) {
    super();
  }

  /**
   * Get session store lazily to avoid initialization order issues
   */
  private get sessionStore() {
    return this.dbManager.getSessionStore();
  }

  setupRoutes(app: express.Application): void {
    // Tag CRUD
    app.get('/api/tags', this.handleGetAllTags.bind(this));
    app.post('/api/tags', this.handleCreateTag.bind(this));
    app.put('/api/tags/:id', this.handleUpdateTag.bind(this));
    app.delete('/api/tags/:id', this.handleDeleteTag.bind(this));

    // Popular tags
    app.get('/api/tags/popular', this.handleGetPopularTags.bind(this));

    // Observation tagging
    app.get('/api/observations/:id/tags', this.handleGetObservationTags.bind(this));
    app.post('/api/observations/:id/tags', this.handleAddObservationTags.bind(this));
    app.delete('/api/observations/:id/tags', this.handleRemoveObservationTags.bind(this));
    app.get('/api/observations/:id/tags/suggest', this.handleSuggestTags.bind(this));

    // Search by tags
    app.get('/api/search/by-tags', this.handleSearchByTags.bind(this));
  }

  /**
   * Get all tags
   * GET /api/tags
   */
  private handleGetAllTags = this.wrapHandler(async (_req: Request, res: Response): Promise<void> => {
    const tags = this.sessionStore.getAllTags();
    res.json({ tags });
  });

  /**
   * Create a new tag
   * POST /api/tags { name: string, color?: string, description?: string }
   */
  private handleCreateTag = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, color, description } = req.body;

    if (!name || typeof name !== 'string') {
      this.badRequest(res, 'Tag name is required');
      return;
    }

    const result = this.sessionStore.getOrCreateTag(name.trim(), color);

    if (description && result.created) {
      this.sessionStore.updateTag(result.id, { description });
    }

    res.json({
      tag: result,
      created: result.created
    });
  });

  /**
   * Update a tag
   * PUT /api/tags/:id { name?: string, color?: string, description?: string }
   */
  private handleUpdateTag = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      this.badRequest(res, 'Invalid tag ID');
      return;
    }

    const { name, color, description } = req.body;
    const success = this.sessionStore.updateTag(id, { name, color, description });

    if (!success) {
      this.notFound(res, 'Tag not found');
      return;
    }

    res.json({ success: true });
  });

  /**
   * Delete a tag
   * DELETE /api/tags/:id
   */
  private handleDeleteTag = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      this.badRequest(res, 'Invalid tag ID');
      return;
    }

    const success = this.sessionStore.deleteTag(id);
    res.json({ success });
  });

  /**
   * Get popular tags
   * GET /api/tags/popular?limit=20
   */
  private handleGetPopularTags = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const tags = this.sessionStore.getPopularTags(limit);
    res.json({ tags });
  });

  /**
   * Get tags for an observation
   * GET /api/observations/:id/tags
   */
  private handleGetObservationTags = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      this.badRequest(res, 'Invalid observation ID');
      return;
    }

    const tags = this.sessionStore.getObservationTags(id);
    res.json({ tags });
  });

  /**
   * Add tags to an observation
   * POST /api/observations/:id/tags { tags: string[] }
   */
  private handleAddObservationTags = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      this.badRequest(res, 'Invalid observation ID');
      return;
    }

    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      this.badRequest(res, 'Tags must be an array');
      return;
    }

    this.sessionStore.addTagsToObservation(id, tags);
    const updatedTags = this.sessionStore.getObservationTags(id);
    res.json({ tags: updatedTags });
  });

  /**
   * Remove tags from an observation
   * DELETE /api/observations/:id/tags { tags: string[] }
   */
  private handleRemoveObservationTags = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      this.badRequest(res, 'Invalid observation ID');
      return;
    }

    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      this.badRequest(res, 'Tags must be an array');
      return;
    }

    this.sessionStore.removeTagsFromObservation(id, tags);
    const updatedTags = this.sessionStore.getObservationTags(id);
    res.json({ tags: updatedTags });
  });

  /**
   * Suggest tags for an observation
   * GET /api/observations/:id/tags/suggest
   */
  private handleSuggestTags = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      this.badRequest(res, 'Invalid observation ID');
      return;
    }

    const suggestions = this.sessionStore.suggestTagsForObservation(id);
    res.json({ suggestions });
  });

  /**
   * Search observations by tags
   * GET /api/search/by-tags?tags=tag1,tag2&matchAll=false&limit=50&project=...
   */
  private handleSearchByTags = this.wrapHandler(async (req: Request, res: Response): Promise<void> => {
    const tagsParam = req.query.tags as string;
    if (!tagsParam) {
      this.badRequest(res, 'Tags parameter is required');
      return;
    }

    const tags = tagsParam.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length === 0) {
      this.badRequest(res, 'At least one tag is required');
      return;
    }

    const matchAll = req.query.matchAll === 'true';
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const project = req.query.project as string | undefined;

    const observations = this.sessionStore.getObservationsByTags(tags, { matchAll, limit, project });
    res.json({
      observations,
      count: observations.length,
      tags,
      matchAll
    });
  });
}
