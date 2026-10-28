
import { useEffect, useState } from "react";
import api from "./api";
import Dashboard from "./Dashboard";
import ClientPortal from "./ClientPortal";
import "./App.css";

function App() {
  const [portal, setPortal] = useState("therapist");
  const [mode, setMode] = useState("login");

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem("unfazed_token"))
  );

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    slug: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIsLoggedIn(Boolean(localStorage.getItem("unfazed_token")));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "register") {
        const response = await api.post("/auth/register", {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          slug: form.slug.trim().toLowerCase(),
        });

        if (response.data.success) {
          setMessage("Registration successful! Please log in.");
          setForm({
            name: "",
            email: form.email,
            password: "",
            slug: "",
          });
          setMode("login");
        }
      } else {
        const response = await api.post("/auth/login", {
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });

        if (response.data.success && response.data.token) {
          localStorage.setItem("unfazed_token", response.data.token);
          localStorage.setItem(
            "unfazed_therapist",
            JSON.stringify(response.data.data)
          );

          setIsLoggedIn(true);
          setMessage("");
        } else {
          setError("Login failed. Please try again.");
        }
      }
    } catch (err) {
      console.error("Authentication error:", err);

      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0]?.msg ||
          "Unable to connect to the server. Check your backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("unfazed_token");
    localStorage.removeItem("unfazed_therapist");

    setIsLoggedIn(false);
    setMode("login");
    setForm({
      name: "",
      email: "",
      password: "",
      slug: "",
    });
    setError("");
    setMessage("");
  };

  if (isLoggedIn) {
    return (
      <>
        <div
          style={{
            position: "fixed",
            top: "12px",
            right: "20px",
            zIndex: 9999,
          }}
        >
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 18px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "#fff",
              color: "#333",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>

        <Dashboard />
      </>
    );
  }

  if (portal === "client") {
    return (
      <ClientPortal
        onBack={() => {
          setPortal("therapist");
          setError("");
          setMessage("");
        }}
      />
    );
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    marginTop: "7px",
    border: "1px solid #ddd",
    borderRadius: "9px",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        boxSizing: "border-box",
        background: "#f7f4fb",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "430px",
          padding: "32px",
          boxSizing: "border-box",
          borderRadius: "18px",
          background: "#fff",
          boxShadow: "0 12px 40px rgba(40, 20, 70, 0.09)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "30px", fontWeight: 700, color: "#7252a5" }}>
            unfazed<span style={{ color: "#d4a0a0" }}>.</span>
          </div>

          <p style={{ color: "#777", fontSize: "12px", letterSpacing: "1px" }}>
            THERAPIST PRACTICE MANAGEMENT
          </p>
        </div>

        <h2 style={{ marginBottom: "8px", color: "#292433" }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>

        <p style={{ color: "#777", fontSize: "14px", marginBottom: "24px" }}>
          {mode === "login"
            ? "Log in to manage your therapy practice."
            : "Register to get started with Unfazed."}
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: "12px",
              marginBottom: "16px",
              borderRadius: "8px",
              color: "#a32121",
              background: "#fff0f0",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              padding: "12px",
              marginBottom: "16px",
              borderRadius: "8px",
              color: "#176b3a",
              background: "#edf9f0",
              fontSize: "13px",
            }}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "register" && (
            <>
              <label style={{ display: "block", marginBottom: "16px", fontSize: "14px" }}>
                Full name
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  style={inputStyle}
                />
              </label>

              <label style={{ display: "block", marginBottom: "16px", fontSize: "14px" }}>
                Profile URL name
                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="e.g. alex-morgan"
                  required
                  style={inputStyle}
                />
              </label>
            </>
          )}

          <label style={{ display: "block", marginBottom: "16px", fontSize: "14px" }}>
            Email address
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              style={inputStyle}
            />
          </label>

          <label style={{ display: "block", marginBottom: "20px", fontSize: "14px" }}>
            Password
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
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              minLength={mode === "register" ? 8 : undefined}
              required
              style={inputStyle}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              border: "none",
              borderRadius: "9px",
              background: loading ? "#a99abd" : "#7252a5",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Log in as Therapist"
                : "Create Therapist Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "22px", color: "#777", fontSize: "14px" }}>
          {mode === "login" ? "Don't have a therapist account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setMessage("");
            }}
            style={{
              border: "none",
              background: "none",
              color: "#7252a5",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {mode === "login" ? "Register" : "Log in"}
          </button>
        </p>

        <div style={{ borderTop: "1px solid #eee", marginTop: "24px", paddingTop: "20px", textAlign: "center" }}>
          <p style={{ color: "#777", fontSize: "14px" }}>
            Are you a client?
          </p>

          <button
            type="button"
            onClick={() => {
              setPortal("client");
              setError("");
              setMessage("");
            }}
            style={{
              width: "100%",
              padding: "12px",
              border: "1px solid #7252a5",
              borderRadius: "9px",
              background: "#fff",
              color: "#7252a5",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Open Client Portal
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
