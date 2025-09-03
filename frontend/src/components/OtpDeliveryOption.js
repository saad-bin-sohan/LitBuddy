// frontend/src/components/OtpDeliveryOption.js

import React, { useState } from 'react';
const OtpDeliveryOption = ({ onSelect }) => {
  const [method, setMethod] = useState('');

  const handleChange = (e) => {
    setMethod(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (method) onSelect(method);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        <input
          type="radio"
          name="otpMethod"
          value="email"
          checked={method === 'email'}
          onChange={handleChange}
        />
        Send OTP via Email
      </label>
      <label style={{ marginLeft: '1rem' }}>
        <input
          type="radio"
          name="otpMethod"
          value="phone"
          checked={method === 'phone'}
          onChange={handleChange}
        />
        Send OTP via Phone
      </label>
      <button type="submit" disabled={!method}>Send OTP</button>
    </form>
  );
};

export default OtpDeliveryOption;