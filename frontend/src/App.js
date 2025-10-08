import React from "react";
import BookingForm from "./components/BookingForm";

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>E-Post Office Management</h1>
        <p className="subtitle">Book and track parcels — contactless and simple</p>
      </header>

      <main className="container">
        <BookingForm />
      </main>

      <footer className="footer">
        <small>Built with React • Backend: Node/Express • Localhost demo</small>
      </footer>
    </div>
  );
}

export default App;
