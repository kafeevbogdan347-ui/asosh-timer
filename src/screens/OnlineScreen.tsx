import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { OnlineEntry, formatDuration, isOptedIn, myWeekSec, presenceLabel, subscribeOnline } from '../services/online';
import { fetchPublicProfile, getCachedPublicProfile } from '../services/profileSync';
import { myUid } from '../services/classShared';
import { getLocalAccount } from '../services/accounts';
import { getMyProfile } from '../services/userService';
import { getProfileBadges } from '../utils/profileBadges';
import { onAdminsLoaded } from '../services/admins';
import { UserProfile } from '../types';
import { ViewedOnlineStats } from './ProfileScreen';

interface Props {
  cls: string;
  isGuest: boolean;
  onShowToast: (msg: string) => void;
  onOpenStudentProfile?: (profile: UserProfile, stats?: ViewedOnlineStats) => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export const OnlineScreen: React.FC<Props> = ({ cls, isGuest, onOpenStudentProfile }) => {
  const [list, setList] = useState<OnlineEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [pubMap, setPubMap] = useState<Record<string, UserProfile>>({});

  const [, setBadgeRev] = useState(0);

  useEffect(() => (cls ? subscribeOnline(cls, setList, () => setFailed(true)) : undefined), [cls]);
  // «в сети» пересчитываем каждые 20 с, даже если база молчит
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const bump = () => setBadgeRev((n) => n + 1);
    const unsubAdmins = onAdminsLoaded(bump);
    window.addEventListener('asosh-profile-updated', bump);
    return () => {
      unsubAdmins();
      window.removeEventListener('asosh-profile-updated', bump);
    };
  }, []);

  // Подгружаем публичные профили одноклассников для отображения бейджиков и полного профиля
  useEffect(() => {
    if (!list || list.length === 0) return;
    let alive = true;
    list.slice(0, 35).forEach((entry) => {
      const cached = getCachedPublicProfile(entry.uid);
      if (cached) {
        setPubMap((prev) => (prev[entry.uid] ? prev : { ...prev, [entry.uid]: cached }));
        return;
      }
      fetchPublicProfile(entry.uid).then((prof) => {
        if (alive && prof) {
          setPubMap((prev) => ({ ...prev, [entry.uid]: prof }));
        }
      });
    });
    return () => {
      alive = false;
    };
  }, [list]);

  const me = myUid();
  // Время аккаунта со всех устройств — из рейтинга; пока он не загрузился — с этого устройства
  const mySec = list?.find((e) => e.uid === me)?.sec ?? myWeekSec();
  const onlineCount = (list || []).filter((e) => presenceLabel(e.last, now).online).length;

  const handleSelectStudent = (e: OnlineEntry, rank: number, presence: { online: boolean; text: string }) => {
    if (!onOpenStudentProfile) return;
    const isMe = e.uid === me;
    const pub = pubMap[e.uid];
    const fallbackProfile: UserProfile = isMe
      ? getMyProfile()
      : {
          id: pub?.id || e.uid,
          username: pub?.username || e.nick,
          fullName: pub?.fullName || e.nick,
          className: pub?.className || cls,
          avatar: pub?.avatar || e.avatar || '🎒',
          avatarType: pub?.avatarType || 'emoji',
          status: pub?.status ?? e.status ?? '',
          bio: pub?.bio ?? e.bio ?? '',
          gpa: pub?.gpa ?? 0,
          hideGrades: pub?.hideGrades,
          hwDoneCount: pub?.hwDoneCount ?? 0,
          gamesScore: pub?.gamesScore ?? 0,
          certificates: pub?.certificates ?? [],
          friends: pub?.friends ?? [],
          friendsCount: pub?.friendsCount,
          registeredDate: pub?.registeredDate || '',
          registeredAt: pub?.registeredAt,
          isDev: pub?.isDev,
          verifiedClass: pub?.verifiedClass ?? true,
        };
    onOpenStudentProfile(fallbackProfile, {
      sec: e.sec,
      rank,
      presenceText: presence.text,
      online: presence.online,
      last: e.last,
    });
  };

  if (isGuest) {
    return (
      <div className="card screen-enter space-y-3">
        <h2 className="text-xl font-black text-cyan-300">🏆 Онлайн класса</h2>
        <p className="text-sm text-white/75">Рейтинг виден только одноклассникам. Войди с кодом класса, чтобы его открыть.</p>
      </div>
    );
  }

  return (
    <div className="card screen-enter space-y-4">
      <div>
        <h2 className="text-xl font-black text-cyan-300">🏆 Онлайн класса {cls}</h2>
        <p className="text-xs text-white/60">Кто больше всех в АСОШ Таймере на этой неделе. Сейчас в сети: {onlineCount}. Нажми на ученика, чтобы открыть его профиль.</p>
      </div>

      <div className="p-3 rounded-2xl bg-white/5 border border-white/15 space-y-1">
        <div className="text-[11px] text-white/60">Твоё время на этой неделе: <b className="text-cyan-300">{formatDuration(mySec)}</b></div>
        <div className="text-[11px] text-white/50">
          {getLocalAccount()?.role !== 'student'
            ? 'Чтобы попасть в рейтинг, войди в аккаунт ученика: Опции → Аккаунт.'
            : `${isOptedIn() ? 'Одноклассники видят твой ник, аватар, статус и время в приложении.' : 'Ты скрыт из рейтинга.'} Скрыть или показать себя — в Опциях → Приватность.`}
        </div>
      </div>

      {failed && <div className="text-xs text-amber-300 font-bold">Не получилось загрузить рейтинг. Проверь интернет.</div>}
      {!failed && list === null && <div className="text-xs text-white/60">Загружаю…</div>}
      {list && list.length === 0 && <div className="text-sm text-white/60">Пока в рейтинге никого — скоро появятся одноклассники.</div>}

      {list && list.length > 0 && (
        <div className="space-y-1.5">
          {list.map((e, i) => {
            const p = presenceLabel(e.last, now);
            const pub = pubMap[e.uid];
            const isMe = e.uid === me;
            const myProf = isMe ? getMyProfile() : null;
            const badges = getProfileBadges({
              isDev: isMe ? myProf?.isDev : pub?.isDev,
              registeredAt: isMe ? myProf?.registeredAt : pub?.registeredAt,
              registeredDate: isMe ? myProf?.registeredDate : pub?.registeredDate,
              id: isMe ? myProf?.id : pub?.id || e.uid,
              isSelf: isMe,
            });
            const displayName = (isMe ? myProf?.fullName : pub?.fullName) || e.nick;
            const handle = (isMe ? myProf?.username : pub?.username) || e.nick;

            return (
              <button
                key={e.uid}
                type="button"
                onClick={() => handleSelectStudent(e, i + 1, p)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left cursor-pointer transition-colors ${isMe ? 'bg-cyan-500/15 border-cyan-400/40 hover:bg-cyan-500/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                title="Открыть полный профиль"
              >
                <span className="w-7 text-center font-black text-white/80">{MEDALS[i] || i + 1}</span>
                <span className="relative text-2xl leading-none shrink-0" data-no-tr>
                  {e.avatar}
                  <span className={`online-dot ${p.online ? 'on' : ''}`} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5 min-w-0" data-no-tr>
                    <b className="text-sm text-white truncate max-w-[140px] sm:max-w-none">
                      {displayName}
                    </b>
                    <span className="text-[10px] font-mono text-cyan-300/90 bg-cyan-500/15 border border-cyan-400/30 px-1.5 py-0.5 rounded-full truncate max-w-[120px]">
                      @{handle}
                    </span>
                    {badges.map((b) => (
                      <span
                        key={b.id}
                        title={b.title}
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold inline-flex items-center gap-0.5 ${b.className}`}
                      >
                        <span>{b.icon}</span>
                        <span>{b.label}</span>
                      </span>
                    ))}
                    {isMe && <span className="text-cyan-300 font-bold text-[11px]">· ты</span>}
                  </span>
                  <span className={`text-[11px] block mt-0.5 ${p.online ? 'text-emerald-300 font-bold' : 'text-white/50'}`}>{p.text}</span>
                </span>
                <span className="text-right shrink-0 flex items-center gap-1.5">
                  <span>
                    <b className="text-sm text-cyan-300 block">{formatDuration(e.sec)}</b>
                    <span className="text-[10px] text-white/50">за неделю</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/35" />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-white/50">Время считается, только пока приложение открыто на экране. Неделя начинается в понедельник.</p>
    </div>
  );
};
