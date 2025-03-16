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
import { Draggable, Droppable, DragDropContext } from "@hello-pangea/dnd"; // Added DragDropContext
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
  const [showSettings, setShowSettings] = useState(false); // For settings section
  const [currentPassword, setCurrentPassword] = useState(""); // For change password
  const [newPassword, setNewPassword] = useState(""); // For change password

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
    return `${employee.name}\nPosition: ${employee.position}\nOfficial Shoof Registered User`;
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
      setShowSettings(false); // Close settings after success
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
      updatedEmployee.qrCode = qrCodeUrl;
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
          <div className="employee-list">
            {feedbacks.length === 0 ? (
              <p>No feedback submissions found.</p>
            ) : (
              feedbacks
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((feedback) => (
                  <div key={feedback.id} className="employee-card">
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
                      </div>
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

        <h2>Employee List</h2>
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
