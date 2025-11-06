## CV Scan API — Next.js Frontend Integration Guide

This guide shows how to call the CV Scan API from a Next.js app.

### Endpoint

- URL: `/api/cv-scan/scan`
- Method: `POST`
- Auth: Requires JWT (Authorization header) and API key header
- Content-Type: `multipart/form-data`

### Required Form Fields

- `resume`: PDF file (max 10MB)
- `jobRole`: string
- `jobDescription`: string

### Required Headers

- `Authorization`: `Bearer <JWT_TOKEN>`
- `x-api-key`: `<YOUR_API_KEY>` (server enforces API key globally)

### Response (success)

```json
{
  "status": "SUCCESS",
  "data": {
    "candidateName": "...",
    "overallScore": 82,
    "atsCompatibility": { "score": 80, "rating": "Good", "description": "..." },
    "scoreBreakdown": { "keywordScore": 78, "formatScore": 85 },
    "keywordAnalysis": { ... },
    "industryAlignment": { ... },
    "skillAlignment": { ... },
    "recruiterTips": { ... },
    "recommendations": [ ... ],
    "videoSuggestions": { ... },
    "extractedData": { ... },
    "jobRole": "<echoed jobRole>"
  }
}
```

### Response (common errors)

- 400: invalid content type, missing fields, invalid file, or PDF parse failure
- 401: invalid API key (OpenAI)
- 403: no `cvScanTokens` remaining
- 429: OpenAI rate limit
- 500: generic server error / JSON parsing error

---

## Example: React component (Next.js App Router)

```tsx
"use client";
import { useState } from "react";

export default function CVScanUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!file) {
      setError("Please choose a PDF resume");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobRole", jobRole);
      formData.append("jobDescription", jobDescription);

      const jwt = localStorage.getItem("token"); // adapt to your auth storage
      const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY; // ensure exposed via NEXT_PUBLIC_

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cv-scan/scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt ?? ""}`,
          "x-api-key": apiKey ?? "",
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to scan CV");
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <input
        type="text"
        placeholder="Job Role"
        value={jobRole}
        onChange={(e) => setJobRole(e.target.value)}
      />
      <textarea
        placeholder="Job Description"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Scanning..." : "Scan CV"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {result && (
        <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </form>
  );
}
```

### Example with Axios

```ts
import axios from "axios";

async function scanCV({ file, jobRole, jobDescription }: { file: File; jobRole: string; jobDescription: string; }) {
  const formData = new FormData();
  formData.append("resume", file);
  formData.append("jobRole", jobRole);
  formData.append("jobDescription", jobDescription);

  const jwt = localStorage.getItem("token");
  const apiKey = process.env.NEXT_PUBLIC_BACKEND_API_KEY;

  const res = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/cv-scan/scan`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${jwt ?? ""}`,
        "x-api-key": apiKey ?? "",
        // Note: Axios sets proper multipart boundaries automatically when FormData is used
      },
      maxBodyLength: 10 * 1024 * 1024, // 10MB safety
    }
  );

  return res.data; // { status: 'SUCCESS', data: {...} }
}
```

### Environment Variables (Next.js)

Add these to `.env.local` in your Next.js app:

```
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
NEXT_PUBLIC_BACKEND_API_KEY=your_backend_x_api_key
```

### Notes

- Ensure the user is authenticated and you have a valid JWT for the `Authorization` header.
- Users must have sufficient `cvScanTokens`; otherwise the API returns 403.
- Only PDF files are accepted; scanned images without selectable text may fail parsing.
- The backend enforces a global `x-api-key` header; requests without it will be rejected.


