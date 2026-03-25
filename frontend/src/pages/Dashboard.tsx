import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, FolderHeart, Upload, Trash2, Sun, Moon } from 'lucide-react';
import { useRef } from 'react';
import { useStore } from '../store/useStore';
import { projectsApi } from '../api/client';

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const theme = useStore((state) => state.theme);
  const setTheme = useStore((state) => state.setTheme);
  const navigate = useNavigate();

  const [isDragging, setIsDragging] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.getAll();
      setProjects(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const res = await projectsApi.create({ title: newTitle });
      navigate(`/project/${res.data.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const processFile = async (file: File) => {
    try {
      if (!file.name.endsWith('.graphboard')) {
        alert('Пожалуйста, выберите файл .graphboard');
        return;
      }
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.format !== 'graphboard' || !data.title || !data.graph_data) {
        alert('Неверный формат файла. Ожидается .graphboard');
        return;
      }
      const res = await projectsApi.importBoard(data);
      navigate(`/project/${res.data.id}`);
    } catch (err) {
      console.error(err);
      alert('Ошибка при импорте файла');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleDelete = async (e: React.MouseEvent, id: number, title: string) => {
    e.stopPropagation();
    if (window.confirm(`Вы уверены, что хотите полностью удалить проект "${title}"? Это действие необратимо.`)) {
      try {
        await projectsApi.delete(id);
        setProjects(projects.filter(p => p.id !== id));
      } catch (err) {
        console.error(err);
        alert('Ошибка при удалении проекта');
      }
    }
  };

  return (
    <div className="dashboard-container">
      <header className="header" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FolderHeart color="var(--primary)" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Редактор графов</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div 
            onClick={() => navigate('/profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background 0.2s' }} 
            className="hover-bg-surface"
          >
            <img 
              src={user?.profile_data?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.profile_data?.name || user?.email || 'User')}&background=6366f1&color=fff&rounded=true&bold=true`} 
              alt="Avatar" 
              style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--surface-hover)' }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem', lineHeight: '1.2' }}>
                {user?.profile_data?.name || 'Пользователь'}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.2' }}>
                {user?.email}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="btn-icon" 
            title={theme === 'dark' ? "Светлая тема" : "Темная тема"}
            style={{ border: 'none', background: 'transparent' }}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={logout} className="btn-icon" title="Выйти">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main 
        className="main-content"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ position: 'relative' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1>Ваши проекты</h1>
            <p style={{ color: 'var(--text-muted)' }}>Управляйте и редактируйте совместные графы</p>
          </div>
          
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '8px' }}>
            <input 
              className="input-field" 
              placeholder="Название нового проекта..." 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{ width: '250px' }}
            />
            <button type="submit" className="btn" disabled={!newTitle.trim()}>
              <Plus size={20} /> Создать
            </button>
          </form>
        </div>

        {loading ? (
          <p>Загрузка проектов...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
            {projects.map(p => (
              <div 
                key={p.id} 
                className="glass-panel" 
                style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => navigate(`/project/${p.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 500, margin: 0 }}>{p.title}</h3>
                  <button 
                    onClick={(e) => handleDelete(e, p.id, p.title)}
                    className="btn-icon" 
                    title="Удалить"
                    style={{ padding: '4px', color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Последнее обновление: {new Date(p.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}

            {/* Import Card */}
            <div 
              className={`glass-panel ${isDragging ? 'dragging' : ''}`}
              style={{ 
                padding: '24px', 
                border: '2px dashed var(--border-color)', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: isDragging ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                borderColor: isDragging ? 'var(--primary)' : 'var(--border-color)'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} color={isDragging ? 'var(--primary)' : 'var(--text-muted)'} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, color: isDragging ? 'var(--primary)' : 'var(--text-main)' }}>Импорт доски</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Перетащите .graphboard или нажмите здесь</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".graphboard"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        )}

        {/* Global drag overlay */}
        {isDragging && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            background: 'rgba(99, 102, 241, 0.05)',
            border: '2px dashed var(--primary)',
            borderRadius: '16px',
            pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--primary)' }}>
              <Upload size={24} />
              <span style={{ fontWeight: 600 }}>Отпустите файл для импорта</span>
            </div>
          </div>
        )}
      </main>
    </div>

  );
}
