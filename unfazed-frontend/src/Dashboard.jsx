import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  CreditCard,
  Settings,
  Bell,
  MessageCircle,
  Check,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Crown,
  Heart,
  LogOut,
  UserRound,
  Globe,
  Copy,
  ExternalLink,
} from "lucide-react";

import api from "./api";
import "./App.css";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DURATIONS = [30, 45, 60, 90];

const getLoggedInTherapist = () => {
  try {
    const raw = localStorage.getItem("unfazed_therapist");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const menuItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Clients", icon: Users },
  { label: "Appointments", icon: CalendarDays },
  { label: "Availability", icon: Clock },
  { label: "Session Notes", icon: FileText },
  { label: "Payments", icon: CreditCard },
  { label: "Analytics", icon: BarChart3 },
  { label: "Subscription", icon: Crown },
  { label: "Therapist Profile", icon: UserRound },
  { label: "Public Booking", icon: Globe },
  { label: "Messages", icon: MessageCircle },
  { label: "Notifications", icon: Bell },
  { label: "Settings", icon: Settings },
];

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatAppointmentDate = (date) => {
  if (!date) return "";

  const value = String(date).slice(0, 10);
  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) return value;

  return parsedDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const sortAppointments = (items) =>
  [...items].sort((a, b) => {
    const first = new Date(
      `${String(a.date || "9999-12-31").slice(0, 10)}T${a.time || "00:00"}`
    ).getTime();

    const second = new Date(
      `${String(b.date || "9999-12-31").slice(0, 10)}T${b.time || "00:00"}`
    ).getTime();

    return first - second;
  });

const createDefaultAvailability = () => ({
  timezone: "Asia/Kolkata",
  weeklySchedule: DAYS.map((_, dayOfWeek) => ({
    dayOfWeek,
    isAvailable: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: "09:00",
    endTime: "17:00",
  })),
  overrides: [],
  bufferMinutes: 10,
  sessionDurations: [30, 45, 60],
});

function Dashboard() {
  const [activePage, setActivePage] = useState("Overview");

  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messageForm, setMessageForm] = useState({ clientId: "", text: "" });
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageSaving, setMessageSaving] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);

  const emptyClientForm = {
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    address: "",
    presentingConcern: "",
    history: "",
    tags: "",
  };

  const [clientForm, setClientForm] = useState(emptyClientForm);

  const [appointmentForm, setAppointmentForm] = useState({
    clientName: "",
    appointmentDate: "",
    appointmentTime: "",
    durationMinutes: 60,
  });

  const [loading, setLoading] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);

  const [availability, setAvailability] = useState(
    createDefaultAvailability
  );

  // Session Notes state
  const [sessionNote, setSessionNote] = useState({
    clientName: "",
    note: "",
  });

  const [savedNotes, setSavedNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  // Payments state
  const [payments, setPayments] = useState([]);
  const [subscriptionPlan, setSubscriptionPlan] = useState(() => localStorage.getItem("unfazed_subscription_plan") || "Free");

  // Therapist public profile is stored locally for this frontend demo.
  const [therapistProfile, setTherapistProfile] = useState(() => {
    const therapist = getLoggedInTherapist();
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem("unfazed_therapist_profile") || "{}");
    } catch {
      saved = {};
    }
    return {
      displayName: saved.displayName || therapist.name || therapist.fullName || "",
      slug: saved.slug || therapist.slug || "",
      specialty: saved.specialty || "",
      qualification: saved.qualification || "",
      experience: saved.experience || "",
      bio: saved.bio || "",
      sessionFee: saved.sessionFee || "",
      location: saved.location || "",
      contactEmail: saved.contactEmail || therapist.email || "",
      acceptingBookings: saved.acceptingBookings ?? true,
    };
  });
  const [profileSaved, setProfileSaved] = useState(false);
  const [bookingNotice, setBookingNotice] = useState("");
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    clientName: "",
    amount: "",
    paymentDate: getLocalDateString(),
    status: "Pending",
    paymentMethod: "Other",
    description: "",
  });

  // Messages are stored for the logged-in therapist.
  const getTherapistId = () => {
    const therapist = getLoggedInTherapist();
    return therapist._id || therapist.id || therapist.therapistId || therapist.userId || "";
  };

  const getTherapistName = () => {
    const therapist = getLoggedInTherapist();
    return therapist.name || therapist.fullName || therapist.email || "Therapist";
  };

  const loadMessages = async () => {
    const therapistId = getTherapistId();
    if (!therapistId) {
      setMessages([]);
      console.error("Therapist ID was not found in unfazed_therapist localStorage.");
      return;
    }
    try {
      setMessagesLoading(true);
      const response = await api.get("/messages", { params: { therapistId } });
      const data = Array.isArray(response.data) ? response.data : response.data.data;
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load messages error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Could not load messages.");
    } finally {
      setMessagesLoading(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const therapistId = getTherapistId();
    const selectedClient = clients.find((client) => client._id === messageForm.clientId);

    if (!therapistId) {
      alert("Could not identify the logged-in therapist. Please log in again.");
      return;
    }
    if (!selectedClient || !messageForm.text.trim()) {
      alert("Please select a client and enter a message.");
      return;
    }

    try {
      setMessageSaving(true);
      const response = await api.post("/messages", {
        therapistId,
        clientId: selectedClient._id,
        sender: "therapist",
        senderName: getTherapistName(),
        text: messageForm.text.trim(),
      });
      const createdMessage = response.data.data;
      setMessages((previous) => [createdMessage, ...previous]);
      setMessageForm({ clientId: "", text: "" });
      await loadNotifications();
      alert("Message saved. The client portal must be connected separately for the client to view and reply.");
    } catch (error) {
      console.error("Send message error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Could not send message.");
    } finally {
      setMessageSaving(false);
    }
  };

  const loadNotifications = async () => {
    const therapistId = getTherapistId();
    if (!therapistId) {
      setNotifications([]);
      console.error("Therapist ID was not found in unfazed_therapist localStorage.");
      return;
    }
    try {
      setNotificationsLoading(true);
      const response = await api.get("/notifications", { params: { therapistId } });
      const data = Array.isArray(response.data) ? response.data : response.data.data;
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load notifications error:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Could not load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationRead = async (id) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      setNotifications((previous) => previous.map((item) =>
        item._id === id ? { ...item, ...(response.data.data || {}), read: true } : item
      ));
    } catch (error) {
      alert(error.response?.data?.message || "Could not update notification.");
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((item) => !item.read);
    try {
      await Promise.all(unread.map((item) => api.patch(`/notifications/${item._id}/read`)));
      setNotifications((previous) => previous.map((item) => ({ ...item, read: true })));
    } catch (error) {
      alert(error.response?.data?.message || "Could not update all notifications.");
      await loadNotifications();
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("unfazed_token");
    localStorage.removeItem("unfazed_therapist");
    window.location.reload();
  };

  // Load clients and appointments
  const loadData = async () => {
    try {
      const [clientResponse, appointmentResponse] = await Promise.all([
        api.get("/clients"),
        api.get("/appointments"),
      ]);

      const clientData = Array.isArray(clientResponse.data.data)
        ? clientResponse.data.data
        : [];

      const appointmentData = Array.isArray(
        appointmentResponse.data.data
      )
        ? appointmentResponse.data.data
        : [];

      setClients(clientData);

      const formattedAppointments = appointmentData.map((item) => ({
        id: item._id,
        name: item.clientName,
        type: item.appointmentType || "New Consultation",
        date: item.appointmentDate || "",
        time: item.appointmentTime || "",
        durationMinutes: item.durationMinutes || 60,
        status: item.status || "Pending",
        color:
          item.status === "Confirmed"
            ? "blue"
            : item.status === "Completed"
              ? "green"
              : "peach",
      }));

      setAppointments(sortAppointments(formattedAppointments));
    } catch (error) {
      console.error(
        "Failed to load dashboard data:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        handleLogout();
      }
    }
  };

  // Load saved availability
  const loadAvailability = async () => {
    try {
      setAvailabilityLoading(true);

      const response = await api.get("/availability");
      const data = response.data.data;

      if (data) {
        const savedSchedule = Array.isArray(data.weeklySchedule)
          ? data.weeklySchedule
          : [];

        const weeklySchedule = DAYS.map((_, dayOfWeek) => {
          const savedDay = savedSchedule.find(
            (day) => day.dayOfWeek === dayOfWeek
          );

          return (
            savedDay || {
              dayOfWeek,
              isAvailable: false,
              startTime: "09:00",
              endTime: "17:00",
            }
          );
        });

        setAvailability({
          timezone: data.timezone || "Asia/Kolkata",
          weeklySchedule,
          overrides: Array.isArray(data.overrides)
            ? data.overrides.map((item) => ({
                date: item.date,
                isBlocked: item.isBlocked,
                startTime: item.startTime || "",
                endTime: item.endTime || "",
                reason: item.reason || "",
              }))
            : [],
          bufferMinutes: data.bufferMinutes ?? 10,
          sessionDurations:
            Array.isArray(data.sessionDurations) &&
            data.sessionDurations.length > 0
              ? data.sessionDurations
              : [30, 45, 60],
        });
      } else {
        setAvailability(createDefaultAvailability());
      }
    } catch (error) {
      console.error(
        "Load availability error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        handleLogout();
      }
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Load session notes from MongoDB
  const loadSessionNotes = async () => {
    try {
      setNotesLoading(true);

      const response = await api.get("/session-notes");

      setSavedNotes(
        Array.isArray(response.data.data) ? response.data.data : []
      );
    } catch (error) {
      console.error(
        "Load session notes error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        handleLogout();
        return;
      }

      alert(
        error.response?.data?.message ||
          "Could not load session notes. Please check the backend."
      );
    } finally {
      setNotesLoading(false);
    }
  };

  // Load payment history from MongoDB
  const loadPayments = async () => {
    try {
      setPaymentsLoading(true);
      const response = await api.get("/payments");
      setPayments(
        Array.isArray(response.data.data) ? response.data.data : []
      );
    } catch (error) {
      console.error(
        "Load payments error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        handleLogout();
        return;
      }

      alert(
        error.response?.data?.message ||
          "Could not load payments. Please check the backend."
      );
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Load dashboard data when the page opens
  useEffect(() => {
    loadData();
    loadAvailability();
    loadSessionNotes();
    loadPayments();
    loadMessages();
    loadNotifications();
  }, []);

  // Save session note to MongoDB
  const saveSessionNote = async (event) => {
    event.preventDefault();

    if (!sessionNote.clientName.trim() || !sessionNote.note.trim()) {
      alert("Please enter client name and session note.");
      return;
    }

    try {
      setNoteSaving(true);

      const response = await api.post("/session-notes", {
        clientName: sessionNote.clientName.trim(),
        note: sessionNote.note.trim(),
      });

      const newNote = response.data.data;

      setSavedNotes((previous) => [newNote, ...previous]);
      setSessionNote({
        clientName: "",
        note: "",
      });

      alert("Session note saved successfully!");
    } catch (error) {
      console.error(
        "Save session note error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        handleLogout();
        return;
      }

      alert(
        error.response?.data?.message ||
          "Could not save session note. Please check the backend."
      );
    } finally {
      setNoteSaving(false);
    }
  };

  // Delete session note from MongoDB
  const deleteSessionNote = async (noteId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this session note?"
      )
    ) {
      return;
    }

    try {
      setDeletingNoteId(noteId);

      await api.delete(`/session-notes/${noteId}`);

      setSavedNotes((previous) =>
        previous.filter((note) => note._id !== noteId)
      );

      alert("Session note deleted successfully!");
    } catch (error) {
      console.error(
        "Delete session note error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        handleLogout();
        return;
      }

      alert(
        error.response?.data?.message ||
          "Could not delete session note. Please try again."
      );
    } finally {
      setDeletingNoteId(null);
    }
  };
  // Add a payment to MongoDB
  const addPayment = async (event) => {
    event.preventDefault();

    if (
      !paymentForm.clientName.trim() ||
      !paymentForm.amount ||
      !paymentForm.paymentDate
    ) {
      alert("Please enter client name, amount, and payment date.");
      return;
    }

    const amount = Number(paymentForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter an amount greater than zero.");
      return;
    }

    try {
      setPaymentSaving(true);
      const response = await api.post("/payments", {
        clientName: paymentForm.clientName.trim(),
        amount,
        paymentDate: paymentForm.paymentDate,
        status: paymentForm.status,
        paymentMethod: paymentForm.paymentMethod,
        description: paymentForm.description.trim(),
      });

      setPayments((previous) => [
        response.data.data,
        ...previous,
      ]);
      setPaymentForm({
        clientName: "",
        amount: "",
        paymentDate: getLocalDateString(),
        status: "Pending",
        paymentMethod: "Other",
        description: "",
      });
      setShowPaymentForm(false);
      alert("Payment added successfully!");
    } catch (error) {
      console.error(
        "Add payment error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        handleLogout();
        return;
      }

      alert(
        error.response?.data?.message ||
          "Could not add payment. Please check the backend."
      );
    } finally {
      setPaymentSaving(false);
    }
  };

  // Update payment status in MongoDB (Pending <-> Paid)
  const updatePaymentStatus = async (paymentId, status) => {
    if (!['Paid', 'Pending'].includes(status)) {
      alert('Status must be Paid or Pending.');
      return;
    }

    try {
      const response = await api.patch(`/payments/${paymentId}/status`, {
        status,
      });

      const updatedPayment = response.data.data;
      setPayments((previous) =>
        previous.map((payment) =>
          payment._id === paymentId
            ? { ...payment, ...updatedPayment }
            : payment
        )
      );
    } catch (error) {
      console.error(
        "Update payment status error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        handleLogout();
        return;
      }

      alert(
        error.response?.data?.message ||
          "Could not update payment status. Please try again."
      );
    }
  };

  // Delete a payment from MongoDB
  const deletePayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to delete this payment?")) {
      return;
    }

    try {
      setDeletingPaymentId(paymentId);
      await api.delete(`/payments/${paymentId}`);
      setPayments((previous) =>
        previous.filter((payment) => payment._id !== paymentId)
      );
      alert("Payment deleted successfully!");
    } catch (error) {
      console.error(
        "Delete payment error:",
        error.response?.data || error.message
      );

      if (error.response?.status === 401) {
        alert("Your session has expired. Please log in again.");
        handleLogout();
        return;
      }

      alert(
        error.response?.data?.message ||
          "Could not delete payment. Please try again."
      );
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const totalRevenue = payments
    .filter((payment) => payment.status === "Paid")
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const currentMonthRevenue = payments
    .filter((payment) => {
      if (payment.status !== "Paid" || !payment.paymentDate) return false;
      const date = new Date(payment.paymentDate);
      const now = new Date();
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    })
    .reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const updateWeeklyDay = (dayOfWeek, field, value) => {
    setAvailability((previous) => ({
      ...previous,
      weeklySchedule: previous.weeklySchedule.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, [field]: value }
          : day
      ),
    }));
  };

  const addOverride = () => {
    setAvailability((previous) => ({
      ...previous,
      overrides: [
        ...previous.overrides,
        {
          date: "",
          isBlocked: true,
          startTime: "",
          endTime: "",
          reason: "",
        },
      ],
    }));
  };

  const updateOverride = (index, field, value) => {
    setAvailability((previous) => ({
      ...previous,
      overrides: previous.overrides.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      ),
    }));
  };
  // Save availability to the backend
  const saveAvailability = async (event) => {
    event.preventDefault();

    const schedule = availability.weeklySchedule;

    if (!Array.isArray(schedule) || schedule.length !== 7) {
      alert("Please configure all seven days.");
      return;
    }

    for (const day of schedule) {
      if (
        day.isAvailable &&
        (!day.startTime ||
          !day.endTime ||
          day.startTime >= day.endTime)
      ) {
        alert(
          `Please check the working hours for ${DAYS[day.dayOfWeek]}.`
        );
        return;
      }
    }

    if (availability.sessionDurations.length === 0) {
      alert("Please select at least one session duration.");
      return;
    }

    try {
      setAvailabilitySaving(true);

      const payload = {
        ...availability,
        bufferMinutes: Number(availability.bufferMinutes),
        sessionDurations: availability.sessionDurations.map(Number),
      };

      const response = await api.put("/availability", payload);

      if (response.data.success) {
        alert("Availability saved successfully!");
        await loadAvailability();
      } else {
        alert(
          response.data.message || "Could not save availability."
        );
      }
    } catch (error) {
      console.error(
        "Save availability error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          "Could not save availability. Please check the backend."
      );
    } finally {
      setAvailabilitySaving(false);
    }
  };
    // Add client
  const addClient = async (event) => {
    event.preventDefault();

    if (!clientForm.name.trim()) {
      alert("Please enter the client's name.");
      return;
    }

    try {
      setClientLoading(true);

      const response = await api.post("/clients", {
        name: clientForm.name.trim(),
        email: clientForm.email.trim(),
        phone: clientForm.phone.trim(),
        dateOfBirth: clientForm.dateOfBirth || "",
        address: clientForm.address.trim(),
        presentingConcern: clientForm.presentingConcern.trim(),
        history: clientForm.history.trim(),
        tags: clientForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });

      const newClient = response.data.data;

      setClients((previous) => [newClient, ...previous]);
      setClientForm({ ...emptyClientForm });
      setShowClientForm(false);

      alert("Client added successfully!");
    } catch (error) {
      console.error(
        "Add client error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          "Could not add client. Please check the backend."
      );
    } finally {
      setClientLoading(false);
    }
  };

  // Record consent after the client has actually agreed
  const giveDigitalConsent = async (client) => {
    const accepted = window.confirm(
      `Confirm that ${client.name} has given consent to the practice's data and treatment policy.`
    );

    if (!accepted) return;

    try {
      const response = await api.post(
        `/clients/${client._id}/consent`,
        {
          accepted: true,
          consentVersion: "1.0",
        }
      );

      const updatedClient = response.data.data;

      setClients((previous) =>
        previous.map((item) =>
          item._id === client._id
            ? { ...item, ...updatedClient }
            : item
        )
      );

      alert("Consent recorded successfully.");
    } catch (error) {
      console.error(
        "Record consent error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          "Could not record consent. Please check the backend consent route."
      );
    }
  };

  // Add appointment
  const addAppointment = async (event) => {
    event.preventDefault();

    const {
      clientName,
      appointmentDate,
      appointmentTime,
      durationMinutes,
    } = appointmentForm;

    if (!clientName.trim() || !appointmentDate || !appointmentTime) {
      alert("Please fill in all appointment details.");
      return;
    }

    if (appointmentDate < getLocalDateString()) {
      alert("Please select today or a future date.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/appointments", {
        clientName: clientName.trim(),
        appointmentType: "New Consultation",
        appointmentDate,
        appointmentTime,
        durationMinutes: Number(durationMinutes),
      });

      const item = response.data.data;

      const newAppointment = {
        id: item._id,
        name: item.clientName,
        type: item.appointmentType || "New Consultation",
        date: item.appointmentDate || appointmentDate,
        time: item.appointmentTime || appointmentTime,
        durationMinutes:
          item.durationMinutes || Number(durationMinutes),
        status: item.status || "Pending",
        color: "peach",
      };

      setAppointments((previous) =>
        sortAppointments([newAppointment, ...previous])
      );

      setAppointmentForm({
        clientName: "",
        appointmentDate: "",
        appointmentTime: "",
        durationMinutes: 60,
      });

      setShowAppointmentForm(false);

      alert("Appointment added successfully!");
    } catch (error) {
      console.error(
        "Add appointment error:",
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.message ||
          "Could not add appointment. Please check the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // Filter clients
  const filteredClients = clients.filter((client) =>
    [
      client.name,
      client.email,
      client.phone,
      client.address,
      client.presentingConcern,
      ...(Array.isArray(client.tags) ? client.tags : []),
    ]
      .filter(Boolean)
      .some((value) =>
        String(value)
          .toLowerCase()
          .includes(search.toLowerCase())
      )
  );

  // Filter appointments
  const filteredAppointments = sortAppointments(
    appointments.filter((appointment) =>
      String(appointment.name || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  );

  const todayDate = getLocalDateString();

  const todayAppointments = appointments.filter(
    (appointment) =>
      String(appointment.date).slice(0, 10) === todayDate &&
      appointment.status !== "Cancelled"
  );

  const upcomingAppointments = filteredAppointments.filter(
    (appointment) =>
      !appointment.date ||
      String(appointment.date).slice(0, 10) >= todayDate
  );

  // Analytics are calculated from the records already loaded from the backend.
  const paidPayments = payments.filter(
    (payment) => String(payment.status || "").toLowerCase() === "paid"
  );
  const currentMonth = todayDate.slice(0, 7);
  const monthlyRevenue = paidPayments
    .filter((payment) => String(payment.paymentDate || "").slice(0, 7) === currentMonth)
    .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const completedAppointments = appointments.filter(
    (appointment) => String(appointment.status || "").toLowerCase() === "completed"
  ).length;
  const pendingAppointments = appointments.filter(
    (appointment) => String(appointment.status || "").toLowerCase() === "pending"
  ).length;
  const cancelledAppointments = appointments.filter(
    (appointment) => String(appointment.status || "").toLowerCase() === "cancelled"
  ).length;
  const monthTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const amount = paidPayments
      .filter((payment) => String(payment.paymentDate || "").slice(0, 7) === key)
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    return {
      key,
      label: date.toLocaleDateString("en-IN", { month: "short" }),
      amount,
    };
  });
  const maxMonthlyRevenue = Math.max(1, ...monthTrend.map((item) => item.amount));
  const chooseSubscriptionPlan = (plan) => {
    setSubscriptionPlan(plan);
    localStorage.setItem("unfazed_subscription_plan", plan);
    alert(`The ${plan} plan has been selected for this demo. No payment was taken.`);
  };

  const saveTherapistProfile = (event) => {
    event.preventDefault();
    const normalized = {
      ...therapistProfile,
      displayName: therapistProfile.displayName.trim(),
      slug: therapistProfile.slug.trim().toLowerCase().replace(/\s+/g, "-"),
      contactEmail: therapistProfile.contactEmail.trim().toLowerCase(),
    };
    setTherapistProfile(normalized);
    localStorage.setItem("unfazed_therapist_profile", JSON.stringify(normalized));
    setProfileSaved(true);
    window.setTimeout(() => setProfileSaved(false), 2500);
  };

  const publicBookingUrl = `${window.location.origin}/?booking=${encodeURIComponent(therapistProfile.slug || "your-profile-slug")}`;

  const copyBookingLink = async () => {
    try {
      await navigator.clipboard.writeText(publicBookingUrl);
      setBookingNotice("Link copied. Note: the public booking page still needs its public route and backend booking endpoint connected.");
    } catch {
      setBookingNotice(`Copy this link manually: ${publicBookingUrl}`);
    }
  };

  const changePage = (page) => {
    setActivePage(page);
    setSearch("");
    setShowClientForm(false);
    setShowAppointmentForm(false);

    if (page === "Availability") {
      loadAvailability();
    }

    if (page === "Session Notes") {
      loadSessionNotes();
    }

    if (page === "Payments") {
      loadPayments();
    }
    if (page === "Messages") {
      loadMessages();
    }
    if (page === "Notifications") {
      loadNotifications();
    }
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-icon">
            <Heart size={22} />
          </span>

          <span>
            unfazed<span className="brand-dot">.</span>
            <small>THERAPIST PRACTICE</small>
          </span>
        </a>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation">
          {menuItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={`nav-item ${
                activePage === label ? "active" : ""
              }`}
              onClick={() => changePage(label)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <Heart size={18} />
            </div>

            <strong>Take a breath.</strong>
            <p>You deserve the same care you give others.</p>
          </div>

          <div className="profile-mini">
            <div className="avatar therapist-avatar">DR</div>

            <div>
              <strong>Therapist</strong>
              <small>Practice Manager</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> {activePage}
          </div>

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
              title="Notifications"
              onClick={() => changePage("Notifications")}
            >
              <Bell size={19} />
              {notifications.some((item) => !item.read) && <span className="notification-dot" aria-label="Unread notifications" />}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <section className="page-content">
          {/* Page heading */}
          <div className="welcome-row">
            <div>
              <div className="eyebrow">YOUR WELLNESS MATTERS</div>

              <h1>
                {activePage === "Overview"
                  ? "Good morning"
                  : activePage}
                <span className="wave"> ✨</span>
              </h1>

              <p className="subtitle">
                Here's an overview of your practice today.
              </p>
            </div>

            {(activePage === "Clients" ||
              activePage === "Appointments" ||
              activePage === "Overview") && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  if (activePage === "Clients") {
                    setShowClientForm((previous) => !previous);
                    setShowAppointmentForm(false);
                  } else {
                    setShowAppointmentForm((previous) => !previous);
                    setShowClientForm(false);
                  }
                }}
              >
                <Plus size={18} />
                {activePage === "Clients"
                  ? "Add client"
                  : "New appointment"}
              </button>
            )}
          </div>

          {/* Appointment form */}
          {showAppointmentForm &&
            activePage !== "Clients" && (
              <form
                className="appointment-form"
                onSubmit={addAppointment}
              >
                <h3>New appointment</h3>

                <label>
                  Client name
                  <input
                    value={appointmentForm.clientName}
                    onChange={(event) =>
                      setAppointmentForm((previous) => ({
                        ...previous,
                        clientName: event.target.value,
                      }))
                    }
                    placeholder="Enter client name"
                    required
                  />
                </label>

                <label>
                  Appointment date
                  <input
                    type="date"
                    min={todayDate}
                    value={appointmentForm.appointmentDate}
                    onChange={(event) =>
                      setAppointmentForm((previous) => ({
                        ...previous,
                        appointmentDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  Appointment time
                  <input
                    type="time"
                    value={appointmentForm.appointmentTime}
                    onChange={(event) =>
                      setAppointmentForm((previous) => ({
                        ...previous,
                        appointmentTime: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  Session duration
                  <select
                    value={appointmentForm.durationMinutes}
                    onChange={(event) =>
                      setAppointmentForm((previous) => ({
                        ...previous,
                        durationMinutes: Number(event.target.value),
                      }))
                    }
                    required
                  >
                    {DURATIONS.map((duration) => (
                      <option key={duration} value={duration}>
                        {duration} minutes
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setShowAppointmentForm(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save appointment"}
                  </button>
                </div>
              </form>
            )}

          {/* Clients page */}
          {activePage === "Clients" && (
            <section className="panel clients-panel">
              <div className="panel-heading">
                <div>
                  <h2>Clients</h2>
                  <p>Manage your therapy practice clients</p>
                </div>
              </div>

              {/* Add client form */}
              {showClientForm && (
                <form
                  className="appointment-form"
                  onSubmit={addClient}
                >
                  <h3>Add a new client</h3>

                  <label>
                    Full name
                    <input
                      value={clientForm.name}
                      onChange={(event) =>
                        setClientForm((previous) => ({
                          ...previous,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Enter client's full name"
                      required
                    />
                  </label>

                  <label>
                    Email address
                    <input
                      type="email"
                      value={clientForm.email}
                      onChange={(event) =>
                        setClientForm((previous) => ({
                          ...previous,
                          email: event.target.value,
                        }))
                      }
                      placeholder="client@example.com"
                    />
                  </label>

                  <label>
                    Phone number
                    <input
                      type="tel"
                      value={clientForm.phone}
                      onChange={(event) =>
                        setClientForm((previous) => ({
                          ...previous,
                          phone: event.target.value,
                        }))
                      }
                      placeholder="Enter phone number"
                    />
                  </label>

                  <label>
                    Date of birth
                    <input
                      type="date"
                      value={clientForm.dateOfBirth}
                      onChange={(event) =>
                        setClientForm((previous) => ({
                          ...previous,
                          dateOfBirth: event.target.value,
                        }))
                      }
                    />
                  </label>

                  <label>
                    Address
                    <textarea
                      rows="2"
                      value={clientForm.address}
                      onChange={(event) =>
                        setClientForm((previous) => ({
                          ...previous,
                          address: event.target.value,
                        }))
                      }
                      placeholder="Enter client's address"
                    />
                  </label>

                  <label>
                    Presenting concern
                    <textarea
                      rows="3"
                      value={clientForm.presentingConcern}
                      onChange={(event) =>
                        setClientForm((previous) => ({
                          ...previous,
                          presentingConcern: event.target.value,
                        }))
                      }
                      placeholder="Reason for seeking therapy"
                    />
                  </label>

                  <label>
                    Relevant history
                    <textarea
                      rows="3"
                      value={clientForm.history}
                      onChange={(event) =>
                        setClientForm((previous) => ({
                          ...previous,
                          history: event.target.value,
                        }))
                      }
                      placeholder="Relevant background information"
                    />
                  </label>

                  <label>
                    Tags
                    <input
                      value={clientForm.tags}
                      onChange={(event) =>
                        setClientForm((previous) => ({
                          ...previous,
                          tags: event.target.value,
                        }))
                      }
                      placeholder="Example: New client, Follow-up"
                    />
                    <small>Separate tags with commas.</small>
                  </label>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setShowClientForm(false);
                        setClientForm({ ...emptyClientForm });
                      }}
                      disabled={clientLoading}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={clientLoading}
                    >
                      {clientLoading ? "Saving..." : "Save client"}
                    </button>
                  </div>
                </form>
              )}

              {/* Client search */}
              <div className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search clients by name, email, phone or concern..."
                />
              </div>

              {/* Client list */}
              <div className="appointment-list">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <div
                      className="appointment-row"
                      key={client._id}
                    >
                      <div className="avatar purple">
                        {(client.name || "C")
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="appointment-info">
                        <strong>{client.name}</strong>
                        <span>{client.email || "No email added"}</span>
                        <span>{client.phone || "No phone added"}</span>

                        {client.dateOfBirth && (
                          <span>
                            Date of birth:{" "}
                            {formatAppointmentDate(client.dateOfBirth)}
                          </span>
                        )}

                        {client.address && (
                          <span>Address: {client.address}</span>
                        )}

                        {client.presentingConcern && (
                          <span>
                            Presenting concern: {client.presentingConcern}
                          </span>
                        )}

                        {client.history && (
                          <span>Relevant history: {client.history}</span>
                        )}

                        {Array.isArray(client.tags) &&
                          client.tags.length > 0 && (
                            <span>Tags: {client.tags.join(", ")}</span>
                          )}
                      </div>

                      <div className="appointment-time">
                        <small className="status-confirmed">
                          {client.status || "Active"}
                        </small>

                        <small>
                          Consent:{" "}
                          {client.consent?.accepted
                            ? "Recorded"
                            : "Pending"}
                        </small>

                        {!client.consent?.accepted && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => giveDigitalConsent(client)}
                          >
                            Record consent
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">
                    {search
                      ? "No clients match your search."
                      : "No clients yet. Click Add client to begin."}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Appointments page */}
          {activePage === "Appointments" && (
            <section className="panel appointments-panel">
              <div className="panel-heading">
                <div>
                  <h2>Appointments</h2>
                  <p>Manage your therapy practice appointments</p>
                </div>
              </div>

              <div className="search-box">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search appointments by client name..."
                />
              </div>

              <div className="appointment-list">
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((appointment, index) => (
                    <div
                      className="appointment-row"
                      key={appointment.id || index}
                    >
                      <div
                        className={`avatar ${appointment.color || "purple"}`}
                      >
                        {(appointment.name || "C")
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="appointment-info">
                        <strong>{appointment.name}</strong>
                        <span>{appointment.type}</span>
                        <span>
                          Date: {formatAppointmentDate(appointment.date)}
                        </span>
                        <span>
                          Duration: {appointment.durationMinutes || 60} minutes
                        </span>
                      </div>

                      <div className="appointment-time">
                        <span>
                          <Clock size={14} /> {appointment.time}
                        </span>

                        <small
                          className={
                            appointment.status === "Confirmed"
                              ? "status-confirmed"
                              : "status-pending"
                          }
                        >
                          {appointment.status}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-state">
                    No appointments found. Add a new appointment to begin.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Overview page */}
          {activePage === "Overview" && (
            <>
              <div className="stats-grid">
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Total clients</span>
                    <span className="stat-icon lavender">
                      <Users size={19} />
                    </span>
                  </div>

                  <strong className="stat-value">{clients.length}</strong>

                  <div className="stat-foot">
                    <TrendingUp size={15} /> Practice overview
                  </div>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>Today's sessions</span>
                    <span className="stat-icon mint">
                      <CalendarDays size={19} />
                    </span>
                  </div>

                  <strong className="stat-value">
                    {todayAppointments.length}
                  </strong>

                  <div className="stat-foot">
                    Scheduled appointments today
                  </div>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>Completed sessions</span>
                    <span className="stat-icon peach-bg">
                      <CheckCircle2 size={19} />
                    </span>
                  </div>

                  <strong className="stat-value">
                    {
                      appointments.filter(
                        (item) => item.status === "Completed"
                      ).length
                    }
                  </strong>

                  <div className="stat-foot">
                    Completed appointments
                  </div>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>Monthly revenue</span>
                    <span className="stat-icon blue-bg">
                      <CreditCard size={19} />
                    </span>
                  </div>

                  <strong className="stat-value">
                    {formatCurrency(currentMonthRevenue)}
                  </strong>

                  <div className="stat-foot">
                    Revenue from paid payments this month
                  </div>
                </article>
              </div>

              <div className="dashboard-grid">
                <section className="panel appointments-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Upcoming appointments</h2>
                      <p>Your schedule at a glance</p>
                    </div>

                    <button
                      type="button"
                      className="text-button"
                      onClick={() => changePage("Appointments")}
                    >
                      View all
                    </button>
                  </div>

                  <div className="search-box">
                    <Search size={17} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search clients..."
                    />
                  </div>

                  <div className="appointment-list">
                    {upcomingAppointments.length > 0 ? (
                      upcomingAppointments.map((appointment, index) => (
                        <div
                          className="appointment-row"
                          key={appointment.id || index}
                        >
                          <div
                            className={`avatar ${appointment.color || "purple"}`}
                          >
                            {(appointment.name || "C")
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>

                          <div className="appointment-info">
                            <strong>{appointment.name}</strong>
                            <span>{appointment.type}</span>
                            <span>
                              Date: {formatAppointmentDate(appointment.date)}
                            </span>
                          </div>

                          <div className="appointment-time">
                            <span>
                              <Clock size={14} /> {appointment.time}
                            </span>

                            <small className="status-pending">
                              {appointment.status}
                            </small>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="empty-state">
                        No upcoming appointments found.
                      </p>
                    )}
                  </div>
                </section>

                <section className="panel right-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Practice at a glance</h2>
                      <p>A little progress goes a long way</p>
                    </div>
                  </div>

                  <div className="progress-card">
                    <div className="progress-header">
                      <span>Weekly session goal</span>
                      <strong>{appointments.length} appointments</strong>
                    </div>

                    <p>Your appointment schedule is shown here.</p>
                  </div>

                  <div className="reminder-card">
                    <div className="reminder-icon">
                      <Clock size={20} />
                    </div>

                    <div>
                      <strong>Gentle reminder</strong>
                      <p>
                        Remember to leave a little breathing room between
                        sessions.
                      </p>
                    </div>
                  </div>

                  <div className="quick-links">
                    <h3>Quick actions</h3>

                    <button
                      type="button"
                      onClick={() => changePage("Clients")}
                    >
                      <Users size={17} /> Manage clients
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        changePage("Appointments");
                        setShowAppointmentForm(true);
                      }}
                    >
                      <Plus size={17} /> Schedule a session
                    </button>

                    <button
                      type="button"
                      onClick={() => changePage("Session Notes")}
                    >
                      <FileText size={17} /> Write session notes
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}

          {/* Availability page */}
          {activePage === "Availability" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Weekly availability</h2>
                  <p>
                    Set your working hours before accepting appointments.
                  </p>
                </div>
              </div>

              {availabilityLoading ? (
                <p className="empty-state">Loading availability...</p>
              ) : (
                <form
                  className="appointment-form"
                  onSubmit={saveAvailability}
                >
                  <h3>Working days and hours</h3>

                  {availability.weeklySchedule.map((day) => (
                    <div
                      key={day.dayOfWeek}
                      className="availability-day"
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(100px, 1fr) 1fr 1fr 1fr",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "14px",
                      }}
                    >
                      <strong>{DAYS[day.dayOfWeek]}</strong>

                      <label>
                        <input
                          type="checkbox"
                          checked={day.isAvailable}
                          onChange={(event) =>
                            updateWeeklyDay(
                              day.dayOfWeek,
                              "isAvailable",
                              event.target.checked
                            )
                          }
                        />
                        Available
                      </label>

                      <label>
                        Start
                        <input
                          type="time"
                          value={day.startTime}
                          disabled={!day.isAvailable}
                          onChange={(event) =>
                            updateWeeklyDay(
                              day.dayOfWeek,
                              "startTime",
                              event.target.value
                            )
                          }
                          required={day.isAvailable}
                        />
                      </label>

                      <label>
                        End
                        <input
                          type="time"
                          value={day.endTime}
                          disabled={!day.isAvailable}
                          onChange={(event) =>
                            updateWeeklyDay(
                              day.dayOfWeek,
                              "endTime",
                              event.target.value
                            )
                          }
                          required={day.isAvailable}
                        />
                      </label>
                    </div>
                  ))}

                  <hr />

                  <h3>Session settings</h3>

                  <label>
                    Buffer between appointments (minutes)
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={availability.bufferMinutes}
                      onChange={(event) =>
                        setAvailability((previous) => ({
                          ...previous,
                          bufferMinutes: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <div>
                    <strong>Allowed session durations</strong>

                    {DURATIONS.map((duration) => (
                      <label
                        key={duration}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          margin: "12px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={availability.sessionDurations.includes(
                            duration
                          )}
                          onChange={(event) => {
                            setAvailability((previous) => ({
                              ...previous,
                              sessionDurations: event.target.checked
                                ? [
                                    ...previous.sessionDurations,
                                    duration,
                                  ].sort((a, b) => a - b)
                                : previous.sessionDurations.filter(
                                    (item) => item !== duration
                                  ),
                            }));
                          }}
                        />
                        {duration} minutes
                      </label>
                    ))}
                  </div>

                  <hr />

                  <div className="panel-heading">
                    <div>
                      <h3>Special dates</h3>
                      <p>
                        Block a date or set different hours for a particular
                        date.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={addOverride}
                    >
                      <Plus size={16} /> Add date
                    </button>
                  </div>

                  {availability.overrides.map((item, index) => (
                    <div
                      key={`${item.date}-${index}`}
                      className="appointment-form"
                      style={{ marginBottom: "12px" }}
                    >
                      <label>
                        Date
                        <input
                          type="date"
                          value={item.date}
                          onChange={(event) =>
                            updateOverride(
                              index,
                              "date",
                              event.target.value
                            )
                          }
                          required
                        />
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={item.isBlocked}
                          onChange={(event) =>
                            updateOverride(
                              index,
                              "isBlocked",
                              event.target.checked
                            )
                          }
                        />
                        Block this date
                      </label>

                      {!item.isBlocked && (
                        <>
                          <label>
                            Start time
                            <input
                              type="time"
                              value={item.startTime}
                              onChange={(event) =>
                                updateOverride(
                                  index,
                                  "startTime",
                                  event.target.value
                                )
                              }
                              required
                            />
                          </label>

                          <label>
                            End time
                            <input
                              type="time"
                              value={item.endTime}
                              onChange={(event) =>
                                updateOverride(
                                  index,
                                  "endTime",
                                  event.target.value
                                )
                              }
                              required
                            />
                          </label>
                        </>
                      )}

                      <label>
                        Reason (optional)
                        <input
                          value={item.reason}
                          onChange={(event) =>
                            updateOverride(
                              index,
                              "reason",
                              event.target.value
                            )
                          }
                          placeholder="Holiday, leave, special hours..."
                        />
                      </label>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          setAvailability((previous) => ({
                            ...previous,
                            overrides: previous.overrides.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                          }))
                        }
                      >
                        Remove date
                      </button>
                    </div>
                  ))}

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={availabilitySaving}
                    >
                      {availabilitySaving
                        ? "Saving..."
                        : "Save availability"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          )}

          {/* Session Notes page */}
          {activePage === "Session Notes" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Session Notes</h2>
                  <p>Record notes for your therapy sessions.</p>
                </div>
              </div>

              <form
                className="appointment-form"
                onSubmit={saveSessionNote}
              >
                <label>
                  Client name
                  <input
                    value={sessionNote.clientName}
                    onChange={(event) =>
                      setSessionNote((previous) => ({
                        ...previous,
                        clientName: event.target.value,
                      }))
                    }
                    placeholder="Enter client name"
                    required
                  />
                </label>

                <label>
                  Session note
                  <textarea
                    rows="5"
                    value={sessionNote.note}
                    onChange={(event) =>
                      setSessionNote((previous) => ({
                        ...previous,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Write session notes..."
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={noteSaving}
                >
                  {noteSaving ? "Saving..." : "Save note"}
                </button>
              </form>

              <div className="appointment-list">
                {notesLoading ? (
                  <p className="empty-state">
                    Loading session notes...
                  </p>
                ) : savedNotes.length > 0 ? (
                  savedNotes.map((note) => (
                    <article
                      className="appointment-row"
                      key={note._id}
                    >
                      <div className="appointment-info">
                        <strong>{note.clientName}</strong>

                        <span>
                          {note.sessionDate
                            ? new Date(
                                note.sessionDate
                              ).toLocaleDateString("en-GB")
                            : note.createdAt
                              ? new Date(
                                  note.createdAt
                                ).toLocaleDateString("en-GB")
                              : "Date unavailable"}
                        </span>

                        <p>{note.note}</p>
                      </div>

                      <button
                        type="button"
                        className="secondary-button"
                        disabled={deletingNoteId === note._id}
                        onClick={() => deleteSessionNote(note._id)}
                      >
                        {deletingNoteId === note._id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">
                    No session notes yet. Add your first session note.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Payments page */}
          {activePage === "Payments" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Payments</h2>
                  <p>Record payments and track your practice revenue.</p>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setShowPaymentForm((previous) => !previous)}
                >
                  <Plus size={18} />
                  {showPaymentForm ? "Cancel" : "Add payment"}
                </button>
              </div>

              {showPaymentForm && (
                <form className="appointment-form" onSubmit={addPayment}>
                  <h3>Add a payment</h3>

                  <label>
                    Client name
                    <input
                      value={paymentForm.clientName}
                      onChange={(event) =>
                        setPaymentForm((previous) => ({
                          ...previous,
                          clientName: event.target.value,
                        }))
                      }
                      placeholder="Enter client name"
                      required
                    />
                  </label>

                  <label>
                    Amount (₹)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm((previous) => ({
                          ...previous,
                          amount: event.target.value,
                        }))
                      }
                      placeholder="Enter amount"
                      required
                    />
                  </label>

                  <label>
                    Payment date
                    <input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(event) =>
                        setPaymentForm((previous) => ({
                          ...previous,
                          paymentDate: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={paymentForm.status}
                      onChange={(event) =>
                        setPaymentForm((previous) => ({
                          ...previous,
                          status: event.target.value,
                        }))
                      }
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </label>

                  <label>
                    Payment method
                    <select
                      value={paymentForm.paymentMethod}
                      onChange={(event) =>
                        setPaymentForm((previous) => ({
                          ...previous,
                          paymentMethod: event.target.value,
                        }))
                      }
                    >
                      <option value="Other">Other</option>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </label>

                  <label>
                    Description (optional)
                    <input
                      value={paymentForm.description}
                      onChange={(event) =>
                        setPaymentForm((previous) => ({
                          ...previous,
                          description: event.target.value,
                        }))
                      }
                      placeholder="For example, therapy session fee"
                    />
                  </label>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setShowPaymentForm(false)}
                      disabled={paymentSaving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={paymentSaving}
                    >
                      {paymentSaving ? "Saving..." : "Save payment"}
                    </button>
                  </div>
                </form>
              )}

              <div className="stats-grid">
                <article className="stat-card">
                  <div className="stat-top">
                    <span>Total revenue</span>
                    <span className="stat-icon mint">
                      <CreditCard size={19} />
                    </span>
                  </div>
                  <strong className="stat-value">
                    {formatCurrency(totalRevenue)}
                  </strong>
                  <div className="stat-foot">
                    Total of payments marked Paid
                  </div>
                </article>

                <article className="stat-card">
                  <div className="stat-top">
                    <span>Payment records</span>
                    <span className="stat-icon lavender">
                      <FileText size={19} />
                    </span>
                  </div>
                  <strong className="stat-value">{payments.length}</strong>
                  <div className="stat-foot">
                    {payments.filter((payment) => payment.status === "Pending").length} pending
                  </div>
                </article>
              </div>

              <div className="panel-heading" style={{ marginTop: "28px" }}>
                <div>
                  <h2>Payment history</h2>
                  <p>All payments saved to your account.</p>
                </div>
              </div>

              <div className="appointment-list">
                {paymentsLoading ? (
                  <p className="empty-state">Loading payment history...</p>
                ) : payments.length > 0 ? (
                  payments.map((payment) => (
                    <article className="appointment-row" key={payment._id}>
                      <div className="avatar purple">
                        {(payment.clientName || "C")
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="appointment-info">
                        <strong>{payment.clientName}</strong>
                        <span>{formatCurrency(payment.amount)}</span>
                        <span>
                          Date: {formatAppointmentDate(payment.paymentDate)}
                        </span>
                        <span>Method: {payment.paymentMethod || "Other"}</span>
                        {payment.description && (
                          <span>{payment.description}</span>
                        )}
                      </div>

                      <div className="appointment-time">
                        <select
                          className="secondary-button"
                          value={payment.status || "Pending"}
                          onChange={(event) =>
                            updatePaymentStatus(payment._id, event.target.value)
                          }
                          aria-label={`Payment status for ${payment.clientName}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                        </select>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={deletingPaymentId === payment._id}
                          onClick={() => deletePayment(payment._id)}
                        >
                          {deletingPaymentId === payment._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="empty-state">
                    No payments yet. Click Add payment to record your first payment.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Messages page */}
          {activePage === "Messages" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Messages</h2>
                  <p>View messages and send a message to a client.</p>
                </div>
              </div>
              <form className="appointment-form" onSubmit={sendMessage}>
                <h3>Write a message</h3>
                <label>
                  Client
                  <select
                    value={messageForm.clientId}
                    onChange={(event) => setMessageForm((previous) => ({ ...previous, clientId: event.target.value }))}
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>{client.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Message
                  <textarea
                    rows="4"
                    maxLength={5000}
                    value={messageForm.text}
                    onChange={(event) => setMessageForm((previous) => ({ ...previous, text: event.target.value }))}
                    placeholder="Write your message..."
                    required
                  />
                </label>
                <div className="form-actions">
                  <button className="primary-button" type="submit" disabled={messageSaving}>
                    {messageSaving ? "Sending..." : "Send message"}
                  </button>
                </div>
              </form>
              <div className="panel-heading" style={{ marginTop: 26 }}>
                <div><h2>Message history</h2><p>Messages saved for your practice.</p></div>
                <button type="button" className="secondary-button" onClick={loadMessages}>Refresh</button>
              </div>
              {messagesLoading ? <p className="empty-state">Loading messages...</p> : messages.length ? (
                <div className="appointment-list">
                  {messages.map((message) => {
                    const client = clients.find((item) => item._id === message.clientId);
                    return (
                      <article className="appointment-row" key={message._id}>
                        <div className="avatar lavender"><MessageCircle size={18} /></div>
                        <div className="appointment-info">
                          <strong>{client?.name || message.senderName || "Message"}</strong>
                          <span>{message.sender === "client" ? "From client" : "From therapist"}</span>
                          <span>{message.text}</span>
                          <small>{message.createdAt ? new Date(message.createdAt).toLocaleString() : "Just now"}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : <p className="empty-state">No messages yet.</p>}
              <p className="empty-state" style={{ marginTop: 16 }}>
                Note: this is the therapist dashboard. A client-facing page and client login are needed before clients can send messages from their own account.
              </p>
            </section>
          )}

          {/* Notifications page */}
          {activePage === "Notifications" && (
            <section className="panel">
              <div className="panel-heading">
                <div><h2>Notifications</h2><p>Updates about messages and practice activity.</p></div>
                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={loadNotifications}>Refresh</button>
                  <button type="button" className="secondary-button" onClick={markAllNotificationsRead} disabled={!notifications.some((item) => !item.read)}>
                    <Check size={16} /> Mark all read
                  </button>
                </div>
              </div>
              {notificationsLoading ? <p className="empty-state">Loading notifications...</p> : notifications.length ? (
                <div className="appointment-list">
                  {notifications.map((item) => (
                    <article className="appointment-row" key={item._id} style={{ opacity: item.read ? 0.72 : 1 }}>
                      <div className="avatar lavender"><Bell size={17} /></div>
                      <div className="appointment-info">
                        <strong>{item.title} {!item.read && <span className="unread-label">NEW</span>}</strong>
                        <span>{item.message}</span>
                        <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recently"} · {item.type || "general"}</small>
                      </div>
                      {!item.read && <button type="button" className="secondary-button" onClick={() => markNotificationRead(item._id)}>Mark read</button>}
                    </article>
                  ))}
                </div>
              ) : <p className="empty-state">No notifications yet.</p>}
            </section>
          )}

          {/* Analytics page */}
          {activePage === "Analytics" && (
            <>
              <div className="stats-grid analytics-stats">
                <article className="stat-card">
                  <div className="stat-top"><span>Total clients</span><span className="stat-icon lavender"><Users size={18} /></span></div>
                  <strong className="stat-value">{clients.length}</strong>
                  <div className="stat-foot">Clients currently in your practice</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span>Total appointments</span><span className="stat-icon mint"><CalendarDays size={18} /></span></div>
                  <strong className="stat-value">{appointments.length}</strong>
                  <div className="stat-foot">All appointment records</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span>Completed sessions</span><span className="stat-icon peach-bg"><CheckCircle2 size={18} /></span></div>
                  <strong className="stat-value">{completedAppointments}</strong>
                  <div className="stat-foot">Based on appointment status</div>
                </article>
                <article className="stat-card">
                  <div className="stat-top"><span>Paid revenue</span><span className="stat-icon blue-bg"><CreditCard size={18} /></span></div>
                  <strong className="stat-value">{formatCurrency(totalRevenue)}</strong>
                  <div className="stat-foot">Recorded payments marked Paid</div>
                </article>
              </div>

              <div className="analytics-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div><h2>Revenue trend</h2><p>Paid payments over the last six months</p></div>
                    <TrendingUp size={20} />
                  </div>
                  <div className="analytics-chart" role="img" aria-label="Revenue chart for the last six months">
                    {monthTrend.map((month) => (
                      <div className="analytics-bar-column" key={month.key}>
                        <strong>{formatCurrency(month.amount)}</strong>
                        <div className="analytics-bar-track"><div className="analytics-bar" style={{ height: `${Math.max(month.amount > 0 ? 8 : 0, (month.amount / maxMonthlyRevenue) * 100)}%` }} /></div>
                        <span>{month.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="analytics-footnote">Revenue is calculated from saved payment records with status “Paid”; this is not payment-gateway data.</p>
                </section>

                <section className="panel">
                  <div className="panel-heading"><div><h2>Appointment status</h2><p>Current records by status</p></div></div>
                  <div className="analytics-status-list">
                    <div><span><i className="analytics-dot completed" />Completed</span><strong>{completedAppointments}</strong></div>
                    <div><span><i className="analytics-dot pending" />Pending</span><strong>{pendingAppointments}</strong></div>
                    <div><span><i className="analytics-dot cancelled" />Cancelled</span><strong>{cancelledAppointments}</strong></div>
                  </div>
                  <div className="analytics-summary-row"><span>Revenue this month</span><strong>{formatCurrency(monthlyRevenue)}</strong></div>
                  <div className="analytics-summary-row"><span>Payment records</span><strong>{payments.length}</strong></div>
                  <div className="analytics-summary-row"><span>Session notes</span><strong>{savedNotes.length}</strong></div>
                </section>
              </div>
            </>
          )}

          {/* Subscription page */}
          {activePage === "Subscription" && (
            <section className="panel subscription-panel">
              <div className="panel-heading">
                <div><h2>Subscription plans</h2><p>Choose the plan you want to use for this project demo.</p></div>
                <span className="subscription-current"><Crown size={16} /> Current plan: {subscriptionPlan}</span>
              </div>
              <div className="subscription-notice">
                Demo mode: choosing a plan saves the selection in this browser only. It does not charge money or create a real paid subscription.
              </div>
              <div className="subscription-grid">
                <article className={`subscription-card ${subscriptionPlan === "Free" ? "selected" : ""}`}>
                  <span className="subscription-label">STARTER</span>
                  <h3>Free</h3>
                  <p className="subscription-price">₹0 <small>/ month</small></p>
                  <ul><li>Client management</li><li>Appointments and availability</li><li>Basic analytics</li><li>Manual payment records</li></ul>
                  <button type="button" className={subscriptionPlan === "Free" ? "secondary-button" : "primary-button"} onClick={() => chooseSubscriptionPlan("Free")}>{subscriptionPlan === "Free" ? "Current plan" : "Choose Free"}</button>
                </article>
                <article className={`subscription-card premium ${subscriptionPlan === "Premium" ? "selected" : ""}`}>
                  <span className="subscription-label">GROW YOUR PRACTICE</span>
                  <h3>Premium</h3>
                  <p className="subscription-price">₹499 <small>/ month · proposed demo price</small></p>
                  <ul><li>All Free plan features</li><li>Detailed practice analytics</li><li>Expanded client and session tracking</li><li>Priority feature access (planned)</li></ul>
                  <button type="button" className={subscriptionPlan === "Premium" ? "secondary-button" : "primary-button"} onClick={() => chooseSubscriptionPlan("Premium")}>{subscriptionPlan === "Premium" ? "Selected for demo" : "Select Premium demo"}</button>
                </article>
              </div>
              <div className="panel-heading subscription-history-heading"><div><h2>Billing history</h2><p>Recorded payments from your Payments section</p></div></div>
              {payments.length ? (
                <div className="appointment-list">
                  {payments.slice().sort((a, b) => new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0)).slice(0, 8).map((payment) => (
                    <article className="appointment-row" key={payment._id}>
                      <div className="avatar lavender"><CreditCard size={18} /></div>
                      <div className="appointment-info"><strong>{payment.clientName || "Payment record"}</strong><span>{formatAppointmentDate(payment.paymentDate || payment.createdAt)} · {payment.paymentMethod || "Other"}</span></div>
                      <div className="appointment-time"><strong>{formatCurrency(Number(payment.amount) || 0)}</strong><small className={payment.status === "Paid" ? "status-confirmed" : "status-pending"}>{payment.status || "Pending"}</small></div>
                    </article>
                  ))}
                </div>
              ) : <p className="empty-state">No payment records yet. Add records from the Payments section to see them here.</p>}
            </section>
          )}

          {/* Therapist Profile page */}
          {activePage === "Therapist Profile" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Therapist Profile</h2>
                  <p>Manage the information clients can see about your practice.</p>
                </div>
                <UserRound size={22} />
              </div>
              <div className="subscription-notice">
                Profile details are currently saved in this browser for the project demo. A backend profile API is needed to sync these details across devices.
              </div>
              <form className="profile-form" onSubmit={saveTherapistProfile}>
                <label className="form-field">Display name
                  <input value={therapistProfile.displayName} onChange={(e) => setTherapistProfile({ ...therapistProfile, displayName: e.target.value })} placeholder="e.g. Dr. Alex Morgan" required />
                </label>
                <label className="form-field">Profile slug
                  <input value={therapistProfile.slug} onChange={(e) => setTherapistProfile({ ...therapistProfile, slug: e.target.value })} placeholder="e.g. alex-morgan" required />
                  <small>Use this slug for your proposed public profile/booking link.</small>
                </label>
                <label className="form-field">Specialty
                  <input value={therapistProfile.specialty} onChange={(e) => setTherapistProfile({ ...therapistProfile, specialty: e.target.value })} placeholder="e.g. Anxiety, stress, relationship counselling" />
                </label>
                <label className="form-field">Qualifications
                  <input value={therapistProfile.qualification} onChange={(e) => setTherapistProfile({ ...therapistProfile, qualification: e.target.value })} placeholder="Degrees and professional qualifications" />
                </label>
                <label className="form-field">Years of experience
                  <input type="number" min="0" value={therapistProfile.experience} onChange={(e) => setTherapistProfile({ ...therapistProfile, experience: e.target.value })} placeholder="e.g. 5" />
                </label>
                <label className="form-field">Session fee (INR)
                  <input type="number" min="0" value={therapistProfile.sessionFee} onChange={(e) => setTherapistProfile({ ...therapistProfile, sessionFee: e.target.value })} placeholder="e.g. 1000" />
                </label>
                <label className="form-field">Practice location
                  <input value={therapistProfile.location} onChange={(e) => setTherapistProfile({ ...therapistProfile, location: e.target.value })} placeholder="City or online" />
                </label>
                <label className="form-field">Public contact email
                  <input type="email" value={therapistProfile.contactEmail} onChange={(e) => setTherapistProfile({ ...therapistProfile, contactEmail: e.target.value })} placeholder="contact@example.com" />
                </label>
                <label className="form-field profile-full-width">About the therapist
                  <textarea rows="5" value={therapistProfile.bio} onChange={(e) => setTherapistProfile({ ...therapistProfile, bio: e.target.value })} placeholder="Write a short professional introduction..." />
                </label>
                <label className="profile-toggle profile-full-width">
                  <input type="checkbox" checked={Boolean(therapistProfile.acceptingBookings)} onChange={(e) => setTherapistProfile({ ...therapistProfile, acceptingBookings: e.target.checked })} />
                  <span>Currently accepting new booking requests</span>
                </label>
                <div className="profile-full-width profile-actions">
                  <button type="submit" className="primary-button">Save profile</button>
                  {profileSaved && <span className="status-confirmed">Profile saved in this browser.</span>}
                </div>
              </form>
            </section>
          )}

          {/* Public Booking page */}
          {activePage === "Public Booking" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Public Booking</h2>
                  <p>Prepare a shareable booking link and review the availability settings.</p>
                </div>
                <Globe size={22} />
              </div>
              <div className="subscription-notice">
                Preview/demo setup: this screen creates a proposed link. A public-facing booking page and unauthenticated booking API still need to be connected before clients can book from that link.
              </div>
              <div className="public-booking-card">
                <div className="public-booking-icon"><Globe size={24} /></div>
                <div className="public-booking-copy">
                  <h3>{therapistProfile.displayName || getTherapistName()}</h3>
                  <p>{therapistProfile.specialty || "Therapist profile"}</p>
                  <span>{therapistProfile.location || "Location not added"}</span>
                </div>
                <span className={therapistProfile.acceptingBookings ? "status-confirmed" : "status-pending"}>
                  {therapistProfile.acceptingBookings ? "Accepting requests" : "Bookings paused"}
                </span>
              </div>
              <label className="form-field public-link-field">Proposed public booking link
                <input readOnly value={publicBookingUrl} onFocus={(e) => e.target.select()} />
              </label>
              <div className="profile-actions">
                <button type="button" className="primary-button" onClick={copyBookingLink}><Copy size={16} /> Copy booking link</button>
                <button type="button" className="secondary-button" onClick={() => changePage("Therapist Profile")}><UserRound size={16} /> Edit profile</button>
              </div>
              {bookingNotice && <p className="empty-state">{bookingNotice}</p>}
              <div className="panel-heading public-availability-heading"><div><h2>Weekly availability</h2><p>Based on your saved availability settings</p></div><button type="button" className="secondary-button" onClick={() => changePage("Availability")}>Manage availability</button></div>
              <div className="public-availability-list">
                {availability.weeklySchedule.map((day) => (
                  <div key={day.dayOfWeek} className="analytics-summary-row">
                    <span>{DAYS[day.dayOfWeek]}</span>
                    <strong>{day.isAvailable ? `${day.startTime} – ${day.endTime}` : "Unavailable"}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Settings page */}
          {activePage === "Settings" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Settings</h2>
                  <p>Manage your current session.</p>
                </div>
              </div>

              <p>
                You are logged in to the Unfazed Therapist Practice
                Management dashboard.
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={handleLogout}
              >
                <LogOut size={17} /> Logout
              </button>
            </section>
          )}

          <footer className="page-footer">
            <span>© 2026 Unfazed Practice Manager</span>
            <span>
              Made with care <Heart size={13} />
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
