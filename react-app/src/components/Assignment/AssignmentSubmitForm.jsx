import React, { useState } from 'react';
import './assignmentSubmitForm.css';

function AssignmentSubmitForm({ token, courseId, assignmentId, onSuccess }) {
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState('');

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('content', submissionText);
    selectedFiles.forEach(file => formData.append('files', file));

    try {
      const res = await fetch(`http://localhost:5000/api/student/courses/${courseId}/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Submitted successfully!');
        setSubmissionText('');
        setSelectedFiles([]);
        onSuccess?.();
      } else {
        setMessage(data.message || 'Failed to submit');
      }
    } catch {
      setMessage('Submission failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="assignment-form">
      <h4>Submit Your Answer</h4>
      <textarea
        placeholder="Your answer here..."
        value={submissionText}
        onChange={e => setSubmissionText(e.target.value)}
        required
      ></textarea>

      <div
        className={`drag-drop-area ${dragActive ? 'active' : ''}`}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <p>Drag & drop files here or click to browse</p>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="file-input"
        />
      </div>

      {selectedFiles.length > 0 && (
        <ul className="file-preview-list">
          {selectedFiles.map((file, index) => (
            <li key={index} className="file-preview-item">
              <span>{file.name}</span>
              <button
                type="button"
                className="remove-file-btn"
                onClick={() => removeFile(index)}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="submit">Submit Assignment</button>
      {message && <p className="submission-message">{message}</p>}
    </form>
  );
}

export default AssignmentSubmitForm;
