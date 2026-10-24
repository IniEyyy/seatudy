import { useRef, useState } from 'react';
import { FaCloudUploadAlt, FaFileAlt, FaTimes } from 'react-icons/fa';
import { useToast } from '../../contexts/ToastContext';
import './addMaterialForm.css';
import { apiFetch } from '../../lib/api';


function AddMaterialForm({ courseId, onAdd }) {
  const { showToast } = useToast();
  const fileInput = useRef(null);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const token = localStorage.getItem('token');

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const removeFile = (index) => {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
    if (updatedFiles.length === 0 && fileInput.current) fileInput.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      showToast('Please select at least one file.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('content', description);
    files.forEach((file) => formData.append('files', file));

    setUploading(true);
    try {
      const res = await apiFetch(`/api/instructor/courses/${courseId}/materials`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      showToast('Materials uploaded successfully.', 'success');
      setFiles([]);
      setDescription('');
      if (fileInput.current) fileInput.current.value = '';
      onAdd();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="mf" onSubmit={handleSubmit} encType="multipart/form-data">
      <header className="mf-head">
        <div>
          <h3>Add material</h3>
          <p>Drop files here or pick them from your device. Multiple files are supported.</p>
        </div>
      </header>

      {files.length > 0 && (
        <ul className="mf-files">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <FaFileAlt />
              <span>{file.name}</span>
              <button
                type="button"
                className="mf-remove"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
              >
                <FaTimes />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className={`mf-dropzone ${dragActive ? 'is-active' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInput.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => event.key === 'Enter' && fileInput.current?.click()}
      >
        <FaCloudUploadAlt />
        <strong>Drag &amp; drop files here</strong>
        <span>or click to browse</span>
        <input
          ref={fileInput}
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
          accept=".pdf,.doc,.docx,.xlsx,.ppt,.pptx,.zip,.rar,.mp4,.avi,.mov,.jpg,.jpeg,.png,.c,.cpp,.py,.ipynb"
        />
      </div>

      <label className="field">
        <span>Description (optional)</span>
        <textarea
          className="input"
          placeholder="What should learners know about these files?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className="mf-actions">
        <button type="submit" className="btn" disabled={uploading}>
          {uploading ? 'Uploading…' : 'Upload material'}
        </button>
      </div>
    </form>
  );
}

export default AddMaterialForm;
