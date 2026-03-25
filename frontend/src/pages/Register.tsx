import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { authApi } from '../api/client';
import { useStore } from '../store/useStore';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setToken = useStore((state) => state.setToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Register
      await authApi.register({ email, password });
      // 2. Login to get token
      const loginRes = await authApi.login({ email, password });
      setToken(loginRes.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-form">
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <UserPlus size={48} color="var(--primary)" />
          <h2 style={{ marginTop: '1rem' }}>Создать аккаунт</h2>
          <p style={{ color: 'var(--text-muted)' }}>Начните создавать совместные графы</p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: 'var(--danger)', borderRadius: '8px', color: 'white' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>Email</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>Пароль</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Создание...' : 'Регистрация'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Уже есть аккаунт? </span>
          <Link to="/login">Войти здесь</Link>
        </div>
      </div>
    </div>
  );
}
