import React, { useState } from 'react';
import './CourseForm.css';

function CreateCourseForm({onClose, onUpdate}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    syllabus: '',
    category: '',
    price: 0,
    level: 'Beginner',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:5000/api/instructor/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create course');
      setForm({ title: '', description: '', syllabus: '', category: '', price: 0, level: 'Beginner' })

      alert('Course created!');
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-btn" onClick={onClose}>✕</button>
          <div className="form">
            <h3>Create New Course</h3>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                name="title"
                placeholder="Course Title"
                value={form.title}
                onChange={handleChange}
                required
              />
              <textarea
                name="description"
                placeholder="Course Description"
                value={form.description}
                onChange={handleChange}
                required
              ></textarea>
              <textarea
                name="syllabus"
                placeholder="Syllabus"
                value={form.syllabus}
                onChange={handleChange}
                required
              ></textarea>
              <input type="number" name="price" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
              <input type="text" name="category" placeholder='Category' onChange={handleChange} required />
              <select name="level" value={form.level} onChange={handleChange}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <button type="submit">Create Course</button>
              <button type="button" onClick={onClose}>Cancel</button>
            </form>
            {message && <p className="form-message">{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default CreateCourseForm;
