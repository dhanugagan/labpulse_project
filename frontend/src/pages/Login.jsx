import React, { useState } from "react";
import { api } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.login(email, password);
      localStorage.setItem("labpulse_token", res.token);
      onLogin(res.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>LabPulse</h1>
        <p className="sub">Genie-powered facility & lab intelligence</p>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="demo-accounts">
          <strong>Demo accounts</strong> (password shown after role):<br />
          admin@labpulse.edu / admin123<br />
          rakesh.iyer@labpulse.edu / faculty123 (Faculty)<br />
          arjun.mehta@labpulse.edu / student123 (Student)<br />
          vikram.nair@labpulse.edu / lab123 (Lab Incharge)<br />
          suresh.kumar@labpulse.edu / maint123 (Maintenance)<br />
          divya.menon@labpulse.edu / ops123 (Operations)
        </div>
      </div>
    </div>
  );
}
