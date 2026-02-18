import { describe, it, expect } from 'bun:test';
import { renderToString } from 'react-dom/server';
import React from 'react';

describe('Usage View Components', () => {
  describe('UsageSummaryCards', () => {
    it('should display daily cost, avg daily cost, daily tokens, avg daily tokens', async () => {
      const { UsageSummaryCards } = await import(
        '../../src/ui/viewer/views/Usage/UsageSummaryCards.js'
      );

      const daily = [
        { date: '2026-02-10', totalCost: 10.0, totalTokens: 500000 },
        { date: '2026-02-11', totalCost: 20.0, totalTokens: 1000000 },
      ];

      const html = renderToString(
        React.createElement(UsageSummaryCards, { daily })
      );

      expect(html).toContain('20.00');
      expect(html).toContain('15.00');
      expect(html).toContain('Daily Cost');
      expect(html).toContain('Avg Daily Cost');
      expect(html).toContain('Daily Tokens');
      expect(html).toContain('Avg Daily Tokens');
    });

    it('should only count active days for averages', async () => {
      const { UsageSummaryCards } = await import(
        '../../src/ui/viewer/views/Usage/UsageSummaryCards.js'
      );

      const daily = [
        { date: '2026-02-08', totalCost: 0, totalTokens: 0 },
        { date: '2026-02-09', totalCost: 0, totalTokens: 0 },
        { date: '2026-02-10', totalCost: 10.0, totalTokens: 500000 },
        { date: '2026-02-11', totalCost: 20.0, totalTokens: 1000000 },
      ];

      const html = renderToString(
        React.createElement(UsageSummaryCards, { daily })
      );

      expect(html).toContain('15.00');
      expect(html).toContain('working days');
      expect(html).toContain('⌀');
    });

    it('should handle empty daily data', async () => {
      const { UsageSummaryCards } = await import(
        '../../src/ui/viewer/views/Usage/UsageSummaryCards.js'
      );

      const html = renderToString(
        React.createElement(UsageSummaryCards, { daily: [] })
      );

      expect(html).toContain('0.00');
    });
  });

  describe('DailyCostChart', () => {
    it('should show "No data available" when daily is empty', async () => {
      const { DailyCostChart } = await import(
        '../../src/ui/viewer/views/Usage/DailyCostChart.js'
      );

      const html = renderToString(
        React.createElement(DailyCostChart, { daily: [] })
      );

      expect(html).toContain('No data available');
    });
  });

  describe('MonthlyCostChart', () => {
    it('should show "No data available" when monthly is empty', async () => {
      const { MonthlyCostChart } = await import(
        '../../src/ui/viewer/views/Usage/MonthlyCostChart.js'
      );

      const html = renderToString(
        React.createElement(MonthlyCostChart, { monthly: [] })
      );

      expect(html).toContain('No data available');
    });
  });

  describe('ModelRoutingInfo', () => {
    it('should render routing table with model info', async () => {
      const { ModelRoutingInfo } = await import(
        '../../src/ui/viewer/views/Usage/ModelRoutingInfo.js'
      );

      const html = renderToString(React.createElement(ModelRoutingInfo));

      expect(html).toContain('card');
      expect(html).toContain('Model Routing');
      expect(html).toContain('Orchestrator');
      expect(html).toContain('Review Agents');
      expect(html).toContain('/settings');
    });
  });

  describe('UsageView', () => {
    it('should show loading spinner on initial render', async () => {
      const { UsageView } = await import(
        '../../src/ui/viewer/views/Usage/index.js'
      );

      const html = renderToString(React.createElement(UsageView));

      expect(html).toContain('loading-spinner');
    });
  });
});
