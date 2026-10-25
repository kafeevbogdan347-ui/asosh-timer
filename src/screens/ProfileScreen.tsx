import React, { useState, useEffect } from 'react';
import { UserProfile, CertificateItem, LanguageType, SoundProfileType } from '../types';
import {
  getMyProfile,
  saveMyProfile,
  getAllSearchableStudents,
  toggleFriend,
  addCertificateToProfile,
  removeCertificateFromProfile,
} from '../services/userService';
import { playSound, doVibro } from '../utils/audio';
import { compressImage } from '../utils/image';
import { isHideGradesInProfile } from '../utils/privacy';
import {
  User,
  Search,
  Users,
  Award,
  Medal,
  Sparkles,
  Trophy,
  Heart,
  Plus,
  Trash2,
  Edit3,
  Camera,
  Check,
  X,
  GraduationCap,
  Star,
  Flame,
  Gamepad2,
  BookOpen,
  ArrowLeft,
  Shield,
  EyeOff,
} from 'lucide-react';

const EMOJI_AVATARS = [
  '🎒', '💻', '⚡', '🚀', '🌟', '🎨', '🥋', '👑', '🔥', '📚',
  '🦁', '🐯', '🦊', '🐼', '🦄', '🦅', '🏆', '🎯', '🎸', '⚽',
  '🏀', '🎧', '💎', '🌙', '🌊', '🪐', '🤖', '👾', '✨', '🍀',
];

const CERT_CATEGORIES: { id: CertificateItem['category']; label: string; icon: string }[] = [
  { id: 'olympiad', label: 'Олимпиады (ВсОШ / Район)', icon: '🧠' },
  { id: 'sport', label: 'Спорт & Соревнования', icon: '⚽' },
  { id: 'science', label: 'Наука & Проекты', icon: '🔬' },
  { id: 'art', label: 'Творчество & Музыка', icon: '🎨' },
  { id: 'gto', label: 'ГТО (Знак отличия)', icon: '🏅' },
  { id: 'school', label: 'Школьные Грамоты АСОШ №2', icon: '🏛️' },
];

const CERT_LEVELS: { id: CertificateItem['level']; label: string }[] = [
  { id: 'school', label: 'Школьный уровень' },
  { id: 'district', label: 'Муниципальный / Районный' },
  { id: 'regional', label: 'Региональный / Областной' },
  { id: 'all-russian', label: 'Всероссийский / Федеральный' },
];

const CERT_PLACES: { id: CertificateItem['place']; label: string }[] = [
  { id: '1', label: '🥇 1 Место / Победитель' },
  { id: '2', label: '🥈 2 Место / Призёр' },
  { id: '3', label: '🥉 3 Место / Призёр' },
  { id: 'gold', label: '🥇 Золотой знак (ГТО)' },
  { id: 'silver', label: '🥈 Серебряный знак (ГТО)' },
  { id: 'laureate', label: '🌟 Лауреат / Гран-при' },
  { id: 'participant', label: '📜 Участник' },
];

interface ProfileScreenProps {
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
  onNavigateToChat?: () => void;
  onUnlockAchievement?: (id: string) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  lang,
  soundProfile,
  vibro,
  onShowToast,
  onNavigateToChat,
  onUnlockAchievement,
}) => {
  const [myProfile, setMyProfile] = useState<UserProfile>(() => getMyProfile());

  // Edit My Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(myProfile.username);
  const [editFullName, setEditFullName] = useState(myProfile.fullName);
  const [editClassName, setEditClassName] = useState(myProfile.className);
  const [editStatus, setEditStatus] = useState(myProfile.status);
  const [editBio, setEditBio] = useState(myProfile.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(myProfile.avatar);
  const [avatarType, setAvatarType] = useState<'emoji' | 'image'>(myProfile.avatarType || 'emoji');

  // Add Certificate modal state
  const [isAddingCert, setIsAddingCert] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certCategory, setCertCategory] = useState<CertificateItem['category']>('olympiad');
  const [certLevel, setCertLevel] = useState<CertificateItem['level']>('school');
  const [certPlace, setCertPlace] = useState<CertificateItem['place']>('1');
  const [certYear, setCertYear] = useState('2025–2026');
  const [certIssuer, setCertIssuer] = useState('');
  const [certSubject, setCertSubject] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [selectedUserModal, setSelectedUserModal] = useState<UserProfile | null>(null);

  // Средний балл по всем оценкам из калькулятора среднего балла; без оценок — прочерк
  const realGpa = (() => {
    try {
      const subjects: { grades: number[] }[] = JSON.parse(localStorage.getItem('asosh_gpa_subjects') || '[]');
      const all = subjects.flatMap((sub) => (Array.isArray(sub.grades) ? sub.grades : []));
      return all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2) : '—';
    } catch {
      return '—';
    }
  })();

  const allStudents = getAllSearchableStudents(myProfile);

  // Sync profile when opened
  useEffect(() => {
    const p = getMyProfile();
    setMyProfile(p);
    setEditUsername(p.username);
    setEditFullName(p.fullName);
    setEditClassName(p.className);
    setEditStatus(p.status);
    setEditBio(p.bio || '');
    setSelectedAvatar(p.avatar);
    setAvatarType(p.avatarType || 'emoji');
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim() || !editFullName.trim()) {
      onShowToast('⚠️ Заполните никнейм и имя!');
      return;
    }

    const updated: UserProfile = {
      ...myProfile,
      username: editUsername.trim(),
      fullName: editFullName.trim(),
      className: editClassName.trim() || '8А',
      status: editStatus.trim() || 'Ученик АСОШ №2 🎒',
      bio: editBio.trim(),
      avatar: selectedAvatar,
      avatarType,
    };

    saveMyProfile(updated);
    setMyProfile(updated);
    setIsEditing(false);
    playSound('coin', soundProfile);
    doVibro(vibro, 20);
    onShowToast('✅ Профиль успешно сохранен!');
    onUnlockAchievement?.('social_star');
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    compressImage(file, 256, 0.8)
      .then((dataUrl) => {
        setSelectedAvatar(dataUrl);
        setAvatarType('image');
        playSound('nav', soundProfile);
        onShowToast('📸 Новое фото выбрано! Нажмите «Сохранить»');
      })
      .catch(() => onShowToast('⚠️ Не удалось открыть фото'));
  };

  const handleAddCertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certTitle.trim()) {
      onShowToast('⚠️ Введите название грамоты!');
      return;
    }

    const updated = addCertificateToProfile(myProfile, {
      title: certTitle.trim(),
      category: certCategory,
      level: certLevel,
      place: certPlace,
      year: certYear.trim() || '2025–2026',
      issuer: certIssuer.trim() || 'АСОШ №2',
      subject: certSubject.trim() || undefined,
    });

    setMyProfile(updated);
    setIsAddingCert(false);
    setCertTitle('');
    setCertIssuer('');
    setCertSubject('');
    playSound('bell', soundProfile);
    doVibro(vibro, 30);
    onShowToast('🏆 Грамота добавлена в витрину достижений!');
  };

  const handleDeleteCert = (certId: string) => {
    const updated = removeCertificateFromProfile(myProfile, certId);
    setMyProfile(updated);
    playSound('nav', soundProfile);
    onShowToast('🗑️ Грамота удалена');
  };

  const handleToggleFriend = (targetId: string, name: string) => {
    const updated = toggleFriend(myProfile, targetId);
    setMyProfile(updated);
    playSound('coin', soundProfile);
    doVibro(vibro, 15);
    const isNowFriend = updated.friends.includes(targetId);
    onShowToast(isNowFriend ? `❤️ ${name} добавлен в друзья!` : `💔 ${name} удален из друзей`);
  };

  // Filtered students for search
  const filteredStudents = allStudents.filter((st) => {
    const matchesSearch =
      st.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.className.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass = classFilter === 'all' || st.className.startsWith(classFilter);
    return matchesSearch && matchesClass;
  });

  const friendsList = allStudents.filter((st) => myProfile.friends.includes(st.id));

  return (
    <div className="card screen-enter space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <User className="w-6 h-6 text-cyan-400" />
            <span>Школьные Аккаунты & Профиль</span>
          </h2>
          <p className="text-xs text-white/70">
            Твой профиль, средний балл и витрина грамот
          </p>
        </div>
      </div>

      {/* TAB 1: MY PROFILE */}
      {(
        <div className="space-y-4">
          {/* Profile Card Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-br from-cyan-950/60 via-slate-900/80 to-purple-950/60 rounded-3xl border border-cyan-400/30 shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Avatar Box */}
              <div className="relative group">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400 flex items-center justify-center text-4xl sm:text-5xl shadow-xl overflow-hidden">
                  {myProfile.avatarType === 'image' && myProfile.avatar.startsWith('data:') ? (
                    <img
                      src={myProfile.avatar}
                      alt={myProfile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{myProfile.avatar || '🎒'}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-cyan-500 text-slate-950 shadow-md hover:scale-110 transition-transform"
                  title="Изменить фото или аватарку"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="sensitive-data text-xl font-black text-white">{myProfile.fullName}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-bold">
                    @{myProfile.username}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                    {myProfile.className} класс
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                    🔒 Подтверждённый класс
                  </span>
                </div>

                {myProfile.status && (
                  <p className="text-xs font-medium text-cyan-200/90 italic">
                    «{myProfile.status}»
                  </p>
                )}

                {myProfile.bio && (
                  <p className="sensitive-data text-[11px] text-white/70 pt-1 leading-relaxed">
                    {myProfile.bio}
                  </p>
                )}

                <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="btn cyan text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Редактировать Профиль</span>
                  </button>
                  {onNavigateToChat && (
                    <button
                      type="button"
                      onClick={onNavigateToChat}
                      className="btn darkBtn text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <span>💬 В школьный чат</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
              <div className="p-2 bg-white/5 rounded-xl border border-white/8">
                <span className="sensitive-data block text-base font-black text-amber-300 font-mono">
                  {isHideGradesInProfile() ? '🔒' : realGpa}
                </span>
                <span className="text-[9px] text-white/60 uppercase">Ср. балл</span>
              </div>
              <div className="p-2 bg-white/5 rounded-xl border border-white/8">
                <span className="block text-base font-black text-cyan-300 font-mono">
                  {myProfile.certificates?.length || 0}
                </span>
                <span className="text-[9px] text-white/60 uppercase">Грамот</span>
              </div>
            </div>
          </div>

          {/* Где хранятся данные */}
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-white/70 leading-relaxed">
            🛡️ Профиль, оценки и ДЗ хранятся только на этом устройстве. Чтобы не потерять их при смене телефона,
            сделай резервную копию: <b className="text-white">Опции → Память и резервная копия</b>.
          </div>

          {/* Showcase of Certificates (Витрина грамот и наград) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  Витрина грамот, дипломов и побед ({myProfile.certificates?.length || 0})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingCert(true)}
                className="btn orange text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить грамоту</span>
              </button>
            </div>

            {myProfile.certificates && myProfile.certificates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {myProfile.certificates.map((cert) => {
                  const cat = CERT_CATEGORIES.find((c) => c.id === cert.category);
                  const isGold = cert.place === '1' || cert.place === 'gold';
                  return (
                    <div
                      key={cert.id}
                      className={`p-3 rounded-2xl border transition-all relative overflow-hidden flex items-start gap-3 ${
                        isGold
                          ? 'bg-amber-500/10 border-amber-400/40 shadow-sm'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-xl shrink-0">
                        {cat?.icon || '📜'}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <b className="text-xs font-bold text-white block truncate">
                          {cert.title}
                        </b>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                            {cert.place === 'gold'
                              ? '🥇 Золото'
                              : cert.place === '1'
                              ? '🥇 1 Место'
                              : cert.place === '2'
                              ? '🥈 2 Место'
                              : cert.place === '3'
                              ? '🥉 3 Место'
                              : '📜 Награда'}
                          </span>
                          <span className="text-[10px] text-white/60">
                            {cert.year} • {cert.issuer || 'АСОШ №2'}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCert(cert.id)}
                        className="absolute top-2.5 right-2.5 text-white/30 hover:text-rose-400 p-1 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center bg-white/5 rounded-2xl border border-white/10 text-xs text-white/60 space-y-2">
                <Award className="w-8 h-8 mx-auto text-white/30" />
                <p>У вас пока нет добавленных грамот. Добавьте свою первую победу!</p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* MODAL: EDIT PROFILE & AVATAR */}
      {isEditing && (
        <div
          className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsEditing(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-cyan-400/50 rounded-3xl p-5 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="text-base font-black text-cyan-300 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                <span>Редактирование Профиля</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-xl bg-white/10 text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              {/* Avatar Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-cyan-200 block">
                  Аватарка профиля:
                </label>

                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
                    {avatarType === 'image' && selectedAvatar.startsWith('data:') ? (
                      <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{selectedAvatar}</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="btn darkBtn text-xs py-1.5 px-3 inline-flex items-center gap-1.5 cursor-pointer">
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Загрузить своё фото</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-white/50">
                      Или выберите эмодзи-аватарку ниже
                    </p>
                  </div>
                </div>

                {/* Emoji Grid */}
                <div className="grid grid-cols-10 gap-1 p-2 bg-slate-950/80 rounded-xl border border-white/10 max-h-28 overflow-y-auto">
                  {EMOJI_AVATARS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(em);
                        setAvatarType('emoji');
                      }}
                      className={`text-lg p-1 rounded-lg transition-transform hover:scale-125 ${
                        selectedAvatar === em && avatarType === 'emoji'
                          ? 'bg-cyan-500/40 scale-110 border border-cyan-400'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Fields */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">Никнейм в чате и школе:</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="input"
                  placeholder="Например: Ivan_Pro"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">ФИО Ученика:</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="input"
                  placeholder="Иванов Иван"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">Класс:</label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="input"
                  placeholder="8А, 9Б, 11А..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">Статус / Девиз:</label>
                <input
                  type="text"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="input"
                  placeholder="Люблю учиться и перемены! 🎒"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">О себе (хобби, цели):</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={2}
                  className="input resize-none"
                  placeholder="Шахматы, волейбол, программирование..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn cyan flex-1 font-bold">
                  Сохранить изменения
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn darkBtn"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CERTIFICATE */}
      {isAddingCert && (
        <div
          className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsAddingCert(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-amber-400/50 rounded-3xl p-5 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Добавить Грамоту / Диплом</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingCert(false)}
                className="p-1 rounded-xl bg-white/10 text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCertSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">
                  Название достижения / конкурса:
                </label>
                <input
                  type="text"
                  value={certTitle}
                  onChange={(e) => setCertTitle(e.target.value)}
                  className="input"
                  placeholder="Например: Победитель олимпиады по физике"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/80">Категория:</label>
                  <select
                    value={certCategory}
                    onChange={(e) => setCertCategory(e.target.value as any)}
                    className="select"
                  >
                    {CERT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/80">Уровень:</label>
                  <select
                    value={certLevel}
                    onChange={(e) => setCertLevel(e.target.value as any)}
                    className="select"
                  >
                    {CERT_LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/80">Занятое место:</label>
                  <select
                    value={certPlace}
                    onChange={(e) => setCertPlace(e.target.value as any)}
                    className="select"
                  >
                    {CERT_PLACES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-white/80">Учебный год:</label>
                  <input
                    type="text"
                    value={certYear}
                    onChange={(e) => setCertYear(e.target.value)}
                    className="input"
                    placeholder="2025–2026"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">Кто выдал (Организатор):</label>
                <input
                  type="text"
                  value={certIssuer}
                  onChange={(e) => setCertIssuer(e.target.value)}
                  className="input"
                  placeholder="АСОШ №2 / Минспорт / РДК Аргаяш"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn orange flex-1 font-bold">
                  Сохранить в портфолио
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCert(false)}
                  className="btn darkBtn"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW OTHER USER'S PROFILE */}
      {selectedUserModal && (
        <div
          className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedUserModal(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-cyan-400/50 rounded-3xl p-5 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-cyan-400 uppercase font-mono">
                Профиль Ученика АСОШ №2
              </span>
              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="p-1 rounded-xl bg-white/10 text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="w-20 h-20 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-4xl shrink-0 overflow-hidden">
                {selectedUserModal.avatarType === 'image' && selectedUserModal.avatar.startsWith('data:') ? (
                  <img src={selectedUserModal.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{selectedUserModal.avatar}</span>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  <h3 className="text-lg font-black text-white">{selectedUserModal.fullName}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                    {selectedUserModal.className}
                  </span>
                  {selectedUserModal.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                      {selectedUserModal.badge}
                    </span>
                  )}
                </div>

                <div className="text-xs text-white/60 font-mono">@{selectedUserModal.username}</div>
                {selectedUserModal.status && <p className="text-xs text-cyan-200 italic pt-1">«{selectedUserModal.status}»</p>}
                {selectedUserModal.bio && (
                  <p className="text-[11px] text-white/70 pt-1 leading-relaxed">
                    {selectedUserModal.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/8">
                <span className="block text-base font-black text-amber-300 font-mono">
                  {selectedUserModal.gpa.toFixed(2)} ⭐
                </span>
                <span className="text-[9px] text-white/60 uppercase">Ср. балл</span>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/8">
                <span className="block text-base font-black text-cyan-300 font-mono">
                  {selectedUserModal.certificates?.length || 0} 📜
                </span>
                <span className="text-[9px] text-white/60 uppercase">Грамот</span>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl border border-white/8">
                <span className="block text-base font-black text-purple-300 font-mono">
                  {selectedUserModal.gamesScore || 0} 🎮
                </span>
                <span className="text-[9px] text-white/60 uppercase">Очков игр</span>
              </div>
            </div>

            {/* Other user's certificates */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Грамоты и награды ({selectedUserModal.certificates?.length || 0})</span>
              </h4>

              {selectedUserModal.certificates && selectedUserModal.certificates.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedUserModal.certificates.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-400/30 text-xs flex items-center gap-2.5"
                    >
                      <span className="text-lg">📜</span>
                      <div className="flex-1 min-w-0">
                        <b className="text-white block truncate">{c.title}</b>
                        <span className="text-[10px] text-amber-300">
                          {c.year} • {c.issuer || 'АСОШ №2'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/50 text-center py-3 bg-white/5 rounded-xl">
                  Список наград пуст
                </p>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex gap-2 pt-2">
              {selectedUserModal.id !== myProfile.id && (
                <button
                  type="button"
                  onClick={() => handleToggleFriend(selectedUserModal.id, selectedUserModal.fullName)}
                  className={`btn flex-1 text-xs py-2 ${
                    myProfile.friends.includes(selectedUserModal.id)
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'cyan'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 inline mr-1 ${
                      myProfile.friends.includes(selectedUserModal.id) ? 'fill-rose-400' : ''
                    }`}
                  />
                  {myProfile.friends.includes(selectedUserModal.id) ? 'Удалить из друзей' : 'Добавить в друзья'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedUserModal(null)}
                className="btn darkBtn flex-1"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
