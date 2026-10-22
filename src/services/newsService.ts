import { SchoolNewsPost } from '../types';

const NEWS_STORAGE_KEY = 'asosh_school_news_posts_v1';

export const INITIAL_SCHOOL_POSTS: SchoolNewsPost[] = [];

export function getAllPosts(): SchoolNewsPost[] {
  try {
    const raw = localStorage.getItem(NEWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading posts:', e);
  }
  return [];
}

export function saveAllPosts(posts: SchoolNewsPost[]): void {
  try {
    localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    console.error('Error saving posts:', e);
  }
}

export function getApprovedPosts(): SchoolNewsPost[] {
  const all = getAllPosts();
  return all.filter((p) => p.status === 'approved').sort((a, b) => b.timestamp - a.timestamp);
}

export function getPendingPosts(): SchoolNewsPost[] {
  const all = getAllPosts();
  return all.filter((p) => p.status === 'pending').sort((a, b) => b.timestamp - a.timestamp);
}

export function getMyPosts(authorId: string): SchoolNewsPost[] {
  const all = getAllPosts();
  return all.filter((p) => p.authorId === authorId).sort((a, b) => b.timestamp - a.timestamp);
}

export function submitPostForModeration(newPost: Omit<SchoolNewsPost, 'id' | 'createdAt' | 'timestamp' | 'likes' | 'likedBy' | 'status'>): SchoolNewsPost {
  const all = getAllPosts();
  const created: SchoolNewsPost = {
    ...newPost,
    id: 'post-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    createdAt: 'Только что',
    timestamp: Date.now(),
    likes: 0,
    likedBy: [],
    status: 'pending', // Sent for developer moderation
  };

  const updated = [created, ...all];
  saveAllPosts(updated);
  return created;
}

export function moderatePost(postId: string, action: 'approve' | 'reject', rejectionReason?: string): SchoolNewsPost[] {
  const all = getAllPosts();
  const updated = all.map((post) => {
    if (post.id === postId) {
      return {
        ...post,
        status: action === 'approve' ? ('approved' as const) : ('rejected' as const),
        rejectionReason: action === 'reject' ? rejectionReason || 'Не соответствует правилам школьного сообщества' : undefined,
        moderatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }
    return post;
  });
  saveAllPosts(updated);
  return updated;
}

export function togglePostLike(postId: string, userId: string): SchoolNewsPost[] {
  const all = getAllPosts();
  const updated = all.map((post) => {
    if (post.id === postId) {
      const likesSet = new Set(post.likedBy || []);
      if (likesSet.has(userId)) {
        likesSet.delete(userId);
      } else {
        likesSet.add(userId);
      }
      return {
        ...post,
        likedBy: Array.from(likesSet),
        likes: likesSet.size,
      };
    }
    return post;
  });
  saveAllPosts(updated);
  return updated;
}

export function deletePost(postId: string): SchoolNewsPost[] {
  const all = getAllPosts();
  const updated = all.filter((p) => p.id !== postId);
  saveAllPosts(updated);
  return updated;
}
