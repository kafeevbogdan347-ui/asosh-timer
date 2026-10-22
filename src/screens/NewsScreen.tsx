import React, { useState, useEffect } from 'react';
import { SchoolNewsPost, LanguageType, SoundProfileType } from '../types';
import {
  getApprovedPosts,
  getMyPosts,
  submitPostForModeration,
  togglePostLike,
} from '../services/newsService';
import { getMyProfile } from '../services/userService';
import { playSound, doVibro } from '../utils/audio';
import {
  Newspaper,
  Plus,
  Heart,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Clock,
  Send,
  X,
  Image as ImageIcon,
  Tag,
  AlertCircle,
  CheckCircle2,
  Filter,
} from 'lucide-react';

const CATEGORIES: { id: SchoolNewsPost['category'] | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Все новости', icon: '⚡' },
  { id: 'announcement', label: 'Объявления', icon: '📢' },
  { id: 'olympiad', label: 'Олимпиады & Учеба', icon: '🧠' },
  { id: 'canteen', label: 'Столовая & Меню', icon: '🥐' },
  { id: 'sport', label: 'Спорт & Матчи', icon: '⚽' },
  { id: 'creative', label: 'Творчество & Конкурсы', icon: '🎨' },
  { id: 'meme', label: 'Школьный Юмор', icon: '😄' },
];

interface NewsScreenProps {
  lang: LanguageType;
  soundProfile: SoundProfileType;
  vibro: boolean;
  onShowToast: (msg: string) => void;
  onOpenDevModal?: () => void;
}

export const NewsScreen: React.FC<NewsScreenProps> = ({
  lang,
  soundProfile,
  vibro,
  onShowToast,
  onOpenDevModal,
}) => {
  const [posts, setPosts] = useState<SchoolNewsPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<SchoolNewsPost['category'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'feed' | 'my_posts'>('feed');

  // Create post modal
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<SchoolNewsPost['category']>('announcement');
  const [postImageUrl, setPostImageUrl] = useState('');

  const myProfile = getMyProfile();

  const loadPosts = () => {
    if (viewMode === 'feed') {
      setPosts(getApprovedPosts());
    } else {
      setPosts(getMyPosts(myProfile.id));
    }
  };

  useEffect(() => {
    loadPosts();
  }, [viewMode]);

  const handleLike = (postId: string) => {
    const updated = togglePostLike(postId, myProfile.id);
    playSound('coin', soundProfile);
    doVibro(vibro, 15);
    loadPosts();
  };

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      onShowToast('⚠️ Заполните заголовок и текст поста!');
      return;
    }

    submitPostForModeration({
      authorId: myProfile.id,
      authorName: myProfile.fullName,
      authorClass: myProfile.className,
      authorAvatar: myProfile.avatar,
      authorAvatarType: myProfile.avatarType,
      title: postTitle.trim(),
      content: postContent.trim(),
      category: postCategory,
      imageUrl: postImageUrl.trim() || undefined,
    });

    setIsCreatingPost(false);
    setPostTitle('');
    setPostContent('');
    setPostImageUrl('');
    playSound('bell', soundProfile);
    doVibro(vibro, 30);
    onShowToast('🛡️ Пост отправлен на модерацию разработчику!');
    setViewMode('my_posts');
  };

  const filteredPosts = posts.filter((p) => {
    if (activeCategory === 'all') return true;
    return p.category === activeCategory;
  });

  return (
    <div className="card screen-enter space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-white/10">
        <div>
          <h2 className="text-xl font-black text-cyan-300 flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-cyan-400" />
            <span>Школьная Лента Новостей</span>
          </h2>
          <p className="text-xs text-white/70">
            События, объявления, столовая и репортажи МОУ АСОШ №2 с. Аргаяш
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingPost(true)}
          className="btn cyan text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Предложить Пост</span>
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('feed')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'feed'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            🔥 Главная лента
          </button>
          <button
            type="button"
            onClick={() => setViewMode('my_posts')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'my_posts'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            📋 Мои публикации
          </button>
        </div>

        {viewMode === 'my_posts' && (
          <span className="text-[11px] text-amber-300 font-medium">
            ⏳ Проверяются разработчиком
          </span>
        )}
      </div>

      {/* Categories Bar */}
      {viewMode === 'feed' && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                playSound('nav', soundProfile);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-bold transition-all shrink-0 border ${
                activeCategory === cat.id
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <span>{cat.icon}</span> <span className="ml-1">{cat.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Moderation notice banner */}
      <div className="p-3 bg-gradient-to-r from-blue-950/40 to-indigo-950/40 rounded-2xl border border-blue-400/30 flex items-center justify-between text-xs text-blue-200 gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>Все предложенные посты проходят модерацию разработчиком перед публикацией в ленту.</span>
        </div>
        {onOpenDevModal && localStorage.getItem('asosh_dev_unlocked') === 'true' && (
          <button
            type="button"
            onClick={onOpenDevModal}
            className="text-[10px] text-cyan-300 underline shrink-0 hover:text-cyan-100 font-bold"
          >
            🛡️ Меню модератора
          </button>
        )}
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            const isLiked = post.likedBy?.includes(myProfile.id);
            const cat = CATEGORIES.find((c) => c.id === post.category);

            return (
              <div
                key={post.id}
                className="p-4 bg-white/5 hover:bg-white/[0.07] rounded-3xl border border-white/10 transition-all space-y-3 relative overflow-hidden"
              >
                {/* Author Info */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                      {post.authorAvatarType === 'image' && post.authorAvatar?.startsWith('data:') ? (
                        <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{post.authorAvatar || '🎒'}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <b className="text-xs font-bold text-white">{post.authorName}</b>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                          {post.authorClass}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/50">{post.createdAt}</span>
                    </div>
                  </div>

                  {/* Status badge for My Posts */}
                  {viewMode === 'my_posts' && (
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${
                        post.status === 'approved'
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : post.status === 'rejected'
                          ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                          : 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
                      }`}
                    >
                      {post.status === 'approved'
                        ? '✅ Опубликован'
                        : post.status === 'rejected'
                        ? '❌ Отклонён'
                        : '⏳ На модерации'}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {cat && (
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                        {cat.icon} {cat.label}
                      </span>
                    )}
                    <h3 className="text-sm font-black text-white">{post.title}</h3>
                  </div>

                  <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">
                    {post.content}
                  </p>

                  {post.imageUrl && (
                    <div className="mt-2 rounded-2xl overflow-hidden border border-white/10 max-h-64 bg-black/40">
                      <img
                        src={post.imageUrl}
                        alt="Post media"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {post.status === 'rejected' && post.rejectionReason && (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-400/30 rounded-xl text-xs text-rose-200 mt-2">
                      <b>Причина отклонения:</b> {post.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                {post.status === 'approved' && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                        isLiked
                          ? 'bg-rose-500/20 border-rose-400 text-rose-300 font-bold'
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-rose-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400' : ''}`} />
                      <span>{post.likes || 0}</span>
                    </button>

                    <span className="text-[10px] text-white/40 font-mono">
                      МОУ АСОШ №2
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-10 text-center bg-white/5 rounded-3xl border border-white/10 text-xs text-white/60 space-y-2">
            <Newspaper className="w-10 h-10 mx-auto text-white/30" />
            <p>В этой категории пока нет новостей. Предложите свою новость первой!</p>
          </div>
        )}
      </div>

      {/* CREATE POST MODAL */}
      {isCreatingPost && (
        <div
          className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsCreatingPost(false)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-cyan-400/50 rounded-3xl p-5 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="text-base font-black text-cyan-300 flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <span>Предложить новость / пост в ленту</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreatingPost(false)}
                className="p-1 rounded-xl bg-white/10 text-white/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePostSubmit} className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-2xl text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Пост поступит в меню модерации разработчику. После одобрения он появится в ленте для всей школы!
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">Категория:</label>
                <select
                  value={postCategory}
                  onChange={(e) => setPostCategory(e.target.value as any)}
                  className="select"
                >
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">Заголовок новости:</label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="input"
                  placeholder="Например: Сбор макулатуры в эту среду!"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">Текст сообщения:</label>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={4}
                  className="input resize-none"
                  placeholder="Подробно расскажите о событии, месте и времени..."
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/80">Ссылка на изображение (по желанию):</label>
                <input
                  type="url"
                  value={postImageUrl}
                  onChange={(e) => setPostImageUrl(e.target.value)}
                  className="input"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn cyan flex-1 font-bold">
                  🚀 Отправить на модерацию
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingPost(false)}
                  className="btn darkBtn"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
