// frontend/src/pages/Register.js

import React, { useState, useContext } from 'react';
import { register } from '../api/authApi';
import { AuthContext } from '../contexts/AuthContext';

const Register = () => {
  const { setUser } = useContext(AuthContext);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    age: '',
    gender: '',
    acceptedTerms: false
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.acceptedTerms) {
      setError('You must accept the Terms and Conditions to register.');
      return;
    }

    try {
      const data = await register(form);
      localStorage.setItem('token', data.token);
      setUser(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required /><br />
        <input name="email" placeholder="Email" type="email" value={form.email} onChange={handleChange} required /><br />
        <input
  name="phone"
  placeholder="Phone (Optional)"
  type="tel"
  value={form.phone}
  onChange={handleChange}
/><br />
        <div style={{ position: 'relative' }}>
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <br />
          <button type="button" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} required />
        <br />
        <select name="gender" value={form.gender} onChange={handleChange} required>
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
<br />
        <label>
          <input
            name="acceptedTerms"
            type="checkbox"
            checked={form.acceptedTerms}
            onChange={handleChange}
          />
          I agree to the Terms and Conditions
        </label>
        <br></br>
        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
