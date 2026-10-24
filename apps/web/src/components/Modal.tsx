import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  labelledBy: string;
  pending?: boolean;
  onClose(): void;
  children: ReactNode;
}

/**
 * A native <dialog> gives us focus trapping, Escape handling and the backdrop
 * without reimplementing accessibility. React state stays in sync through the
 * cancel event and the showModal/close calls below.
 */
export function Modal({ open, labelledBy, pending = false, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    const handleCancel = (event: Event) => {
      event.preventDefault();

      if (!pending) {
        onClose();
      }
    };

    const handleClose = () => {
      if (open && !pending) {
        onClose();
      }
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
    };
  }, [open, pending, onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending) {
          onClose();
        }
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-card border border-line bg-panel p-0 text-ink shadow-2xl backdrop:bg-canvas/80 backdrop:backdrop-blur-sm"
    >
      {children}
    </dialog>
  );
}
