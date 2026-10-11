import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', city: 'Bamenda' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start getting clear health guidance in minutes.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-coral-soft text-coral text-sm px-3 py-2.5 rounded-xl">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
          <input
            required
            value={form.fullName}
            onChange={update('fullName')}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-cloud focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-mid text-[15px]"
            placeholder="Achu Ransom"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-cloud focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-mid text-[15px]"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={form.password}
              onChange={update('password')}
              className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-line bg-cloud focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-mid text-[15px]"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-teal-deep"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">City</label>
          <select
            value={form.city}
            onChange={update('city')}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-cloud focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-mid text-[15px]"
          >
            <option>Buea</option>
            <option>Bamenda</option>
            <option>Other</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-teal-deep text-white font-medium py-2.5 rounded-xl hover:bg-teal-mid transition-colors disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="text-center text-sm text-ink-soft mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-teal-deep font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
