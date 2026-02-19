import React, { useState } from "react";
import { useRaceTest } from "../queries/race.query";
import "./request-form.css";
import ResponseCard from "../components/ResponseCard";

export default function RacePage() {
  const { mutateAsync, isPending } = useRaceTest();
  const [data, setData] = useState(null);

  const [form, setForm] = useState({
    url: "",
    method: "GET",
    total_request: 1,
    concurrent: 1,
    payload: "",
    headers: "",
    authorization: "",
  });

  const handleChange = (e: { target: { name: string; value: string } }) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    let parsedPayload = {};
    let parsedHeaders = {};

    try {
      parsedPayload = form.payload ? JSON.parse(form.payload) : {};
      parsedHeaders = form.headers ? JSON.parse(form.headers) : {};
    } catch (err) {
      alert(`Payload or Headers must be valid JSON. err: ${err}`);
      return;
    }

    const finalData = {
      url: form.url,
      method: form.method,
      total_request: Number(form.total_request),
      concurrent: Number(form.concurrent),
      payload: parsedPayload,
      headers: parsedHeaders,
      authorization: form.authorization,
    };

    try {
      const response = await mutateAsync(finalData);
      setData(response.data); // simpan response
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="container">
      <form className="card" onSubmit={handleSubmit}>
        <h2 className="title">Request Configuration</h2>

        <div className="form-group">
          <label>URL</label>
          <input
            type="text"
            name="url"
            value={form.url}
            onChange={handleChange}
            placeholder="https://api.example.com"
            required
          />
        </div>

        <div className="row">
          <div className="form-group">
            <label>Method</label>
            <select name="method" value={form.method} onChange={handleChange}>
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
          </div>

          <div className="form-group">
            <label>Total Request</label>
            <input
              type="number"
              name="total_request"
              value={form.total_request}
              onChange={handleChange}
              min="1"
            />
          </div>

          <div className="form-group">
            <label>Concurrent</label>
            <input
              type="number"
              name="concurrent"
              value={form.concurrent}
              onChange={handleChange}
              min="1"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Authorization</label>
          <input
            type="text"
            name="authorization"
            value={form.authorization}
            onChange={handleChange}
            placeholder="Bearer token..."
          />
        </div>

        <div className="form-group">
          <label>Payload (JSON)</label>
          <textarea
            name="payload"
            value={form.payload}
            onChange={handleChange}
            placeholder='{"key":"value"}'
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>Headers (JSON)</label>
          <textarea
            name="headers"
            value={form.headers}
            onChange={handleChange}
            placeholder='{"Content-Type":"application/json"}'
            rows={4}
          />
        </div>

        <button type="submit" className="btn">
          Submit
        </button>
      </form>
      <ResponseCard data={data} />
      {isPending && (
        <div className="loading-wrapper">
          <div className="spinner"></div>
          <p>Running race test...</p>
        </div>
      )}
    </div>
  );
}
