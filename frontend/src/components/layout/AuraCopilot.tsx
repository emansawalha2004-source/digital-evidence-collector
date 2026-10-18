import { useMemo, useState } from "react";
import { Bot, BrainCircuit, ChevronDown, Send, ShieldAlert, Sparkles, X } from "lucide-react";

interface Message { role: "assistant" | "user"; text: string; }

const quickPrompts = [
  "كيف أرفع دليل رقمي؟",
  "اشرح Chain of Custody",
  "كيف أعمل تقرير PDF؟",
  "ما معنى Threat Level؟"
];

function answerFor(text: string): string {
  const query = text.toLowerCase();
  if (query.includes("دليل") || query.includes("evidence") || query.includes("رفع")) {
    return "افتحي Evidence Vault أو رفع دليل، اختاري البلاغ، ارفعي الملف، ثم راقبي Hash Verification و Chain of Custody حتى يبقى الدليل موثقًا.";
  }
  if (query.includes("report") || query.includes("تقرير") || query.includes("pdf")) {
    return "من Reports Center اختاري البلاغ أو الدليل، ثم Generate PDF. التقرير يتضمن معلومات البلاغ، الأدلة، السجل الزمني، والتحليل.";
  }
  if (query.includes("chain") || query.includes("custody")) {
    return "Chain of Custody يعني توثيق كل حركة على الدليل: من رفعه، من شاهده، متى تم تحليله، ومتى تم إنشاء تقرير عنه.";
  }
  if (query.includes("threat") || query.includes("خطر") || query.includes("level")) {
    return "Threat Level هو تقييم خطورة البلاغ أو الدليل. Critical يحتاج تدخل سريع، High مهم، Medium متوسط، Low متابعة عادية.";
  }
  return "AURA تقترح: حددي البلاغ، راجعي الأدلة المرتبطة، افحصي سلامة الـ Hash، ثم أنشئي تقرير تحقيق رسمي من Reports Center.";
}

export function AuraCopilot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "أنا AURA، مساعد التحقيق الرقمي. أقدر أساعدك في البلاغات، الأدلة، التقارير، والـ Chain of Custody." }
  ]);

  const systemStatus = useMemo(() => ["Evidence Sync", "Threat Watch", "Report Assist"], []);

  function sendMessage(text = input) {
    const clean = text.trim();
    if (!clean) return;
    setMessages((prev) => [...prev, { role: "user", text: clean }, { role: "assistant", text: answerFor(clean) }]);
    setInput("");
    setOpen(true);
  }

  return (
    <div className={`aura-copilot ${open ? "open" : ""}`} dir="rtl">
      {open ? (
        <section className="aura-panel" aria-label="AURA AI Copilot">
          <header className="aura-header">
            <div className="aura-title">
              <span className="aura-core"><BrainCircuit size={19} /></span>
              <div>
                <strong>AURA Investigation Copilot</strong>
                <small>Classified assistant · Local guidance</small>
              </div>
            </div>
            <button className="aura-icon-btn" onClick={() => setOpen(false)} aria-label="Close chatbot"><X size={18} /></button>
          </header>

          <div className="aura-status-row">
            {systemStatus.map((item) => <span key={item}><ShieldAlert size={12} /> {item}</span>)}
          </div>

          <div className="aura-messages">
            {messages.map((message, index) => (
              <div key={index} className={`aura-message ${message.role}`}>{message.text}</div>
            ))}
          </div>

          <div className="aura-quick">
            {quickPrompts.map((prompt) => <button key={prompt} onClick={() => sendMessage(prompt)}>{prompt}</button>)}
          </div>

          <form className="aura-input" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="اسألي AURA عن التحقيق أو الأدلة..." />
            <button type="submit"><Send size={16} /></button>
          </form>
        </section>
      ) : null}

      <button className="aura-launcher" onClick={() => setOpen((value) => !value)} aria-label="Open AURA chatbot">
        {open ? <ChevronDown size={20} /> : <Bot size={22} />}
        <span><Sparkles size={12} /> AURA</span>
      </button>
    </div>
  );
}
