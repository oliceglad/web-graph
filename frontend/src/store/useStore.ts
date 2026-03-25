import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  profile_data: any;
}

interface AppState {
  user: User | null;
  token: string | null;
  language: 'ru' | 'en';
  theme: 'light' | 'dark';
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLanguage: (lang: 'ru' | 'en') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  language: (localStorage.getItem('language') as 'ru' | 'en') || 'ru',
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  setUser: (user) => set({ user }),
  setLanguage: (lang) => {
    localStorage.setItem('language', lang);
    set({ language: lang });
  },
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  }
}));
