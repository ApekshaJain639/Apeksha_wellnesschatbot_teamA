import os
import re
import sys
import json
import textwrap
from datetime import datetime
from openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-api-key-here")  
MODEL           = "gpt-4.0-mini"        
MAX_TOKENS      = 600
TEMPERATURE     = 0.65
MAX_HISTORY     = 20                   # rolling window of messages kept
WIDTH           = 68                   # console wrap width


CRISIS_KEYWORDS = [
    "suicide", "kill myself", "want to die", "end my life",
    "self harm", "self-harm", "hurt myself", "cutting myself",
    "no reason to live", "better off dead", "overdose on",
    "end it all", "don't want to be here anymore",
]


SYSTEM_PROMPT = """
You are WellBot, a warm, empathetic, and knowledgeable AI Health & Wellness Assistant.

YOUR SCOPE — you specialize in:
  Mental Health:    anxiety, depression, stress, burnout, sleep, mindfulness,
                    meditation, loneliness, anger management, self-esteem,
                    grief, emotional regulation, panic attacks, PTSD awareness
  Physical Health:  exercise & fitness, nutrition & diet, weight management,
                    hydration, headaches, back/neck pain, posture, heart health,
                    immune system, fatigue, digestion, stretching, injury prevention
  Lifestyle:        healthy habits, morning/evening routines, screen time,
                    digital detox, smoking cessation, alcohol reduction,
                    work-life balance, productivity and energy

YOUR PERSONALITY:
  • Warm, compassionate, and non-judgmental — never dismissive
  • Evidence-based — cite research or guidelines (WHO, AHA, APA) when helpful
  • Practical — give actionable, step-by-step advice people can use today
  • Encouraging — celebrate small wins and remind users that progress > perfection
  • Honest about limits — you are NOT a doctor; always recommend professional
    help for medical diagnoses, prescriptions, or serious concerns

RESPONSE FORMAT:
  • Use clear structure: short intro, numbered/bulleted action steps, closing tip
  • Keep responses focused and readable — avoid walls of text
  • Use markdown-style formatting (bullets, bold, headers) for clarity
  • End responses for mental health topics with a gentle reminder that
    professional support is available if needed

STRICT RULES:
  1. NEVER diagnose medical or psychiatric conditions
  2. NEVER recommend specific medications, dosages, or supplements as treatment
  3. NEVER provide harmful information even if requested
  4. ALWAYS refer users to emergency services / crisis lines for crisis situations
  5. If a question is completely outside health/wellness, politely redirect:
     "I'm specialized in health and wellness — let me help you with that!"
  6. Be concise — most responses should be under 300 words unless complexity requires more

MEDICAL DISCLAIMER (remind users periodically):
  WellBot provides general wellness information only. It is not a substitute
  for professional medical advice, diagnosis, or treatment.
""".strip()


def wrap_text(text: str, width: int = WIDTH, indent: str = "  ") -> str:
    """Wrap text preserving existing newlines and indentation."""
    lines = text.split("\n")
    result = []
    for line in lines:
        if len(line) <= width:
            result.append(line)
        else:
            wrapped = textwrap.fill(line, width=width, subsequent_indent=indent)
            result.append(wrapped)
    return "\n".join(result)


def print_bot(message: str, model_info: str = ""):
    """Print a formatted bot response."""
    print(f"\n  🤖  WellBot:")
    print("  " + "─" * WIDTH)
    for line in wrap_text(message).split("\n"):
        print(f"  {line}")
    print("  " + "─" * WIDTH)
    if model_info:
        print(f"  {model_info}")


def print_header():
    """Print the welcome banner."""
    print("\n" + "╔" + "═" * 68 + "╗")
    print("║" + "       WellBot AI — Powered by OpenAI GPT".center(68) + "║")
    print("║" + "   Mental Health · Physical Health · Nutrition · Habits".center(68) + "║")
    print("╚" + "═" * 68 + "╝")
    print("\n  ⚠️  DISCLAIMER: WellBot provides general wellness information only.")
    print("     It is NOT a substitute for professional medical advice.")
    print("     Always consult a qualified healthcare provider.\n")
    print(f"  Model: {MODEL}  |  Commands: 'history', 'clear', 'save', 'quit'\n")


def is_crisis(text: str) -> bool:
    """Check for crisis keywords before API call."""
    text_lower = text.lower()
    return any(kw in text_lower for kw in CRISIS_KEYWORDS)


def handle_crisis():
    """Print crisis resources immediately."""
    print("\n  " + "⚠️  " * 10)
    print_bot(
        "I'm genuinely concerned about what you've shared, and I want you to know "
        "you are not alone. Please reach out to a crisis resource right now:\n\n"
        "🆘  CRISIS RESOURCES (FREE · CONFIDENTIAL · 24/7)\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "📞  988 Suicide & Crisis Lifeline  →  Call or Text  988  (US)\n"
        "💬  Crisis Text Line              →  Text HOME to 741741 (US)\n"
        "🌐  International Resources       →  https://findahelpline.com\n"
        "🚨  Emergency                     →  Call 911 or go to nearest ER\n\n"
        "You matter. Please reach out — support is available right now. 💙"
    )
    print("  " + "⚠️  " * 10 + "\n")


def format_token_info(usage) -> str:
    """Format token usage info."""
    if usage:
        return (f"[tokens — prompt: {usage.prompt_tokens} | "
                f"completion: {usage.completion_tokens} | "
                f"total: {usage.total_tokens}]")
    return ""


def save_session(history: list, filename: str = None):
    """Save conversation history to a JSON file."""
    if not filename:
        filename = f"wellbot_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    data = {
        "session_date": datetime.now().isoformat(),
        "model": MODEL,
        "message_count": len([m for m in history if m["role"] == "user"]),
        "conversation": history,
    }
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"\n  ✅ Session saved to: {filename}")
    return filename


def print_history(history: list):
    """Print the conversation history."""
    user_msgs = [m for m in history if m["role"] in ("user", "assistant")]
    if not user_msgs:
        print("\n  No conversation history yet.")
        return
    print(f"\n  {'─' * WIDTH}")
    print(f"  CONVERSATION HISTORY ({len(user_msgs)//2} exchanges)")
    print(f"  {'─' * WIDTH}")
    for msg in user_msgs:
        role = "You" if msg["role"] == "user" else "WellBot"
        content = msg["content"][:120] + "..." if len(msg["content"]) > 120 else msg["content"]
        print(f"\n  [{role}]: {content}")
    print(f"\n  {'─' * WIDTH}")


class WellBotAI:
    def __init__(self, api_key: str):
        if api_key == "your_api_key_here" or not api_key:
            print("\n  ❌ ERROR: No OpenAI API key found!")
            print("     Set it via environment variable:  export OPENAI_API_KEY='sk-...'")
            print("     Or edit OPENAI_API_KEY at the top of this file.\n")
            sys.exit(1)

        self.client     = OpenAI(api_key=api_key)
        self.history    = []      # rolling conversation history
        self.turn_count = 0
        self.total_tokens_used = 0

        # Periodic disclaimer reminder every N turns
        self.disclaimer_interval = 8

    # ── Trim history to avoid runaway token usage ─────────────
    def _trim_history(self):
        """Keep only the last MAX_HISTORY messages."""
        if len(self.history) > MAX_HISTORY:
            self.history = self.history[-MAX_HISTORY:]

    # ── Call OpenAI API ───────────────────────────────────────
    def _call_api(self, user_message: str) -> tuple[str, object]:
        """Send message to OpenAI and return (reply_text, usage)."""
        self.history.append({"role": "user", "content": user_message})
        self._trim_history()

        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + self.history

        response = self.client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            presence_penalty=0.3,
            frequency_penalty=0.3,
        )

        reply = response.choices[0].message.content.strip()
        self.history.append({"role": "assistant", "content": reply})
        return reply, response.usage

    # ── Handle special commands ───────────────────────────────
    def _handle_command(self, cmd: str) -> bool:
        """Handle slash commands. Returns True if handled."""
        cmd = cmd.lower().strip()

        if cmd in ("history", "/history"):
            print_history(self.history)
            return True

        if cmd in ("clear", "/clear"):
            self.history = []
            print("\n  🗑️  Conversation history cleared. Starting fresh!")
            return True

        if cmd in ("save", "/save"):
            save_session(self.history)
            return True

        if cmd.startswith("save "):
            fname = cmd.split(" ", 1)[1].strip()
            save_session(self.history, fname)
            return True

        if cmd in ("model", "/model"):
            print(f"\n  Current model: {MODEL}  |  Tokens used: {self.total_tokens_used}")
            return True

        if cmd in ("help", "/help"):
            print("\n  AVAILABLE COMMANDS:")
            print("  ─────────────────────────────────────────────────────")
            print("  history  — Show conversation history")
            print("  clear    — Clear conversation and start fresh")
            print("  save     — Save session to JSON file")
            print("  save <filename> — Save to specific filename")
            print("  model    — Show current model & token usage")
            print("  help     — Show this help menu")
            print("  quit / exit — End the session")
            print("\n  HEALTH TOPICS YOU CAN ASK ABOUT:")
            print("  Mental Health: anxiety, depression, stress, sleep,")
            print("    mindfulness, loneliness, anger, self-esteem, grief")
            print("  Physical: exercise, nutrition, weight, hydration,")
            print("    headaches, back pain, heart health, immunity")
            print("  Lifestyle: habits, screen time, smoking, alcohol")
            return True

        return False

    # ── Periodic disclaimer ───────────────────────────────────
    def _maybe_show_disclaimer(self):
        if self.turn_count > 0 and self.turn_count % self.disclaimer_interval == 0:
            print("\n  ℹ️  Reminder: WellBot provides general wellness information only.")
            print("     Please consult a healthcare professional for medical concerns.\n")

    # ── Main chat method ──────────────────────────────────────
    def chat(self):
        print_header()

        # Opening message
        opening_msg = (
            "Hello! 👋 I'm WellBot, your AI-powered Health & Wellness companion.\n\n"
            "I can support you with mental health, "
            "physical health , and healthy lifestyle habits.\n\n"
            "How are you feeling today? What can I help you with? 💙"
        )
        print_bot(opening_msg)

        while True:
            try:
                user_input = input("\n  You: ").strip()
            except (KeyboardInterrupt, EOFError):
                print("\n\n  WellBot: Take care of yourself! Goodbye! 👋\n")
                break

            if not user_input:
                continue

            # ── Exit commands ─────────────────────────────────
            if user_input.lower() in {"quit", "exit", "q", "bye", "goodbye"}:
                farewell, _ = self._call_api(
                    "The user is ending the session. Give a warm, encouraging farewell "
                    "and a single wellness tip to carry with them."
                )
                print_bot(farewell)
                if self.history:
                    choice = input("\n  Save this session before exiting? (y/n): ").strip().lower()
                    if choice == "y":
                        save_session(self.history)
                print(f"\n  Session summary: {self.turn_count} exchanges | "
                      f"{self.total_tokens_used} tokens used\n")
                break

            # ── Special commands ──────────────────────────────
            if self._handle_command(user_input):
                continue

            # ── Crisis detection (before API call) ───────────
            if is_crisis(user_input):
                handle_crisis()
                # Still engage empathetically after crisis resources
                try:
                    empathy, usage = self._call_api(
                        user_input + "\n[IMPORTANT: The user may be in distress. "
                        "Respond with deep empathy and compassion. Strongly encourage "
                        "them to contact a crisis helpline or trusted person immediately. "
                        "Keep the response warm and supportive.]"
                    )
                    print_bot(empathy)
                    if usage:
                        self.total_tokens_used += usage.total_tokens
                except Exception:
                    pass
                continue

            # ── Regular API call ──────────────────────────────
            self._maybe_show_disclaimer()
            print(f"\n  ⏳ WellBot is thinking...", end="\r")

            try:
                reply, usage = self._call_api(user_input)
                self.turn_count += 1

                if usage:
                    self.total_tokens_used += usage.total_tokens
                    token_info = format_token_info(usage)
                else:
                    token_info = ""

                print_bot(reply, token_info)

            except Exception as e:
                error_msg = str(e)
                print(f"\n  ❌ API Error: {error_msg}")

                if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                    print("     Check your OPENAI_API_KEY is valid.")
                elif "rate_limit" in error_msg.lower():
                    print("     Rate limit reached. Please wait a moment and try again.")
                elif "model" in error_msg.lower():
                    print(f"     Model '{MODEL}' may not be available. Try 'gpt-3.5-turbo'.")
                else:
                    print("     Please try again.")

# ══════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    # API key can be passed as command-line arg:  python wellbot_openai.py sk-...
    api_key = sys.argv[1] if len(sys.argv) > 1 else OPENAI_API_KEY
    bot = WellBotAI(api_key=api_key)
    bot.chat()
