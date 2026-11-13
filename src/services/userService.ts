import { UserProfile, CertificateItem } from '../types';

const PROFILE_KEY = 'asosh_user_profile_v1';
const ALL_USERS_REGISTRY_KEY = 'asosh_registered_users_registry_v1';

import { isDevPanelUnlocked, parseRegisteredTimestamp } from '../utils/profileBadges';

export function getRealGpaNumber(): number {
  try {
    const subjects: { grades: number[] }[] = JSON.parse(localStorage.getItem('asosh_gpa_subjects') || '[]');
    const all = subjects.flatMap((sub) => (Array.isArray(sub.grades) ? sub.grades : []));
    if (!all.length) return 0;
    return Number((all.reduce((a, b) => a + b, 0) / all.length).toFixed(2));
  } catch {
    return 0;
  }
}

export function getRealHwDoneCount(): number {
  try {
    const hw = JSON.parse(localStorage.getItem('asosh_hw_v105') || localStorage.getItem('asosh_hw_v11') || '[]');
    if (!Array.isArray(hw)) return 0;
    return hw.filter((item: any) => Boolean(item?.done)).length;
  } catch {
    return 0;
  }
}

export function getMyProfile(defaultName = 'Ученик', defaultClass = '8А'): UserProfile {
  const devUnlocked = isDevPanelUnlocked();
  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const guaranteedId = parsed.id || ('user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9));
      const regTs =
        parseRegisteredTimestamp(parsed.registeredAt, parsed.registeredDate, guaranteedId) || Date.now();
      const profile: UserProfile = {
        ...parsed,
        id: guaranteedId,
        certificates: parsed.certificates || [],
        friends: parsed.friends || [],
        registeredAt: regTs,
        registeredDate: parsed.registeredDate || new Date(regTs).toLocaleDateString('ru-RU'),
        isDev: devUnlocked || Boolean(parsed.isDev),
      };
      if (!parsed.id || !parsed.registeredAt || (devUnlocked && !parsed.isDev)) {
        saveMyProfile(profile);
      }
      return profile;
    }
  } catch (e) {
    console.warn('Error reading profile:', e);
  }

  // Initial creation based on app state
  const storedStudent = localStorage.getItem('asosh_student_v11') || localStorage.getItem('asosh_student_v105') || defaultName;
  const storedClass = localStorage.getItem('asosh_class_v11') || localStorage.getItem('asosh_class_v105') || defaultClass;
  const defaultUniqueUsername = storedStudent && storedStudent !== 'Ученик'
    ? storedStudent
    : `Ученик_${Math.floor(1000 + Math.random() * 9000)}`;
  const storedChatName = localStorage.getItem('asosh_chat_username') || defaultUniqueUsername;
  const storedAvatar = localStorage.getItem('asosh_chat_avatar') || '🎒';
  const nowTs = Date.now();

  const newProfile: UserProfile = {
    id: 'user_' + nowTs + '_' + Math.random().toString(36).substring(2, 9),
    username: storedChatName,
    fullName: storedStudent,
    className: storedClass,
    avatar: storedAvatar,
    avatarType: 'emoji',
    status: '',
    bio: '',
    gpa: getRealGpaNumber(),
    hwDoneCount: getRealHwDoneCount(),
    gamesScore: 0,
    certificates: [],
    friends: [],
    registeredDate: new Date(nowTs).toLocaleDateString('ru-RU'),
    registeredAt: nowTs,
    isDev: devUnlocked,
    badge: devUnlocked ? '🛠️ Разработчик' : '🎒 Ученик',
  };

  saveMyProfile(newProfile);
  return newProfile;
}

export function saveMyProfile(profile: UserProfile): void {
  try {
    const devUnlocked = isDevPanelUnlocked();
    const regTs =
      parseRegisteredTimestamp(profile.registeredAt, profile.registeredDate, profile.id) || Date.now();
    const normalized: UserProfile = {
      ...profile,
      registeredAt: regTs,
      registeredDate: profile.registeredDate || new Date(regTs).toLocaleDateString('ru-RU'),
      isDev: devUnlocked || Boolean(profile.isDev),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
    // Keep chat username and avatar in sync with profile
    localStorage.setItem('asosh_chat_username', normalized.username);
    localStorage.setItem('asosh_chat_avatar', normalized.avatar);
    localStorage.setItem('asosh_student_v11', normalized.fullName);
    localStorage.setItem('asosh_class_v11', normalized.className);

    // Update in all users registry
    registerOrUpdateUser(normalized);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('asosh-profile-updated'));
    }
  } catch (e) {
    console.error('Failed to save profile:', e);
  }
}

export function getAllSearchableStudents(myProfile: UserProfile): UserProfile[] {
  try {
    const raw = localStorage.getItem(ALL_USERS_REGISTRY_KEY);
    let list: UserProfile[] = [];
    if (raw) {
      list = JSON.parse(raw);
    }
    if (!Array.isArray(list)) list = [];
    
    // Ensure my profile is included and up-to-date
    const filtered = list.filter((u) => u.id !== myProfile.id);
    filtered.unshift(myProfile);
    localStorage.setItem(ALL_USERS_REGISTRY_KEY, JSON.stringify(filtered));
    return filtered;
  } catch {
    return [myProfile];
  }
}

export function registerOrUpdateUser(user: UserProfile): void {
  try {
    const raw = localStorage.getItem(ALL_USERS_REGISTRY_KEY);
    let list: UserProfile[] = [];
    if (raw) {
      list = JSON.parse(raw);
    }
    if (!Array.isArray(list)) list = [];
    const index = list.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      list[index] = user;
    } else {
      list.unshift(user);
    }
    localStorage.setItem(ALL_USERS_REGISTRY_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Error updating registry:', e);
  }
}

export function toggleFriend(myProfile: UserProfile, friendId: string): UserProfile {
  const currentFriends = new Set(myProfile.friends || []);
  if (currentFriends.has(friendId)) {
    currentFriends.delete(friendId);
  } else {
    currentFriends.add(friendId);
  }
  const updated = {
    ...myProfile,
    friends: Array.from(currentFriends),
  };
  saveMyProfile(updated);
  return updated;
}

export function addCertificateToProfile(myProfile: UserProfile, cert: Omit<CertificateItem, 'id'>): UserProfile {
  const newCert: CertificateItem = {
    ...cert,
    id: 'cert-' + Date.now(),
    dateAdded: new Date().toISOString().split('T')[0],
  };

  const updated: UserProfile = {
    ...myProfile,
    certificates: [newCert, ...(myProfile.certificates || [])],
  };
  saveMyProfile(updated);
  return updated;
}

export function removeCertificateFromProfile(myProfile: UserProfile, certId: string): UserProfile {
  const updated: UserProfile = {
    ...myProfile,
    certificates: (myProfile.certificates || []).filter((c) => c.id !== certId),
  };
  saveMyProfile(updated);
  return updated;
}

