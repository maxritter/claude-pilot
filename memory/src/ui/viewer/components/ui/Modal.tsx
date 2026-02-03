import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function Modal({ open, onClose, title, children, actions }: ModalProps) {
  return (
    <dialog className={`modal ${open ? 'modal-open' : ''}`}>
      <div className="modal-box">
        {title && <h3 className="font-bold text-lg">{title}</h3>}
        <div className="py-4">{children}</div>
        {actions && <div className="modal-action">{actions}</div>}
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
