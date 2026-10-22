import React, { useState, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';

function TopUpBalance({onTopUpSuccess }) {
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const { token } = useContext(AuthContext);
  
  const handleTopUp = async (e) => {
    e.preventDefault();
    console.log('Token:', token);
    try {
      const res = await fetch('http://localhost:5000/api/student/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Top-up successful!');
        setAmount('');
        if (onTopUpSuccess) onTopUpSuccess(data.balance);
      } else {
        setMessage(data.message);
      }
    } catch (err) {
      console.error('Top-up failed:', err);
      setMessage('Top-up failed');
    }
  };

  return (
    <form onSubmit={handleTopUp} className="topup-form">
      <input
        type="number"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="Amount to Top Up"
        required
      />
      <button type="submit">Top Up</button>
      {message && <p>{message}</p>}
    </form>
  );
}

export default TopUpBalance;
