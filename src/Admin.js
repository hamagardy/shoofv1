import React, { useState, useEffect } from "react";
import { auth, realtimeDb } from "./firebase";
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import {
  ref as dbRef,
  onValue,
  set,
  remove,
  update,
  push,
} from "firebase/database";
import { Draggable, Droppable, DragDropContext } from "@hello-pangea/dnd";
import QRCode from "qrcode";
import "./styles.css";

function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [employees, setEmployees] = useState([]);
  const [newName, setNewName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [editRoleId, setEditRoleId] = useState(null);
  const [editRoleValue, setEditRoleValue] = useState("");
  const [phone, setPhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [twitter, setTwitter] = useState("");
  const [notes, setNotes] = useState("");
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [editEmployeeData, setEditEmployeeData] = useState({});
  const [feedbacks, setFeedbacks] = useState([]);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [swipeState, setSwipeState] = useState({});
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showRoleReport, setShowRoleReport] = useState(false);

  useEffect(() => {
    const rolesRef = dbRef(realtimeDb, "roles");
    const unsubscribeRoles = onValue(
      rolesRef,
      (snapshot) => {
        const data = snapshot.val();
        console.log("Fetched roles:", data);
        if (data) {
          const roleList = Object.entries(data).map(([id, value]) => ({
            id,
            value,
          }));
          setRoles(roleList);
        } else {
          const defaultRoles = [
            "CEO",
            "Deputy CEO",
            "Office Manager",
            "HR Supervisor",
          ];
          defaultRoles.forEach((role) => {
            const newRoleRef = push(rolesRef);
            set(newRoleRef, role);
          });
          setRoles(
            defaultRoles.map((value, index) => ({
              id: `default${index}`,
              value,
            }))
          );
        }
      },
      (error) => console.error("Error fetching roles:", error)
    );

    const employeesRef = dbRef(realtimeDb, "employees");
    const unsubscribeEmployees = onValue(
      employeesRef,
      (snapshot) => {
        const data = snapshot.val();
        console.log("Fetched employees:", data);
        if (data) {
          const employeeList = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setEmployees(employeeList);
        } else {
          setEmployees([]);
        }
      },
      (error) => console.error("Error fetching employees:", error)
    );

    const feedbackRef = dbRef(realtimeDb, "feedback");
    const unsubscribeFeedback = onValue(
      feedbackRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const feedbackList = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setFeedbacks(feedbackList);
        } else {
          setFeedbacks([]);
        }
      },
      (error) => console.error("Error fetching feedback:", error)
    );

    return () => {
      unsubscribeRoles();
      unsubscribeEmployees();
      unsubscribeFeedback();
    };
  }, []);

  const generateQRCodeText = (employee) => {
    const qrText = `${employee.name}\nPosition: ${employee.position}\nOfficial Shoof Registered User`;
    return employee.phone
      ? `whatsapp://send?phone=${employee.phone}&text=${encodeURIComponent(
          qrText
        )}`
      : qrText;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      setUser(userCredential.user);
    } catch (error) {
      alert("Login failed: " + error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error) {
      alert("Error sending password reset email: " + error.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      alert("Please fill in both current and new passwords.");
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      alert("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setShowSettings(false);
    } catch (error) {
      alert("Error changing password: " + error.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (newRole && !roles.some((role) => role.value === newRole)) {
      const rolesRef = dbRef(realtimeDb, "roles");
      const newRoleRef = push(rolesRef);
      await set(newRoleRef, newRole);
      setNewRole("");
    }
  };

  const handleEditRole = (id, currentValue) => {
    setEditRoleId(id);
    setEditRoleValue(currentValue);
  };

  const handleSaveEditRole = async (e) => {
    e.preventDefault();
    if (
      editRoleValue &&
      !roles.some(
        (role) => role.value === editRoleValue && role.id !== editRoleId
      )
    ) {
      await set(dbRef(realtimeDb, `roles/${editRoleId}`), editRoleValue);
      setEditRoleId(null);
      setEditRoleValue("");
    }
  };

  const handleDeleteRole = async (id) => {
    await remove(dbRef(realtimeDb, `roles/${id}`));
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const employeeId = `employee${Date.now()}`;
      const newEmployee = {
        name: newName,
        position: newPosition,
        order: employees.length,
        verified: false,
        ...(phone && { phone }),
        ...(facebook || twitter
          ? {
              socialMedia: {
                ...(facebook && { facebook }),
                ...(twitter && { twitter }),
              },
            }
          : {}),
        ...(notes && { notes }),
      };
      const qrCodeText = generateQRCodeText(newEmployee);
      const qrCodeUrl = await QRCode.toDataURL(qrCodeText, {
        width: 100,
        height: 100,
      });
      newEmployee.qrCode = qrCodeUrl;
      const newEmployeeRef = dbRef(realtimeDb, `employees/${employeeId}`);
      await set(newEmployeeRef, newEmployee);
      setEmployees([...employees, { id: employeeId, ...newEmployee }]);
      setNewName("");
      setNewPosition("");
      setPhone("");
      setFacebook("");
      setTwitter("");
      setNotes("");
    } catch (error) {
      console.error("Error adding employee:", error);
    }
  };

  const handleEditEmployee = (emp) => {
    setEditEmployeeId(emp.id);
    setEditEmployeeData({
      name: emp.name,
      position: emp.position,
      phone: emp.phone || "",
      facebook: emp.socialMedia?.facebook || "",
      twitter: emp.socialMedia?.twitter || "",
      notes: emp.notes || "",
      verified: emp.verified || false,
    });
  };

  const handleSaveEditEmployee = async (e) => {
    e.preventDefault();
    try {
      const updatedEmployee = {
        ...employees.find((emp) => emp.id === editEmployeeId),
        name: editEmployeeData.name,
        position: editEmployeeData.position,
        phone: editEmployeeData.phone,
        socialMedia: {
          facebook: editEmployeeData.facebook,
          twitter: editEmployeeData.twitter,
        },
        notes: editEmployeeData.notes,
        verified: editEmployeeData.verified,
      };
      const qrCodeText = generateQRCodeText(updatedEmployee);
      const qrCodeUrl = await QRCode.toDataURL(qrCodeText, {
        width: 100,
        height: 100,
      });
      updatedEmployee.qrCode = qrCodeUrl; // Overwrites old QR code
      await set(
        dbRef(realtimeDb, `employees/${editEmployeeId}`),
        updatedEmployee
      );
      setEditEmployeeId(null);
      setEditEmployeeData({});
    } catch (error) {
      console.error("Error updating employee:", error);
    }
  };

  const handleDelete = async (id) => {
    await remove(dbRef(realtimeDb, `employees/${id}`));
    setEmployees(employees.filter((emp) => emp.id !== id));
  };

  const handleDeleteFeedback = async (id) => {
    await remove(dbRef(realtimeDb, `feedback/${id}`));
    setFeedbacks(feedbacks.filter((fb) => fb.id !== id));
    setSwipeState((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    const reorderedEmployees = Array.from(employees);
    const [movedEmployee] = reorderedEmployees.splice(sourceIndex, 1);
    reorderedEmployees.splice(destIndex, 0, movedEmployee);

    const updatedEmployees = reorderedEmployees.map((emp, index) => ({
      ...emp,
      order: index,
    }));

    console.log("Reordered employees:", updatedEmployees);

    setEmployees(updatedEmployees);

    const updates = {};
    updatedEmployees.forEach((emp) => {
      updates[`employees/${emp.id}/order`] = emp.order;
    });

    update(dbRef(realtimeDb), updates).catch((error) =>
      console.error("Error updating order:", error)
    );
  };

  const handleOrderChange = async (id, newOrder) => {
    const parsedOrder = parseInt(newOrder, 10);
    if (isNaN(parsedOrder) || parsedOrder < 1) return;

    const updatedEmployees = employees.map((emp) =>
      emp.id === id ? { ...emp, order: parsedOrder - 1 } : emp
    );
    updatedEmployees.sort((a, b) => a.order - b.order);

    const reindexedEmployees = updatedEmployees.map((emp, index) => ({
      ...emp,
      order: index,
    }));

    setEmployees(reindexedEmployees);

    const updates = {};
    reindexedEmployees.forEach((emp) => {
      updates[`employees/${emp.id}/order`] = emp.order;
    });

    await update(dbRef(realtimeDb), updates).catch((error) =>
      console.error("Error updating order:", error)
    );
  };

  const handleSwipeStart = (id, e) => {
    const x = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
    setSwipeState((prev) => ({ ...prev, [id]: { startX: x, currentX: 0 } }));
  };

  const handleSwipeMove = (id, e) => {
    if (!swipeState[id] || !swipeState[id].startX) return;
    const x = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    const deltaX = x - swipeState[id].startX;
    if (deltaX < 0) {
      setSwipeState((prev) => ({
        ...prev,
        [id]: { ...prev[id], currentX: Math.max(deltaX, -100) },
      }));
    }
  };

  const handleSwipeEnd = (id) => {
    if (swipeState[id] && swipeState[id].currentX <= -50) {
      const confirmDelete = window.confirm(
        "Are you sure you want to delete this feedback?"
      );
      if (confirmDelete) {
        handleDeleteFeedback(id);
      } else {
        setSwipeState((prev) => ({
          ...prev,
          [id]: { ...prev[id], currentX: 0 },
        }));
      }
    } else {
      setSwipeState((prev) => ({
        ...prev,
        [id]: { ...prev[id], currentX: 0 },
      }));
    }
  };

  const getYears = () => {
    const years = feedbacks.map((fb) => new Date(fb.timestamp).getFullYear());
    return ["all", ...new Set(years)].sort();
  };

  const getMonths = (year) => {
    if (year === "all") return ["all"];
    const months = feedbacks
      .filter((fb) => new Date(fb.timestamp).getFullYear() === parseInt(year))
      .map((fb) => new Date(fb.timestamp).getMonth() + 1);
    return ["all", ...new Set(months)].sort();
  };

  const filteredFeedbacks = feedbacks
    .filter((fb) => {
      const date = new Date(fb.timestamp);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      return (
        (filterYear === "all" || year === parseInt(filterYear)) &&
        (filterMonth === "all" || month === parseInt(filterMonth))
      );
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleRefreshFeedback = () => {
    const feedbackRef = dbRef(realtimeDb, "feedback");
    onValue(
      feedbackRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const feedbackList = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setFeedbacks(feedbackList);
        } else {
          setFeedbacks([]);
        }
      },
      { onlyOnce: true }
    );
  };

  const handleExportFeedbackToCSV = () => {
    const headers = "Name,Position,Email,Subject,Message,Date,Read\n";
    const rows = filteredFeedbacks
      .map((fb) =>
        `${fb.name},${fb.position},${fb.email},${fb.subject},${
          fb.message
        },${new Date(fb.timestamp).toLocaleString()},${
          fb.read || "false"
        }`.replace(/,/g, " ")
      )
      .join("\n");
    const csv = headers + rows;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feedback.csv";
    a.click();
  };

  const handleToggleRead = async (id, currentStatus) => {
    await update(dbRef(realtimeDb, `feedback/${id}`), { read: !currentStatus });
  };

  const getRoleUsage = () => {
    const usage = roles.map((role) => ({
      name: role.value,
      count: employees.filter((emp) => emp.position === role.value).length,
    }));
    return usage;
  };

  if (!user) {
    return (
      <div className="app-container">
        <header className="header">
          <h1>Admin Login</h1>
        </header>
        <main className="main-content">
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
            />
            <button type="submit" className="login-btn">
              Login
            </button>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="forgot-password-btn"
              style={{
                marginTop: "10px",
                background: "none",
                color: "#007bff",
              }}
            >
              Forgot Password?
            </button>
          </form>
        </main>
        <footer className="footer">
          <p>© 2025 Shoof Employers. All rights reserved.</p>
          <p>
            Powered by{" "}
            <a
              href="https://hamagardy.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              @Hamagardy
            </a>
          </p>
        </footer>
      </div>
    );
  }

  if (showFeedbacks) {
    return (
      <div className="app-container">
        <header className="header">
          <img
            src="https://mir-s3-cdn-cf.behance.net/projects/404/81b425190094991.65b607e9ce464.jpg"
            alt="Logo"
            className="logo"
          />
          <h1>Feedback Dashboard</h1>
          <button onClick={() => setShowFeedbacks(false)} className="close-btn">
            Back to Admin
          </button>
        </header>
        <main className="main-content">
          <div className="filter-container">
            <label>Filter by Year:</label>
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setFilterMonth("all");
              }}
              className="admin-select"
            >
              {getYears().map((year) => (
                <option key={year} value={year}>
                  {year === "all" ? "All Years" : year}
                </option>
              ))}
            </select>
            <label>Filter by Month:</label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="admin-select"
            >
              {getMonths(filterYear).map((month) => (
                <option key={month} value={month}>
                  {month === "all"
                    ? "All Months"
                    : new Date(0, month - 1).toLocaleString("default", {
                        month: "long",
                      })}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setFilterYear("all");
                setFilterMonth("all");
              }}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                padding: "4px 8px", // Smaller size
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px", // Professional look
                marginLeft: "5px",
              }}
            >
              Clear Filters
            </button>
            <button
              onClick={handleRefreshFeedback}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                padding: "4px 8px", // Smaller size
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                marginLeft: "5px",
              }}
            >
              Refresh
            </button>
            <button
              onClick={handleExportFeedbackToCSV}
              style={{
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                padding: "4px 8px", // Smaller size
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                marginLeft: "5px",
              }}
            >
              Export to CSV
            </button>
          </div>
          <div className="employee-list">
            {filteredFeedbacks.length === 0 ? (
              <p>No feedback submissions found.</p>
            ) : (
              filteredFeedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="employee-card feedback-card"
                  onTouchStart={(e) => handleSwipeStart(feedback.id, e)}
                  onTouchMove={(e) => handleSwipeMove(feedback.id, e)}
                  onTouchEnd={() => handleSwipeEnd(feedback.id)}
                  onMouseDown={(e) => handleSwipeStart(feedback.id, e)}
                  onMouseMove={(e) => handleSwipeMove(feedback.id, e)}
                  onMouseUp={() => handleSwipeEnd(feedback.id)}
                  onMouseLeave={() => handleSwipeEnd(feedback.id)}
                  style={{
                    transform: `translateX(${
                      swipeState[feedback.id]?.currentX || 0
                    }px)`,
                    transition:
                      swipeState[feedback.id]?.currentX === 0
                        ? "transform 0.3s ease"
                        : "none",
                  }}
                >
                  <div className="employee-card-content">
                    <span className="employee-name">{feedback.name}</span>
                    <span className="employee-position">
                      {feedback.position}
                    </span>
                    <div>
                      <p>
                        <strong>Email:</strong> {feedback.email}
                      </p>
                      <p>
                        <strong>Subject:</strong> {feedback.subject}
                      </p>
                      <p>
                        <strong>Message:</strong> {feedback.message}
                      </p>
                      <p>
                        <strong>Date:</strong>{" "}
                        {new Date(feedback.timestamp).toLocaleString()}
                      </p>
                      <button
                        onClick={() =>
                          handleToggleRead(feedback.id, feedback.read || false)
                        }
                        style={{
                          backgroundColor: feedback.read
                            ? "#4caf50"
                            : "#f44336",
                          color: "white",
                          border: "none",
                          padding: "5px 10px",
                          marginTop: "5px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        {feedback.read ? "Mark Unread" : "Mark Read"}
                      </button>
                    </div>
                  </div>
                  <div
                    className="delete-background"
                    style={{
                      width:
                        swipeState[feedback.id]?.currentX < 0
                          ? `${Math.abs(swipeState[feedback.id]?.currentX)}px`
                          : "0",
                    }}
                  >
                    <i className="fas fa-trash delete-icon"></i>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
        <footer className="footer">
          <p>© 2025 Shoof Employers. All rights reserved.</p>
          <p>
            Powered by{" "}
            <a
              href="https://hamagardy.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              @Hamagardy
            </a>
          </p>
        </footer>
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="app-container">
        <header className="header">
          <img
            src="https://mir-s3-cdn-cf.behance.net/projects/404/81b425190094991.65b607e9ce464.jpg"
            alt="Logo"
            className="logo"
          />
          <h1>Admin Settings</h1>
          <button onClick={() => setShowSettings(false)} className="close-btn">
            Back to Dashboard
          </button>
        </header>
        <main className="main-content">
          <h2>Change Password</h2>
          <form onSubmit={handleChangePassword} className="admin-form">
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="admin-input"
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="admin-input"
            />
            <button type="submit" className="add-btn">
              Save New Password
            </button>
          </form>
        </main>
        <footer className="footer">
          <p>© 2025 Shoof Employers. All rights reserved.</p>
          <p>
            Powered by{" "}
            <a
              href="https://hamagardy.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              @Hamagardy
            </a>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <img
          src="https://mir-s3-cdn-cf.behance.net/projects/404/81b425190094991.65b607e9ce464.jpg"
          alt="Logo"
          className="logo"
        />
        <h1>Admin Dashboard</h1>
        {user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: "10px",
            }}
          >
            <span
              style={{
                fontSize: "16px",
                color: "#333",
                marginRight: "5px",
              }}
            >
              <i
                style={{ marginRight: "5px" }}
                className="fas fa-user" // Requires FontAwesome
              ></i>
              {user.email}
            </span>
          </div>
        )}
        <div>
          <button
            onClick={() => setShowFeedbacks(true)}
            className="add-btn"
            style={{ marginRight: "10px" }}
          >
            View Feedback
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="add-btn"
            style={{ marginRight: "10px" }}
          >
            Settings
          </button>
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      <main className="main-content">
        <form onSubmit={handleAddEmployee} className="admin-form">
          <input
            type="text"
            placeholder="Employee Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            className="admin-input"
          />
          <select
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            required
            className="admin-select"
          >
            <option value="">Select Position</option>
            {roles.map((role) => (
              <option key={role.id} value={role.value}>
                {role.value}
              </option>
            ))}
          </select>
          <div>
            <input
              type="text"
              placeholder="New Role (optional)"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="admin-input"
            />
            <button onClick={handleAddRole} className="add-btn">
              Add Role
            </button>
          </div>
          <input
            type="text"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="admin-input"
          />
          <input
            type="text"
            placeholder="Facebook URL (optional)"
            value={facebook}
            onChange={(e) => setFacebook(e.target.value)}
            className="admin-input"
          />
          <input
            type="text"
            placeholder="Twitter URL (optional)"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            className="admin-input"
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="admin-input"
          />
          <button type="submit" className="add-btn">
            Add Employee
          </button>
        </form>

        <h2>Roles</h2>
        <div className="role-list">
          {roles.length === 0 ? (
            <p>No roles available.</p>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="role-item">
                {editRoleId === role.id ? (
                  <form
                    onSubmit={handleSaveEditRole}
                    className="edit-role-form"
                  >
                    <input
                      type="text"
                      value={editRoleValue}
                      onChange={(e) => setEditRoleValue(e.target.value)}
                      className="admin-input"
                    />
                    <button type="submit" className="add-btn">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRoleId(null)}
                      className="delete-btn"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span>{role.value}</span>
                    <button
                      onClick={() => handleEditRole(role.id, role.value)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        <div>
          <button
            onClick={() => setShowRoleReport(!showRoleReport)}
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showRoleReport ? "Hide Report" : "Show Role Usage"}
          </button>
          {showRoleReport && (
            <div style={{ marginTop: "10px" }}>
              {getRoleUsage().map((role) => (
                <div
                  key={role.name}
                  style={{
                    backgroundColor: "#f9f9f9",
                    padding: "10px",
                    marginBottom: "10px",
                    borderRadius: "5px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  <span style={{ fontSize: "16px", fontWeight: "bold" }}>
                    {role.name}
                  </span>
                  <p style={{ margin: "5px 0" }}>
                    Assigned to {role.count} employees
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <h2>Employee List</h2>
        <input
          type="text"
          placeholder="Search employees..."
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
          className="admin-input"
        />
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="employees">
            {(provided) => (
              <div
                className="employee-list"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {employees.length === 0 ? (
                  <p>No employees found.</p>
                ) : (
                  employees
                    .filter((emp) =>
                      employeeSearch
                        ? emp.name
                            .toLowerCase()
                            .includes(employeeSearch.toLowerCase()) ||
                          emp.position
                            .toLowerCase()
                            .includes(employeeSearch.toLowerCase())
                        : true
                    )
                    .sort((a, b) => a.order - b.order)
                    .map((emp, index) => (
                      <Draggable
                        key={emp.id}
                        draggableId={emp.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            className={`employee-card ${
                              snapshot.isDragging ? "dragging" : ""
                            }`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {editEmployeeId === emp.id ? (
                              <form
                                onSubmit={handleSaveEditEmployee}
                                className="edit-employee-form"
                              >
                                <input
                                  type="text"
                                  value={editEmployeeData.name}
                                  onChange={(e) =>
                                    setEditEmployeeData({
                                      ...editEmployeeData,
                                      name: e.target.value,
                                    })
                                  }
                                  className="admin-input"
                                  required
                                />
                                <select
                                  value={editEmployeeData.position}
                                  onChange={(e) =>
                                    setEditEmployeeData({
                                      ...editEmployeeData,
                                      position: e.target.value,
                                    })
                                  }
                                  className="admin-select"
                                  required
                                >
                                  <option value="">Select Position</option>
                                  {roles.map((role) => (
                                    <option key={role.id} value={role.value}>
                                      {role.value}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="Phone"
                                  value={editEmployeeData.phone}
                                  onChange={(e) =>
                                    setEditEmployeeData({
                                      ...editEmployeeData,
                                      phone: e.target.value,
                                    })
                                  }
                                  className="admin-input"
                                />
                                <input
                                  type="text"
                                  placeholder="Facebook URL"
                                  value={editEmployeeData.facebook}
                                  onChange={(e) =>
                                    setEditEmployeeData({
                                      ...editEmployeeData,
                                      facebook: e.target.value,
                                    })
                                  }
                                  className="admin-input"
                                />
                                <input
                                  type="text"
                                  placeholder="Twitter URL"
                                  value={editEmployeeData.twitter}
                                  onChange={(e) =>
                                    setEditEmployeeData({
                                      ...editEmployeeData,
                                      twitter: e.target.value,
                                    })
                                  }
                                  className="admin-input"
                                />
                                <textarea
                                  placeholder="Notes"
                                  value={editEmployeeData.notes}
                                  onChange={(e) =>
                                    setEditEmployeeData({
                                      ...editEmployeeData,
                                      notes: e.target.value,
                                    })
                                  }
                                  className="admin-input"
                                />
                                <label>
                                  Verified Badge:
                                  <input
                                    type="checkbox"
                                    checked={editEmployeeData.verified}
                                    onChange={(e) =>
                                      setEditEmployeeData({
                                        ...editEmployeeData,
                                        verified: e.target.checked,
                                      })
                                    }
                                  />
                                </label>
                                <button type="submit" className="add-btn">
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditEmployeeId(null)}
                                  className="delete-btn"
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <div className="employee-card-content">
                                <input
                                  type="number"
                                  min="1"
                                  value={emp.order + 1}
                                  onChange={(e) =>
                                    handleOrderChange(emp.id, e.target.value)
                                  }
                                  className="order-input"
                                  title="Set order (1 = top)"
                                />
                                <span className="employee-name">
                                  {emp.name}{" "}
                                  {emp.verified && (
                                    <i className="fas fa-check-circle verified-badge"></i>
                                  )}
                                </span>
                                <span className="employee-position">
                                  {emp.position}
                                </span>
                                <button
                                  onClick={() => handleEditEmployee(emp)}
                                  className="edit-btn"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(emp.id)}
                                  className="delete-btn"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </main>
      <footer className="footer">
        <p>© 2025 Shoof Employers. All rights reserved.</p>
        <p>
          Powered by{" "}
          <a
            href="https://hamagardy.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            @Hamagardy
          </a>
        </p>
      </footer>
    </div>
  );
}

export default Admin;
