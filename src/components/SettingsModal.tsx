"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clearAllLocalData } from "@/lib/api";
import { usePushSubscription } from "@/lib/usePushSubscription";

// Settings modal for the standalone demo. The multi-user "Supervisors" admin
// panel from the reference app was backend-specific and has been dropped,
// but the Groq API key field is restored: the server already falls back to
// process.env.GROQ_API_KEY, so this field is just an optional per-browser
// override — leave it blank to use the key configured on Vercel.
export default function SettingsModal({
  open,
  onClose,
  apiKey,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  onSave: (key: string) => void;
}) {
  const [draft, setDraft] = useState(apiKey);
  const push = usePushSubscription();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(32,21,18,0.45)", backdropFilter: "blur(6px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[min(420px,90vw)] rounded p-6 glass"
            style={{ boxShadow: "0 20px 60px rgba(32,21,18,0.20)" }}
          >
            <h2 className="font-serif text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Settings
            </h2>
            <p className="mt-2 font-mono text-[11px]" style={{ color: "var(--muted)" }}>
              This is a local-only demo — all your tasks are stored in this browser&apos;s
              storage. Nothing is sent to a server.
            </p>

            <div className="mt-6 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[1.2px]" style={{ color: "var(--gold-3)" }}>
                Groq API Key (optional)
              </p>
              <p className="font-mono text-[10px]" style={{ color: "var(--muted)" }}>
                Leave blank to use the server default (GROQ_API_KEY set on Vercel). Only set
                this if you want to override it with your own key for this browser.
              </p>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                type="password"
                placeholder="Paste your Groq API key (gsk_…)"
                className="w-full rounded border bg-transparent px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { onSave(""); setDraft(""); }}
                  className="btn-outline rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide"
                >
                  Clear
                </button>
                <button
                  onClick={() => onSave(draft.trim())}
                  className="btn-gold rounded px-4 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px]"
                >
                  Save
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[1.2px]" style={{ color: "var(--gold-3)" }}>
                Daily Briefing Push Notifications
              </p>

              {!push.supported ? (
                <p className="font-mono text-[10px]" style={{ color: "var(--muted)" }}>
                  Not supported in this browser (needs a modern browser with service worker
                  and push support, served over HTTPS).
                </p>
              ) : (
                <>
                  <p className="font-mono text-[10px]" style={{ color: "var(--muted)" }}>
                    {push.subscribed
                      ? "Enabled — this browser will get a real push notification with your morning briefing, even if TaskFlow isn't open."
                      : "Get your morning briefing delivered as a real browser notification once a day, even if no tab is open."}
                  </p>
                  {push.permission === "denied" && (
                    <p className="font-mono text-[10px]" style={{ color: "var(--urgent)" }}>
                      Notifications are blocked for this site — allow them in your browser&apos;s
                      site settings, then try again.
                    </p>
                  )}
                  {push.error && (
                    <p className="font-mono text-[10px]" style={{ color: "var(--urgent)" }}>
                      {push.error}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    {push.subscribed ? (
                      <button
                        onClick={push.unsubscribe}
                        disabled={push.busy}
                        className="rounded border px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide disabled:opacity-50"
                        style={{ borderColor: "var(--urgent)", color: "var(--urgent)" }}
                      >
                        {push.busy ? "Working…" : "Disable"}
                      </button>
                    ) : (
                      <button
                        onClick={push.subscribe}
                        disabled={push.busy || push.permission === "denied"}
                        className="btn-gold rounded px-4 py-1.5 font-mono text-[10px] uppercase tracking-[1.2px] disabled:opacity-50"
                      >
                        {push.busy ? "Working…" : "Enable"}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-between gap-2">
              <button
                onClick={() => {
                  if (confirm("Clear all locally stored tasks and templates? This cannot be undone.")) {
                    clearAllLocalData();
                    window.location.reload();
                  }
                }}
                className="rounded border px-4 py-2 font-mono text-[11px] uppercase tracking-wide"
                style={{ borderColor: "var(--urgent)", color: "var(--urgent)" }}
              >
                Clear local data
              </button>
              <button
                onClick={onClose}
                className="btn-outline rounded px-4 py-2 font-mono text-[10px] uppercase tracking-[1.2px]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
