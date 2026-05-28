"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { useAiStore } from "@/store/aiStore";
import { useAiSnapshot } from "@/hooks/useAiSnapshot";
import { cn } from "@/utils";
import styles from "./AiAssistant.module.scss";

const SUGGESTIONS = [
  "How can I save more?",
  "Where am I overspending?",
  "Plan my EMIs",
  "Goal progress?",
];

export const AiAssistant = () => {
  const snapshot = useAiSnapshot();
  const messages = useAiStore((s) => s.messages);
  const thinking = useAiStore((s) => s.thinking);
  const sendMessage = useAiStore((s) => s.sendMessage);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const submit = (text: string) => {
    const value = text.trim();
    if (!value || thinking) return;
    setDraft("");
    void sendMessage(snapshot, value);
  };

  return (
    <div className={styles.assistant}>
      <div className={styles.assistant_messages} ref={scrollRef}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            className={cn(
              styles.bubble,
              message.role === "user" ? styles["bubble--user"] : styles["bubble--ai"],
            )}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
          >
            {message.role === "assistant" && (
              <span className={styles.bubble_mark}>
                <Sparkles size={12} />
              </span>
            )}
            <span className={styles.bubble_text}>{message.content}</span>
          </motion.div>
        ))}
        <AnimatePresence>
          {thinking && (
            <motion.div
              className={`${styles.bubble} ${styles["bubble--ai"]}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className={styles.bubble_mark}>
                <Sparkles size={12} />
              </span>
              <span className={styles.typing}>
                <span /> <span /> <span />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.suggestions}>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            className={styles.suggestions_chip}
            onClick={() => submit(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
      >
        <input
          className={styles.composer_input}
          placeholder="Ask your money assistant…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="submit"
          className={styles.composer_send}
          disabled={!draft.trim() || thinking}
          aria-label="Send"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
