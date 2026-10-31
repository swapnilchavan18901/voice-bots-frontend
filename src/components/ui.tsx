"use client";
import { PRODUCT_NAME } from "@/constants/constants";
import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  X,
  AudioLines,
  Stethoscope,
  TrendingUp,
  Sparkles,
} from "lucide-react";
export function Logo() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <AudioLines size={23} strokeWidth={2.4} />
      </span>
      {PRODUCT_NAME}
    </span>
  );
}
export function Spinner() {
  return <Loader2 className="spin" size={17} />;
}
export function ErrorNotice({ text }: { text: string }) {
  return text ? (
    <div className="notice error" role="alert">
      {text}
    </div>
  ) : null;
}
export function CopyButton({
  value,
  label = "Copy",
}: {
  value: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      className="button secondary small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          setFailed(true);
        }
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
      {failed ? "Select and copy manually" : copied ? "Copied" : label}
    </button>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="modal"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function TemplateIcon({
  slug,
  size = 23,
}: {
  slug?: string;
  size?: number;
}) {
  const Icon = slug?.includes("clinic")
    ? Stethoscope
    : slug?.includes("sales")
      ? TrendingUp
      : Sparkles;
  return <Icon size={size} strokeWidth={1.7} />;
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Empty({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Wave({ active = false }: { active?: boolean }) {
  return (
    <div className={`wave ${active ? "active" : ""}`} aria-hidden="true">
      {Array.from({ length: 39 }, (_, i) => (
        <i
          key={i}
          style={{
            height: `${12 + Math.abs(Math.sin(i * 0.69) * Math.cos(i * 0.2)) * 73}px`,
            animationDelay: `${i * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}
