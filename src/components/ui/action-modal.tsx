import Link from "next/link";
import type { ReactNode } from "react";

type ActionModalProps = {
  title: string;
  cancelHref: string;
  children: ReactNode;
  description?: ReactNode;
  maxWidthClassName?: string;
};

export function ActionModal({
  title,
  cancelHref,
  children,
  description,
  maxWidthClassName = "max-w-lg"
}: ActionModalProps) {
  return (
    <div className="bpma-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className={`bpma-modal-panel ${maxWidthClassName}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            {description ? (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</div>
            ) : null}
          </div>
          <Link
            href={cancelHref}
            scroll={false}
            className="btn-secondary shrink-0"
            aria-label={`Fechar ${title}`}
          >
            Fechar
          </Link>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

export function ModalActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}
