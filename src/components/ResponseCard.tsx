import React from "react";
import "./response-card.css";

export default function ResponseCard({ data }) {
  if (!data) return null;

  return (
    <div className="response-card">
      <h2 className="response-title">Response Summary</h2>

      <div className="response-stats">
        <div className="stat-box">
          <span className="stat-label">Total Request</span>
          <span className="stat-value">{data.total_request}</span>
        </div>

        <div className="stat-box">
          <span className="stat-label">Total Time</span>
          <span className="stat-value">{data.total_time} ms</span>
        </div>
      </div>

      <div className="result-section">
        <h3 className="result-title">Result Breakdown</h3>

        <div className="result-list">
          {data.result.map((item, index) => (
            <div className="result-item" key={index}>
              <div className="result-left">
                <span className="code">{item.code_response}</span>
                <span className="status">{item.status_text}</span>
              </div>
              <div className="count">{item.count_code}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
