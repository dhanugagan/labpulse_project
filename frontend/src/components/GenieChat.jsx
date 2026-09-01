import React, { useState } from "react";
import { api } from "../api";

export default function GenieChat({ suggestions = [] }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(q) {
    const finalQuestion = q ?? question;
    if (!finalQuestion.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.askGenie(finalQuestion);
      setResult(res);
      setQuestion(finalQuestion);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="genie-panel">
      <h3>🤖 Ask Genie</h3>

      {suggestions.length > 0 && (
        <div className="genie-suggestions">
          {suggestions.map((s) => (
            <button key={s} onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="genie-input-row">
        <input
          placeholder="Ask a question in plain English..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <button onClick={() => ask()} disabled={loading}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}

      {result && (
        <div className="genie-answer">
          <span className="scope-tag">
            Scope applied: {result.scope?.type}
            {result.scope?.value ? ` (${JSON.stringify(result.scope.value)})` : ""}
          </span>
          <p style={{ margin: "0 0 0.6rem" }}>{result.answer}</p>
          {Array.isArray(result.data) && result.data.length > 0 && (
            <table>
              <thead>
                <tr>
                  {Object.keys(result.data[0]).map((k) => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <td key={j}>{String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
