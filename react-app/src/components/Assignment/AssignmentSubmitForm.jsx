import { useRef, useState } from 'react';
import { FaCloudUploadAlt, FaFileAlt, FaTimes } from 'react-icons/fa';
import { apiFetch, downloadFile } from '../../lib/api';
import './assignmentSubmitForm.css';


function AssignmentSubmitForm({ courseId, assignmentId, existingSubmission, onSuccess }) {
  const fileInput = useRef(null);
  const [submissionText, setSubmissionText] = useState(
    existingSubmission?.submission_content || ''
  );
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

  const handleDownload = async (file) => {
    try {
      await downloadFile(`/api/files/submissions/${file.id}`, file.file_name);
    } catch (err) {
      setMessage({ tone: 'error', text: err.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!submissionText.trim() && selectedFiles.length === 0) {
      setMessage({ tone: 'error', text: 'Add an answer or attach a file before submitting.' });
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append('content', submissionText);
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      const res = await apiFetch(`/api/student/courses/${courseId}/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to submit');

      setMessage({
        tone: 'success',
        text: data.resubmitted ? 'Resubmission saved.' : 'Submitted successfully.',
      });
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
      {existingSubmission && (
        <div className="asf-existing">
          <div className="asf-existing-head">
            <strong>Current submission</strong>
            <span>
              {existingSubmission.score != null
                ? `Score: ${Number(existingSubmission.score).toFixed(1)}/100`
                : 'Waiting for grading'}
            </span>
          </div>
          {existingSubmission.feedback && (
            <p className="asf-feedback">
              <strong>Instructor feedback:</strong> {existingSubmission.feedback}
            </p>
          )}
          {existingSubmission.files?.length > 0 && (
            <ul className="asf-existing-files">
              {existingSubmission.files.map((file) => (
                <li key={file.id}>
                  <button type="button" onClick={() => handleDownload(file)}>
                    <FaFileAlt /> {file.file_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="asf-note">
            Submitting again replaces your answer and attached files, and clears the previous grade.
          </p>
        </div>
      )}

      <label className="field">
        <span>{existingSubmission ? 'Update your answer' : 'Your answer'}</span>
        <textarea
          className="input"
          placeholder="Write your answer, add a link, or attach files below."
          value={submissionText}
          onChange={(e) => setSubmissionText(e.target.value)}
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
          {submitting
            ? 'Submitting...'
            : existingSubmission
              ? 'Resubmit assignment'
              : 'Submit assignment'}
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
