import { useState } from "react";
import { useRaceTest } from "../queries/race.query";
import "./request-form.css";
import ResponseCard from "../components/ResponseCard";
import { parseCurl } from "../utils/curl-parser";

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
    bodyType: "json", // "json" | "form-data"
  });

  const [curlInput, setCurlInput] = useState("");
  const [showCurlImport, setShowCurlImport] = useState(false);
  const [showFileImport, setShowFileImport] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // usually format is "data:application/pdf;base64,....."
      // we might want just the base64 part or keep strictly as is
      // For simplicity, let's keep the full data URI, backend can parse it or we strip it here.
      // Let's strip it here to be cleaner for backend
      const content = base64String.split(",")[1];

      const fileObject = {
        _type: "file",
        filename: file.name,
        content: content,
      };

      // Append to payload
      try {
        const currentPayload = form.payload ? JSON.parse(form.payload) : {};
        // Suggest a key name
        const key = "file";
        // If key exists, append index
        let finalKey = key;
        let i = 1;
        while (currentPayload[finalKey]) {
          finalKey = `${key}_${i}`;
          i++;
        }

        currentPayload[finalKey] = fileObject;
        setForm((prev) => ({
          ...prev,
          payload: JSON.stringify(currentPayload, null, 2),
        }));
      } catch {
        alert("Current payload is not valid JSON. Cannot append file.");
      }
      setShowFileImport(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCurlImport = () => {
    const parsed = parseCurl(curlInput);
    if (!parsed) {
      alert("Invalid cURL command");
      return;
    }

    let payload = parsed.body || "";

    // Priority 1: Use specific parsed formData
    if (parsed.formData && Object.keys(parsed.formData).length > 0) {
      payload = JSON.stringify(parsed.formData, null, 2);
    }
    // Priority 2: Try to parse generic form-urlencoded body
    else if (
      parsed.body &&
      parsed.headers["Content-Type"] === "application/x-www-form-urlencoded"
    ) {
      const params = new URLSearchParams(parsed.body);
      const obj: Record<string, string> = {};
      for (const [key, value] of params.entries()) {
        obj[key] = value;
      }
      payload = JSON.stringify(obj, null, 2);
    }
    // Priority 3: Try to parse JSON body
    else if (
      parsed.body &&
      (parsed.body.trim().startsWith("{") || parsed.body.trim().startsWith("["))
    ) {
      // try to prettify JSON
      try {
        payload = JSON.stringify(JSON.parse(parsed.body), null, 2);
      } catch {
        // failed to prettify, keep as is
      }
    }
    // Priority 4: If still raw multipart string that failed parsing, warn user?
    else if (
      parsed.bodyType === "form-data" &&
      parsed.body &&
      parsed.body.includes("------")
    ) {
      // Failed to parse raw multipart body
      alert(
        "Warning: Could not automatically parse raw multipart body. Please enter form data manually.",
      );
      payload = "{}"; // Reset to empty JSON object to avoid syntax error
    }

    setForm((prev) => ({
      ...prev,
      url: parsed.url,
      method: parsed.method,
      headers: JSON.stringify(parsed.headers, null, 2),
      payload:
        typeof payload === "string"
          ? payload
          : JSON.stringify(payload, null, 2),
      bodyType: parsed.bodyType || "json",
      authorization: parsed.authorization || prev.authorization,
    }));
    setShowCurlImport(false);
  };

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
      bodyType: form.bodyType,
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

        <div className="curl-import-section" style={{ marginBottom: "20px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowCurlImport(!showCurlImport)}
            style={{
              marginBottom: "10px",
              backgroundColor: "#666",
              color: "white",
              padding: "5px 10px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {showCurlImport ? "Hide cURL Import" : "Import cURL"}
          </button>

          {showCurlImport && (
            <div className="curl-input-container">
              <textarea
                value={curlInput}
                onChange={(e) => setCurlInput(e.target.value)}
                placeholder="Paste cURL command here..."
                rows={4}
                style={{ width: "100%", marginBottom: "10px", padding: "8px" }}
              />
              <button
                type="button"
                className="btn"
                onClick={handleCurlImport}
                style={{ backgroundColor: "#28a745" }}
              >
                Parse & Fill
              </button>
            </div>
          )}
        </div>

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
          <label>Body Type</label>
          <div
            className="radio-group"
            style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
          >
            <label
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <input
                type="radio"
                name="bodyType"
                value="json"
                checked={form.bodyType === "json"}
                onChange={handleChange}
              />{" "}
              JSON
            </label>
            <label
              style={{ display: "flex", alignItems: "center", gap: "5px" }}
            >
              <input
                type="radio"
                name="bodyType"
                value="form-data"
                checked={form.bodyType === "form-data"}
                onChange={handleChange}
              />{" "}
              Form Data
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>
            Payload ({form.bodyType === "json" ? "JSON" : "Key-Value JSON"})
          </label>
          {form.bodyType === "form-data" && (
            <div style={{ marginBottom: "10px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowFileImport(!showFileImport)}
                style={{ fontSize: "0.8em", padding: "4px 8px" }}
              >
                + Add File
              </button>
              {showFileImport && (
                <div
                  style={{
                    marginTop: "5px",
                    padding: "10px",
                    border: "1px dashed #ccc",
                  }}
                >
                  <input type="file" onChange={handleFileChange} />
                  <p
                    style={{
                      fontSize: "0.8em",
                      margin: "5px 0 0",
                      color: "#666",
                    }}
                  >
                    Select a file to base64 encode and add to payload.
                  </p>
                </div>
              )}
            </div>
          )}
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
