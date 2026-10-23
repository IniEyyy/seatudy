import { useContext, useState } from 'react';
import { FaCoins, FaWallet } from 'react-icons/fa';
import { AuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import './topUpBalance.css';

const QUICK_AMOUNTS = [10, 25, 50, 100];

function TopUpBalance() {
  const { token, user, setUser } = useContext(AuthContext);
  const { showToast } = useToast();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleTopUp = async (event) => {
    event.preventDefault();
    const value = Number(amount);

    if (!Number.isFinite(value) || value <= 0) {
      showToast('Enter an amount greater than zero.', 'error');
      return;
    }
    if (value > 10000) {
      showToast('The maximum top-up per transaction is $10,000.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/student/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Top-up failed');

      setUser((prev) => ({ ...prev, balance: data.balance }));
      setAmount('');
      showToast(`Added $${value.toFixed(2)} to your wallet.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page topup-page">
      <header className="topup-header">
        <span className="eyebrow">Wallet</span>
        <h1>Top up your balance</h1>
        <p>Add funds once, then purchase any course instantly. This is a demo wallet — no real payment is taken.</p>
      </header>

      <div className="topup-grid">
        <section className="topup-card">
          <div className="topup-card-head">
            <span className="topup-icon">
              <FaCoins />
            </span>
            <div>
              <h2>Add funds</h2>
              <p>Choose a quick amount or enter your own.</p>
            </div>
          </div>

          <div className="quick-amounts">
            {QUICK_AMOUNTS.map((value) => (
              <button key={value} type="button" onClick={() => setAmount(String(value))}>
                +${value}
              </button>
            ))}
          </div>

          <form onSubmit={handleTopUp} className="topup-form">
            <label htmlFor="topup-amount">Amount (USD)</label>
            <div className="topup-input-wrap">
              <span>$</span>
              <input
                id="topup-amount"
                type="number"
                min="0.01"
                max="10000"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <button className="btn topup-submit" type="submit" disabled={submitting}>
              {submitting ? 'Adding funds…' : 'Add to balance'}
            </button>
          </form>
        </section>

        <aside className="wallet-card">
          <span className="wallet-label">Current balance</span>
          <strong>${Number(user?.balance || 0).toFixed(2)}</strong>
          <div className="wallet-note">
            <FaWallet />
            <p>Your balance is stored on your Seatudy account and used when you buy a course.</p>
          </div>
          <ul>
            <li>Instant course checkout</li>
            <li>No card details required</li>
            <li>Admin-managed demo environment</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

export default TopUpBalance;
