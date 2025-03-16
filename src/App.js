import React, { useState, useEffect, useMemo } from "react";
import { realtimeDb } from "./firebase";
import { ref, onValue, push } from "firebase/database";
import { useNavigate, useLocation } from "react-router-dom";
import "./styles.css";

function App() {
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    name: "",
    email: "",
    position: "",
    subject: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsLoading(true);
    const employeesRef = ref(realtimeDb, "employees");
    const unsubscribe = onValue(
      employeesRef,
      (snapshot) => {
        const data = snapshot.val();
        console.log("Fetched from Realtime Database:", data);
        if (data) {
          const employeeList = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setEmployees(employeeList);
        } else {
          setEmployees([]);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Realtime DB fetch error:", error);
        setIsLoading(false);
      }
    );

    if (location.pathname === "/feedback") {
      setShowFeedback(true);
    } else {
      setShowFeedback(false);
    }

    return () => unsubscribe();
  }, [location.pathname]);

  const filteredEmployees = useMemo(() => {
    return employees
      .filter(
        (emp) =>
          emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [employees, searchTerm]);

  const displayedEmployees = showAll
    ? filteredEmployees
    : filteredEmployees.slice(0, 4);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      const feedbackRef = ref(realtimeDb, "feedback");
      await push(feedbackRef, {
        ...feedbackData,
        timestamp: Date.now(),
      });
      setFeedbackData({
        name: "",
        email: "",
        position: "",
        subject: "",
        message: "",
      });
      alert("Feedback submitted successfully!");
      navigate("/");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Error submitting feedback. Please try again.");
    }
  };

  const handleFeedbackChange = (e) => {
    setFeedbackData({
      ...feedbackData,
      [e.target.name]: e.target.value,
    });
  };

  const openFeedback = () => {
    setShowFeedback(true);
    navigate("/feedback");
  };

  const closeFeedback = () => {
    setShowFeedback(false);
    navigate("/");
  };

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          textAlign: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoG8mbZjF72PDWAxIjC1BVMXriY0rSWAbmjw&s"
          alt="Logo"
          style={{
            width: "100px",
            height: "100px",
            marginBottom: "20px",
          }}
        />
        <div
          style={{
            fontSize: "1.5rem",
            color: "#333",
            fontFamily: "Arial, sans-serif",
          }}
        >
          Loading employees...
        </div>
      </div>
    );
  }

  if (showFeedback) {
    return (
      <div className="app-container">
        <header className="header">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoG8mbZjF72PDWAxIjC1BVMXriY0rSWAbmjw&s"
            alt="Logo"
            className="logo"
          />
          <h1>Feedback Form</h1>
          <button onClick={closeFeedback} className="close-btn">
            Close
          </button>
        </header>

        <main className="main-content">
          <form onSubmit={handleFeedbackSubmit} className="admin-form">
            <input
              type="text"
              name="name"
              placeholder="Your Name"
              value={feedbackData.name}
              onChange={handleFeedbackChange}
              required
              className="admin-input"
            />
            <input
              type="email"
              name="email"
              placeholder="Your Email"
              value={feedbackData.email}
              onChange={handleFeedbackChange}
              required
              className="admin-input"
            />
            <input
              type="text"
              name="position"
              placeholder="Your Position"
              value={feedbackData.position}
              onChange={handleFeedbackChange}
              required
              className="admin-input"
            />
            <input
              type="text"
              name="subject"
              placeholder="Subject"
              value={feedbackData.subject}
              onChange={handleFeedbackChange}
              required
              className="admin-input"
            />
            <textarea
              name="message"
              placeholder="Your Message"
              value={feedbackData.message}
              onChange={handleFeedbackChange}
              required
              className="admin-input"
            />
            <button type="submit" className="add-btn">
              Submit Feedback
            </button>
          </form>
        </main>

        <footer className="footer">
          <p>© 2025 Shoof Employers. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSoG8mbZjF72PDWAxIjC1BVMXriY0rSWAbmjw&s"
          alt="Logo"
          className="logo"
        />
        <h1>Shoof Staff</h1>
      </header>

      <main className="main-content">
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            margin: "0 auto",
            position: "relative",
          }}
        >
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-bar"
            style={{ width: "100%" }}
          />
          <button onClick={openFeedback} className="feedback-btn">
            Feedback
          </button>
        </div>
        <div className="employee-list">
          {showAll && (
            <button
              className="close-list-btn"
              onClick={() => setShowAll(false)}
            >
              Close Full List
            </button>
          )}
          {displayedEmployees.length === 0 ? (
            <p>No employees found.</p>
          ) : (
            displayedEmployees.map((emp) => (
              <div key={emp.id} className="employee-card">
                <span className="employee-name">
                  {emp.name}{" "}
                  {emp.verified && (
                    <i className="fas fa-check-circle verified-badge"></i>
                  )}
                </span>
                <span className="employee-position">{emp.position}</span>
                <i
                  className="fas fa-info-circle info-btn"
                  onClick={() => setSelectedEmployee(emp)}
                ></i>
              </div>
            ))
          )}
          {!showAll && filteredEmployees.length > 4 && (
            <button className="see-all-btn" onClick={() => setShowAll(true)}>
              Click to See All
            </button>
          )}
        </div>

        {selectedEmployee && (
          <div className="info-modal">
            <div className="info-card">
              <h2>
                {selectedEmployee.name}{" "}
                {selectedEmployee.verified && (
                  <i className="fas fa-check-circle verified-badge"></i>
                )}
              </h2>
              <p>
                <strong>Position:</strong> {selectedEmployee.position}
              </p>
              {selectedEmployee.phone && (
                <p>
                  <i className="fas fa-phone"></i> <strong>Phone:</strong>{" "}
                  {selectedEmployee.phone}
                </p>
              )}
              {selectedEmployee.socialMedia && (
                <div className="social-media">
                  <strong>Social Media:</strong>
                  {selectedEmployee.socialMedia.facebook && (
                    <a
                      href={selectedEmployee.socialMedia.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fab fa-facebook"></i>
                    </a>
                  )}
                  {selectedEmployee.socialMedia.twitter && (
                    <a
                      href={selectedEmployee.socialMedia.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="fab fa-twitter"></i>
                    </a>
                  )}
                </div>
              )}
              {selectedEmployee.notes && (
                <p>
                  <strong>Notes:</strong> {selectedEmployee.notes}
                </p>
              )}
              {selectedEmployee.qrCode && (
                <div>
                  <strong>QR Code:</strong>
                  <img
                    src={selectedEmployee.qrCode}
                    alt="QR Code"
                    className="qr-code"
                    title="Scan to view employee info"
                  />
                </div>
              )}
              <button
                className="close-btn"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
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

export default App;
