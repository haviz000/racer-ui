import { useState } from "react";
import { useLogin } from "../queries/auth.query";
import "./login.css";

export default function Login() {
  const { mutate, error } = useLogin();
  console.log("isi errrr", error);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    mutate({ username, password });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Please login to your account</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>username</label>
            <input
              type="text"
              placeholder="name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-button">
            Sign In
          </button>
          {error && <p className="error-message">{error.message}</p>}
        </form>
      </div>
    </div>
  );
}
