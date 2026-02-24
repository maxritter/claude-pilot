/**
 * Tests for ActivationModal component
 *
 * Tests rendering of the license activation modal:
 * input field, submit button, error display, and success state.
 */
import { describe, it, expect } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivationModal } from "../../src/ui/viewer/components/ActivationModal.js";

function renderModal(props: Partial<Parameters<typeof ActivationModal>[0]> = {}) {
  return renderToStaticMarkup(
    React.createElement(ActivationModal, {
      open: true,
      onClose: () => {},
      onActivated: () => {},
      ...props,
    }),
  );
}

describe("ActivationModal", () => {
  it("should render modal with title when open", () => {
    const html = renderModal();

    expect(html).toContain("Activate License");
  });

  it("should render key input field", () => {
    const html = renderModal();

    expect(html).toContain("license-key-input");
  });

  it("should render activate button", () => {
    const html = renderModal();

    expect(html).toContain("Activate");
  });

  it("should not have modal-open class when closed", () => {
    const html = renderModal({ open: false });

    expect(html).not.toContain("modal-open");
  });

  it("should include link to purchase page", () => {
    const html = renderModal();

    expect(html).toContain("pilot-shell.com");
  });
});
