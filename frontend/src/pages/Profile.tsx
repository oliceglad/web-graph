import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { authApi } from '../api/client';
import { ArrowLeft, User as UserIcon, Building, Briefcase, Mail, Code, Globe, Lock } from 'lucide-react';

export default function Profile() {
  const user = useStore(state => state.user);
  const setUser = useStore(state => state.setUser);
  const language = useStore(state => state.language);
  const setLanguage = useStore(state => state.setLanguage);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    industry: '',
    role: '',
    email: '',
    avatar_url: '',
    password: '' // Only send if changed
  });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        name: user.profile_data?.name || '',
        organization: user.profile_data?.organization || '',
        industry: user.profile_data?.industry || '',
        role: user.profile_data?.role || '',
        avatar_url: user.profile_data?.avatar_url || ''
      }));
      if (user.profile_data?.language) {
        setLanguage(user.profile_data.language);
      }
    }
  }, [user, setLanguage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as 'en' | 'ru';
    setLanguage(newLang);
    setFormData(prev => ({ ...prev, language: newLang })); // queue for backend update too
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const payload: any = { ...formData, language };
    if (!payload.password) delete payload.password;

    try {
      const res = await authApi.updateMe(payload);
      setUser(res.data);
      setSuccessMsg(language === 'ru' ? 'Профиль успешно обновлен!' : 'Profile updated successfully!');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || (language === 'ru' ? 'Ошибка при обновлении' : 'Update failed'));
    } finally {
      setLoading(false);
    }
  };

  const isRu = language === 'ru';

  return (
    <div className="dashboard-container">
      <header className="header" style={{ height: '56px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/')} className="btn-icon">
            <ArrowLeft size={18} />
          </button>
          <h3 style={{ margin: 0 }}>{isRu ? 'Настройки профиля' : 'Profile Settings'}</h3>
        </div>
      </header>

      <main className="main-content" style={{ maxWidth: '800px' }}>
        <div className="glass-panel" style={{ padding: '32px' }}>
          
          {successMsg && <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', borderRadius: '8px' }}>{successMsg}</div>}
          {errorMsg && <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', borderRadius: '8px' }}>{errorMsg}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Avatar Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--surface-hover)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid var(--primary)', 
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
              }}>
                <img 
                  src={formData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || user?.email || 'User')}&background=6366f1&color=fff&bold=true&size=160`} 
                  alt="Avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>{isRu ? 'URL аватара (Изображение)' : 'Avatar URL (Image)'}</label>
                <input type="url" name="avatar_url" value={formData.avatar_url} onChange={handleChange} className="input-field" placeholder="https://..." />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Basic Info */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}><UserIcon size={16}/> {isRu ? 'Имя' : 'Name'}</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}><Mail size={16}/> {isRu ? 'Электронная почта' : 'Email'}</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" required />
              </div>

              {/* Professional details */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}><Building size={16}/> {isRu ? 'Организация' : 'Organization'}</label>
                <input type="text" name="organization" value={formData.organization} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}><Briefcase size={16}/> {isRu ? 'Индустрия' : 'Industry'}</label>
                <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}><Code size={16}/> {isRu ? 'Роль' : 'Role'}</label>
                <input type="text" name="role" value={formData.role} onChange={handleChange} className="input-field" />
              </div>
              
              {/* System details */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}><Globe size={16}/> {isRu ? 'Язык интерфейса' : 'Interface Language'}</label>
                <select value={language} onChange={handleLanguageChange} className="input-field" style={{ appearance: 'none' }}>
                  <option value="ru">Русский (Russian)</option>
                  <option value="en">English</option>
                </select>
              </div>

            </div>

            <hr style={{ borderColor: 'var(--border-color)', margin: '8px 0' }} />
            
            {/* Security */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)' }}><Lock size={16}/> {isRu ? 'Новый пароль (оставьте пустым чтобы не менять)' : 'New Password (leave blank to keep current)'}</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field" minLength={6} placeholder="********" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? (isRu ? 'Сохранение...' : 'Saving...') : (isRu ? 'Сохранить изменения' : 'Save Changes')}
              </button>
            </div>
            
          </form>
        </div>
      </main>
    </div>
  );
}
