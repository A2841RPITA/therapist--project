
import { useEffect, useState } from "react";
import axios from "axios";
import "./ClientPortal.css";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

function ClientPortal({ onBack }) {
  const [mode, setMode] = useState("login");
  const [token, setToken] = useState(
    localStorage.getItem("unfazed_client_token") || ""
  );
  const [client, setClient] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("unfazed_client") || "null"
      );
    } catch {
      return null;
    }
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    therapistSlug: "",
  });

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setNotice("");
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const endpoint =
        mode === "register"
          ? "/client-auth/register"
          : "/client-auth/login";

      const payload = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        therapistSlug: form.therapistSlug.trim().toLowerCase(),
      };

      if (mode === "register") {
        payload.name = form.name.trim();
      }

      const response = await API.post(endpoint, payload);
      const result = response.data;

      if (!result.success || !result.token) {
        throw new Error(result.message || "Authentication failed.");
      }

      localStorage.setItem("unfazed_client_token", result.token);
      localStorage.setItem("unfazed_client", JSON.stringify(result.data));

      setToken(result.token);
      setClient(result.data);
      setForm({
        name: "",
        email: "",
        password: "",
        therapistSlug: "",
      });
      setNotice(result.message || "Successfully logged in.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          err.message ||
          "Unable to continue. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!token) return;

    setMessagesLoading(true);

    try {
      const response = await API.get("/client-messages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMessages(response.data.data || []);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load messages. Please log in again if your session expired."
      );
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadMessages();
    }
  }, [token]);

  const sendMessage = async (event) => {
    event.preventDefault();

    if (!text.trim()) {
      setError("Please enter a message before sending.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      await API.post(
        "/client-messages",
        { text: text.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setText("");
      setNotice("Your message has been sent.");
      await loadMessages();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Message could not be sent. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("unfazed_client_token");
    localStorage.removeItem("unfazed_client");

    setToken("");
    setClient(null);
    setMessages([]);
    setText("");
    setError("");
    setNotice("");
    setMode("login");
  };

  const switchMode = () => {
    setMode((previous) =>
      previous === "login" ? "register" : "login"
    );
    setError("");
    setNotice("");
  };

  return (
    <main className="client-portal">
      <header className="cp-header">
        <button
          type="button"
          className="cp-brand"
          onClick={onBack}
          aria-label="Back to therapist login"
        >
          <span className="cp-brand-icon">♡</span>
          <span>
            <strong>unfazed<span className="cp-brand-dot">.</span></strong>
            <small>CLIENT PORTAL</small>
          </span>
        </button>

        {token ? (
          <button
            type="button"
            className="cp-button cp-button-outline"
            onClick={logout}
          >
            Logout
          </button>
        ) : (
          <button
            type="button"
            className="cp-button cp-button-outline"
            onClick={onBack}
          >
            Back
          </button>
        )}
      </header>

      {error && (
        <div className="cp-alert cp-alert-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="cp-alert cp-alert-success" role="status">
          {notice}
        </div>
      )}

      {!token ? (
        <section className="cp-auth-card">
          <div className="cp-heading-icon">♡</div>

          <p className="cp-eyebrow">YOUR WELLNESS MATTERS</p>

          <h1>
            {mode === "login"
              ? "Welcome back"
              : "Create your account"}
          </h1>

          <p className="cp-description">
            {mode === "login"
              ? "Log in to view messages from your therapist."
              : "Register to access your personal client portal."}
          </p>

          <form className="cp-form" onSubmit={handleAuth}>
            {mode === "register" && (
              <label className="cp-field">
                <span>Full name</span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                />
              </label>
            )}

            <label className="cp-field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="cp-field">
              <span>Password</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder={
                  mode === "register"
                    ? "At least 8 characters"
                    : "Enter your password"
                }
                autoComplete={
                  mode === "register"
                    ? "new-password"
                    : "current-password"
                }
                minLength={mode === "register" ? 8 : undefined}
                required
              />
            </label>

            <label className="cp-field">
              <span>Therapist profile slug</span>
              <input
                type="text"
                name="therapistSlug"
                value={form.therapistSlug}
                onChange={handleChange}
                placeholder="e.g. alex-morgan"
                required
              />
              <small>
                Enter the profile URL name provided by your therapist.
              </small>
            </label>

            <button
              type="submit"
              className="cp-button cp-button-primary cp-submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Log in to Client Portal"
                  : "Create Client Account"}
            </button>
          </form>

          <div className="cp-switch">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}

            <button type="button" onClick={switchMode}>
              {mode === "login" ? "Register" : "Log in"}
            </button>
          </div>

          {mode === "register" && (
            <div className="cp-info">
              <strong>Before you register</strong>
              <p>
                Your therapist must already have added your client
                record with the same email address.
              </p>
            </div>
          )}
        </section>
      ) : (
        <section className="cp-dashboard">
          <div className="cp-welcome-card">
            <p className="cp-eyebrow">YOUR PERSONAL SPACE</p>
            <h1>Welcome, {client?.name || "Client"}!</h1>
            <p>{client?.email || ""}</p>
            <p>
              You can read your conversation and send messages to your
              therapist here.
            </p>
          </div>

          <section className="cp-messages-card">
            <div className="cp-messages-heading">
              <div>
                <p className="cp-eyebrow">STAY CONNECTED</p>
                <h2>Your messages</h2>
              </div>

              <button
                type="button"
                className="cp-button cp-button-outline"
                onClick={loadMessages}
                disabled={messagesLoading}
              >
                {messagesLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <div className="cp-message-list">
              {messagesLoading && messages.length === 0 ? (
                <p className="cp-empty">Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="cp-empty">
                  <span className="cp-empty-icon">♡</span>
                  <h3>No messages yet</h3>
                  <p>
                    Messages from your therapist will appear here.
                  </p>
                </div>
              ) : (
                messages.map((item) => (
                  <article
                    key={item._id}
                    className={`cp-message ${
                      item.sender === "client"
                        ? "cp-message-sent"
                        : "cp-message-received"
                    }`}
                  >
                    <strong>
                      {item.sender === "client"
                        ? "You"
                        : item.senderName || "Therapist"}
                    </strong>

                    <p>{item.text}</p>

                    <small>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : ""}
                    </small>
                  </article>
                ))
              )}
            </div>

            <form className="cp-send-form" onSubmit={sendMessage}>
              <label className="cp-field">
                <span>Write a message</span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  maxLength={5000}
                  required
                />
              </label>

              <div className="cp-send-footer">
                <small>{text.length}/5000 characters</small>

                <button
                  type="submit"
                  className="cp-button cp-button-primary"
                  disabled={loading || !text.trim()}
                >
                  {loading ? "Sending..." : "Send message"}
                </button>
              </div>
            </form>
          </section>
        </section>
      )}

      <footer className="cp-footer">
        Unfazed Client Portal · Your wellness matters ♡
      </footer>
    </main>
  );
}

export default ClientPortal;
