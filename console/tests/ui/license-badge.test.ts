/**
 * Tests for LicenseBadge component
 *
 * Tests rendering of license badge for each tier state:
 * solo, team, trial, expired, and null (hidden).
 */
import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LicenseBadge } from "../../src/ui/viewer/components/LicenseBadge.js";
import type { LicenseResponse } from "../../src/services/worker/http/routes/LicenseRoutes.js";

function renderBadge(license: LicenseResponse | null, isLoading = false) {
  return renderToStaticMarkup(
    React.createElement(LicenseBadge, { license, isLoading }),
  );
}

describe("LicenseBadge", () => {
  it("should render Solo badge with primary variant", () => {
    const html = renderBadge({
      valid: true,
      tier: "solo",
      email: "user@example.com",
      daysRemaining: null,
      isExpired: false,
    });

    expect(html).toContain("Solo");
    expect(html).toContain("badge-primary");
  });

  it("should render Team badge with accent variant", () => {
    const html = renderBadge({
      valid: true,
      tier: "team",
      email: "team@example.com",
      daysRemaining: null,
      isExpired: false,
    });

    expect(html).toContain("Team");
    expect(html).toContain("badge-accent");
  });

  it("should render Trial badge with warning variant and days remaining", () => {
    const html = renderBadge({
      valid: true,
      tier: "trial",
      email: "trial@example.com",
      daysRemaining: 7,
      isExpired: false,
    });

    expect(html).toContain("Trial");
    expect(html).toContain("7d left");
    expect(html).toContain("badge-warning");
  });

  it("should render expired badge with error variant", () => {
    const html = renderBadge({
      valid: false,
      tier: "trial",
      email: "trial@example.com",
      daysRemaining: null,
      isExpired: true,
    });

    expect(html).toContain("Expired");
    expect(html).toContain("badge-error");
  });

  it("should render nothing when tier is null (no license or no binary)", () => {
    const html = renderBadge({
      valid: false,
      tier: null,
      email: null,
      daysRemaining: null,
      isExpired: false,
    });

    expect(html).toBe("");
  });

  it("should render nothing when license is null (loading state)", () => {
    const html = renderBadge(null);
    expect(html).toBe("");
  });

  it("should render nothing when isLoading is true", () => {
    const html = renderBadge(
      { valid: true, tier: "solo", email: "user@example.com", daysRemaining: null, isExpired: false },
      true,
    );
    expect(html).toBe("");
  });

  it("should include tooltip with tier and email", () => {
    const html = renderBadge({
      valid: true,
      tier: "solo",
      email: "user@example.com",
      daysRemaining: null,
      isExpired: false,
    });

    expect(html).toContain("tooltip");
    expect(html).toContain("Solo");
    expect(html).toContain("user@example.com");
  });

  it("should include days remaining in tooltip for trial tier", () => {
    const html = renderBadge({
      valid: true,
      tier: "trial",
      email: "trial@example.com",
      daysRemaining: 5,
      isExpired: false,
    });

    expect(html).toContain("5 days remaining");
  });

});
