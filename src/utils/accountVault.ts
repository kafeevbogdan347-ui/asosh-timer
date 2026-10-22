import { AccountVault, LanguageType } from '../types';
import { getMyProfile, saveMyProfile } from '../services/userService';

const VAULT_KEY = 'asosh_account_vault_v2';

// Default initial state
const defaultVault: AccountVault = {
  registered: false,
  studentName: '',
  parentName: '',
  cls: '',
  shift: '1',
  subGroup: 1,
  lang: 'ru',
  authProvider: 'guest',
  updatedAt: Date.now(),
};

/**
 * Loads account data with multi-layer fallback to prevent ANY account reset on update or reload.
 */
export function loadAccountVault(): AccountVault {
  let vault: Partial<AccountVault> = {};

  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (raw) {
      vault = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Vault parse fallback:', e);
  }

  // Multi-key resilient migration: check all historical keys
  const storedClass =
    vault.cls ||
    localStorage.getItem('asosh_class_v105') ||
    localStorage.getItem('asosh_class_v11') ||
    localStorage.getItem('class') ||
    '';

  const storedStudent =
    vault.studentName ||
    localStorage.getItem('studentName') ||
    localStorage.getItem('asosh_student_v11') ||
    localStorage.getItem('asosh_student_v105') ||
    localStorage.getItem('asosh_chat_username') ||
    '';

  const storedParent =
    vault.parentName ||
    localStorage.getItem('parentName') ||
    '';

  const storedShift =
    vault.shift ||
    localStorage.getItem('asosh_shift_v105') ||
    localStorage.getItem('shift') ||
    '1';

  const storedSubGroup =
    vault.subGroup ||
    Number(localStorage.getItem('asosh_subgroup_v105') || localStorage.getItem('subgroup') || 1);

  const storedLang =
    vault.lang ||
    (localStorage.getItem('asosh_lang_v105') || localStorage.getItem('lang') || 'ru') as LanguageType;

  // Determine if user has previously registered
  const isRegisteredFlag =
    vault.registered ||
    localStorage.getItem('asosh_registered_v105') === 'true' ||
    localStorage.getItem('registered_v104') === 'true' ||
    localStorage.getItem('asosh_registered_v2') === 'true' ||
    Boolean(storedClass && storedStudent);

  const authProvider =
    vault.authProvider ||
    (localStorage.getItem('asosh_auth_provider') as any) ||
    'guest';

  const authEmail =
    vault.authEmail ||
    localStorage.getItem('asosh_auth_email') ||
    undefined;

  const authPhotoUrl =
    vault.authPhotoUrl ||
    localStorage.getItem('asosh_auth_photo') ||
    undefined;

  const authUid =
    vault.authUid ||
    localStorage.getItem('asosh_auth_uid') ||
    undefined;

  const fullVault: AccountVault = {
    registered: isRegisteredFlag,
    studentName: storedStudent,
    parentName: storedParent,
    cls: storedClass,
    shift: storedShift,
    subGroup: storedSubGroup,
    lang: storedLang,
    authProvider,
    authEmail,
    authPhotoUrl,
    authUid,
    authVerified: Boolean(vault.authVerified || authProvider === 'google' || authProvider === 'apple'),
    updatedAt: vault.updatedAt || Date.now(),
  };

  // Re-save to guarantee all mirrored keys stay synchronized
  saveAccountVault(fullVault);
  return fullVault;
}

/**
 * Saves account to primary vault AND all redundant mirror keys.
 */
export function saveAccountVault(partial: Partial<AccountVault>): AccountVault {
  const current = (() => {
    try {
      const raw = localStorage.getItem(VAULT_KEY);
      return raw ? JSON.parse(raw) : defaultVault;
    } catch {
      return defaultVault;
    }
  })();

  const merged: AccountVault = {
    ...current,
    ...partial,
    updatedAt: Date.now(),
  };

  try {
    // 1. Primary Vault
    localStorage.setItem(VAULT_KEY, JSON.stringify(merged));

    // 2. Redundant Mirrored Keys for 100% backward compatibility
    if (merged.registered) {
      localStorage.setItem('asosh_registered_v105', 'true');
      localStorage.setItem('registered_v104', 'true');
      localStorage.setItem('asosh_registered_v2', 'true');
    }
    if (merged.cls) {
      localStorage.setItem('asosh_class_v105', merged.cls);
      localStorage.setItem('asosh_class_v11', merged.cls);
      localStorage.setItem('class', merged.cls);
    }
    if (merged.studentName) {
      localStorage.setItem('studentName', merged.studentName);
      localStorage.setItem('asosh_student_v11', merged.studentName);
      localStorage.setItem('asosh_student_v105', merged.studentName);
      localStorage.setItem('asosh_chat_username', merged.studentName);
    }
    if (merged.parentName) {
      localStorage.setItem('parentName', merged.parentName);
    }
    if (merged.shift) {
      localStorage.setItem('asosh_shift_v105', merged.shift);
      localStorage.setItem('shift', merged.shift);
    }
    if (merged.subGroup) {
      localStorage.setItem('asosh_subgroup_v105', String(merged.subGroup));
      localStorage.setItem('subgroup', String(merged.subGroup));
    }
    if (merged.lang) {
      localStorage.setItem('asosh_lang_v105', merged.lang);
      localStorage.setItem('lang', merged.lang);
    }
    if (merged.authProvider) {
      localStorage.setItem('asosh_auth_provider', merged.authProvider);
    }
    if (merged.authEmail) {
      localStorage.setItem('asosh_auth_email', merged.authEmail);
    }
    if (merged.authPhotoUrl) {
      localStorage.setItem('asosh_auth_photo', merged.authPhotoUrl);
    }
    if (merged.authUid) {
      localStorage.setItem('asosh_auth_uid', merged.authUid);
    }

    // 3. Keep user profile in sync
    try {
      const myProf = getMyProfile(merged.studentName || 'Ученик', merged.cls || '8А');
      if (myProf) {
        myProf.fullName = merged.studentName || myProf.fullName;
        // Пустой класс тоже переносим: иначе профиль возвращает старый класс после «Сменить класс»
        myProf.className = merged.cls ?? myProf.className;
        myProf.authProvider = merged.authProvider;
        myProf.authEmail = merged.authEmail;
        myProf.authPhotoUrl = merged.authPhotoUrl;
        myProf.authUid = merged.authUid;
        saveMyProfile(myProf);
      }
    } catch {}
  } catch (e) {
    console.warn('Vault save error:', e);
  }

  return merged;
}
