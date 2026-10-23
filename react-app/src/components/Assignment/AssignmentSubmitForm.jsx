import { useRef, useState } from 'react';
import { FaCloudUploadAlt, FaFileAlt, FaTimes } from 'react-icons/fa';
import './assignmentSubmitForm.css';

function AssignmentSubmitForm({ token, courseId, assignmentId, onSuccess }) {
  const fileInput = useRef(null);
  const [submissionText, setSubmissionText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('content', submissionText);
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      const res = await fetch(`http://localhost:5000/api/student/courses/${courseId}/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to submit');

      setMessage({ tone: 'success', text: 'Submitted successfully.' });
      setSubmissionText('');
      setSelectedFiles([]);
      if (fileInput.current) fileInput.current.value = '';
      onSuccess?.();
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="asf">
      <label className="field">
        <span>Your answer</span>
        <textarea
          className="input"
          placeholder="Write your answer, add a link, or attach files below."
          value={submissionText}
          onChange={(e) => setSubmissionText(e.target.value)}
          required
        />
      </label>

      <div
        className={`asf-dropzone ${dragActive ? 'is-active' : ''}`}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => event.key === 'Enter' && fileInput.current?.click()}
      >
        <FaCloudUploadAlt />
        <strong>Attach files</strong>
        <span>Drag &amp; drop here, or click to browse</span>
        <input
          ref={fileInput}
          type="file"
          multiple
          onChange={handleFileChange}
          className="asf-file-input"
        />
      </div>

      {selectedFiles.length > 0 && (
        <ul className="asf-files">
          {selectedFiles.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <FaFileAlt />
              <span>{file.name}</span>
              <button
                type="button"
                className="asf-remove"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <FaTimes />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="asf-actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit assignment'}
        </button>
        {message && (
          <span className={`asf-message is-${message.tone}`} role="status">
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}

export default AssignmentSubmitForm;
