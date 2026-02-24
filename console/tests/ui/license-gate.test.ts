/**
 * Tests for LicenseGate component
 *
 * Tests the full-page license gate screen that blocks console access
 * when no valid license is present.
 */
import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LicenseGate } from "../../src/ui/viewer/components/LicenseGate.js";
import type { LicenseResponse } from "../../src/services/worker/http/routes/LicenseRoutes.js";

function renderGate(license: LicenseResponse | null) {
  return renderToStaticMarkup(
    React.createElement(LicenseGate, { license, onActivated: () => {} }),
  );
}

describe("LicenseGate", () => {
  it("should render license required title when no license", () => {
    const html = renderGate({
      valid: false,
      tier: null,
      email: null,
      daysRemaining: null,
      isExpired: false,
    });

    expect(html).toContain("License Required");
    expect(html).toContain("Enter your license key");
  });

  it("should render expired title when license is expired", () => {
    const html = renderGate({
      valid: false,
      tier: "trial",
      email: "user@example.com",
      daysRemaining: null,
      isExpired: true,
    });

    expect(html).toContain("License Expired");
    expect(html).toContain("has expired");
  });

  it("should contain activation input", () => {
    const html = renderGate(null);

    expect(html).toContain("Enter your license key");
    expect(html).toContain("Activate License");
  });

  it("should contain link to pricing page", () => {
    const html = renderGate(null);

    expect(html).toContain("pilot-shell.com/#pricing");
    expect(html).toContain("Get a License");
  });

  it("should contain link to main site", () => {
    const html = renderGate(null);

    expect(html).toContain("pilot-shell.com");
  });

  it("should render activate button as disabled by default (empty key)", () => {
    const html = renderGate(null);

    expect(html).toContain("disabled");
    expect(html).toContain("Activate License");
  });

  it("should use lock icon for no license", () => {
    const html = renderGate({
      valid: false,
      tier: null,
      email: null,
      daysRemaining: null,
      isExpired: false,
    });

    expect(html).toContain("\u{1F512}");
  });

  it("should use prohibited icon for expired license", () => {
    const html = renderGate({
      valid: false,
      tier: "trial",
      email: null,
      daysRemaining: null,
      isExpired: true,
    });

    expect(html).toContain("\u{1F6AB}");
  });
});
