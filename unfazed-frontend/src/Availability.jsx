
import { useEffect, useState } from "react";
import api from "./api";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DEFAULT_SCHEDULE = DAYS.map((_, dayOfWeek) => ({
  dayOfWeek,
  isAvailable: dayOfWeek >= 1 && dayOfWeek <= 5,
  startTime: "09:00",
  endTime: "17:00",
}));

export default function Availability() {
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [sessionDurations, setSessionDurations] = useState([
    30, 45, 60, 90,
  ]);
  const [overrides, setOverrides] = useState([]);
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      try {
        const response = await api.get("/availability");
        const data = response.data?.data;

        if (!active || !data) return;

        setTimezone(data.timezone || "Asia/Kolkata");
        setBufferMinutes(data.bufferMinutes ?? 10);
        setSessionDurations(data.sessionDurations || [30, 45, 60, 90]);
        setOverrides(data.overrides || []);

        if (Array.isArray(data.weeklySchedule) &&
            data.weeklySchedule.length > 0) {
          setSchedule(
            DAYS.map((_, dayOfWeek) => {
              const saved = data.weeklySchedule.find(
                (day) => day.dayOfWeek === dayOfWeek
              );

              return saved
                ? {
                    dayOfWeek,
                    isAvailable: saved.isAvailable,
                    startTime: saved.startTime || "09:00",
                    endTime: saved.endTime || "17:00",
                  }
                : {
                    ...DEFAULT_SCHEDULE[dayOfWeek],
                    isAvailable: false,
                  };
            })
          );
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load availability settings."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAvailability();

    return () => {
      active = false;
    };
  }, []);

  function updateDay(dayOfWeek, field, value) {
    setSchedule((previous) =>
      previous.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, [field]: value }
          : day
      )
    );
  }

  function toggleDuration(duration) {
    setSessionDurations((previous) =>
      previous.includes(duration)
        ? previous.filter((value) => value !== duration)
        : [...previous, duration].sort((a, b) => a - b)
    );
  }

  function addBlockedDate() {
    setError("");
    setMessage("");

    if (!blockedDate) {
      setError("Please select a date first.");
      return;
    }

    if (overrides.some((item) => item.date === blockedDate)) {
      setError("This date already has an override.");
      return;
    }

    setOverrides((previous) => [
      ...previous,
      {
        date: blockedDate,
        isBlocked: true,
        startTime: "",
        endTime: "",
        reason: blockedReason.trim(),
      },
    ]);

    setBlockedDate("");
    setBlockedReason("");
  }

  async function saveAvailability(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (sessionDurations.length === 0) {
      setError("Select at least one session duration.");
      return;
    }

    for (const day of schedule) {
      if (
        day.isAvailable &&
        (!day.startTime ||
          !day.endTime ||
          day.startTime >= day.endTime)
      ) {
        setError(`Check the start and end times for ${DAYS[day.dayOfWeek]}.`);
        return;
      }
    }

    try {
      setSaving(true);

      const response = await api.put("/availability", {
        timezone,
        weeklySchedule: schedule,
        overrides,
        bufferMinutes: Number(bufferMinutes),
        sessionDurations,
      });

      setMessage(
        response.data?.message || "Availability saved successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not save availability. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const styles = {
    page: {
      minHeight: "100vh",
      padding: "32px",
      background: "#f7f6fb",
      color: "#292433",
      fontFamily: "Arial, sans-serif",
    },
    card: {
      background: "#fff",
      border: "1px solid #eeeaf5",
      borderRadius: "16px",
      padding: "24px",
      marginBottom: "20px",
    },
    input: {
      padding: "10px",
      border: "1px solid #ddd7eb",
      borderRadius: "8px",
      fontSize: "14px",
      maxWidth: "100%",
    },
    button: {
      padding: "12px 18px",
      background: "#806bd0",
      color: "#fff",
      border: "none",
      borderRadius: "9px",
      cursor: "pointer",
      fontWeight: 600,
    },
  };

  if (loading) {
    return <main style={styles.page}>Loading availability settings...</main>;
  }

  return (
    <main style={styles.page}>
      <h1 style={{ marginTop: 0 }}>Availability Settings ✨</h1>
      <p style={{ color: "#777" }}>
        Manage your working hours, session durations and blocked dates.
      </p>

      {error && (
        <p role="alert" style={{ color: "#a32121" }}>{error}</p>
      )}

      {message && (
        <p role="status" style={{ color: "#176b3a" }}>{message}</p>
      )}

      <form onSubmit={saveAvailability}>
        <section style={styles.card}>
          <h2>Weekly schedule</h2>

          {schedule.map((day) => (
            <div
              key={day.dayOfWeek}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(100px, 1fr) auto minmax(100px, 1fr) minmax(100px, 1fr)",
                gap: "12px",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: "1px solid #f0edf5",
              }}
            >
              <strong>{DAYS[day.dayOfWeek]}</strong>

              <label>
                <input
                  type="checkbox"
                  checked={day.isAvailable}
                  onChange={(event) =>
                    updateDay(
                      day.dayOfWeek,
                      "isAvailable",
                      event.target.checked
                    )
                  }
                />{" "}
                Available
              </label>

              <input
                aria-label={`${DAYS[day.dayOfWeek]} start time`}
                type="time"
                style={styles.input}
                disabled={!day.isAvailable}
                value={day.startTime}
                onChange={(event) =>
                  updateDay(day.dayOfWeek, "startTime", event.target.value)
                }
              />

              <input
                aria-label={`${DAYS[day.dayOfWeek]} end time`}
                type="time"
                style={styles.input}
                disabled={!day.isAvailable}
                value={day.endTime}
                onChange={(event) =>
                  updateDay(day.dayOfWeek, "endTime", event.target.value)
                }
              />
            </div>
          ))}
          <p style={{ color: "#777", fontSize: "13px" }}>
            Times use the selected practice timezone.
          </p>
        </section>

        <section style={styles.card}>
          <h2>Practice preferences</h2>

          <label style={{ display: "block", marginBottom: "20px" }}>
            Timezone
            <select
              style={{ ...styles.input, display: "block", marginTop: "8px" }}
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              <option value="Asia/Kolkata">India — Asia/Kolkata</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </label>

          <label style={{ display: "block", marginBottom: "20px" }}>
            Buffer between sessions: {bufferMinutes} minutes
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={bufferMinutes}
              onChange={(event) =>
                setBufferMinutes(Number(event.target.value))
              }
              style={{ display: "block", width: "100%", marginTop: "10px" }}
            />
          </label>

          <p>Allowed session durations</p>

          {[30, 45, 60, 90].map((duration) => (
            <label
              key={duration}
              style={{ marginRight: "18px", display: "inline-block" }}
            >
              <input
                type="checkbox"
                checked={sessionDurations.includes(duration)}
                onChange={() => toggleDuration(duration)}
              />{" "}
              {duration} minutes
            </label>
          ))}
        </section>

        <section style={styles.card}>
          <h2>Blocked dates</h2>
          <p style={{ color: "#777" }}>
            Block a full date when you are not available.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <input
              aria-label="Date to block"
              type="date"
              style={styles.input}
              value={blockedDate}
              onChange={(event) => setBlockedDate(event.target.value)}
            />

            <input
              aria-label="Reason for blocking date"
              type="text"
              style={styles.input}
              placeholder="Reason (optional)"
              value={blockedReason}
              onChange={(event) => setBlockedReason(event.target.value)}
            />

            <button
              type="button"
              style={styles.button}
              onClick={addBlockedDate}
            >
              Add blocked date
            </button>
          </div>

          {overrides.length === 0 ? (
            <p style={{ color: "#777" }}>No blocked dates added.</p>
          ) : (
            <ul>
              {overrides.map((item) => (
                <li key={item.date} style={{ marginTop: "12px" }}>
                  {item.date} —{" "}
                  {item.isBlocked
                    ? `Blocked${item.reason ? `: ${item.reason}` : ""}`
                    : `${item.startTime}–${item.endTime}`}
                  <button
                    type="button"
                    style={{
                      ...styles.button,
                      marginLeft: "12px",
                      padding: "6px 10px",
                      background: "#b94c5a",
                    }}
                    onClick={() =>
                      setOverrides((previous) =>
                        previous.filter((entry) => entry.date !== item.date)
                      )
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button type="submit" style={styles.button} disabled={saving}>
          {saving ? "Saving..." : "Save availability"}
        </button>
      </form>
    </main>
  );
}
