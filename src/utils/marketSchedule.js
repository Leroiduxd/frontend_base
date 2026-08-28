/**
 * Utilitaires pour parser la chaîne de schedule Pyth TradingView et déterminer si le marché est ouvert.
 *
 * Exemple de format schedule :
 * "America/New_York;0000-1700&1800-2400,0000-1700&1800-2400,0000-1700&1800-2400,0000-1700&1800-2400,0000-1700,C,1800-2400;0216/0000-1430&1800-2400,0402/0000-1700,0403/C,0525/0000-1430&1800-2400,0619/0000-1300,0703/0000-1300"
 *
 * Structure :
 * - Partie 1 : Timezone (ex: "America/New_York")
 * - Partie 2 : 7 jours de la semaine (1=Lundi, ..., 5=Vendredi, 6=Samedi, 7=Dimanche) séparés par des virgules
 *              Chaque jour contient des plages "HHMM-HHMM" jointes par "&", ou "C" pour fermé (Closed).
 * - Partie 3 (optionnelle) : Exceptions / jours fériés (ex: "MMDD/HHMM-HHMM" ou "MMDD/C")
 */

/**
 * Vérifie si le marché est actuellement ouvert selon la chaîne schedule.
 * @param {string} scheduleStr
 * @param {Date} [dateNow]
 * @returns {boolean}
 */
export function isMarketOpenFromSchedule(scheduleStr, dateNow = new Date()) {
  if (!scheduleStr || typeof scheduleStr !== 'string') return true;

  try {
    const parts = scheduleStr.trim().split(';');
    if (parts.length < 2) return true;

    const timezone = parts[0].trim() || 'America/New_York';
    const weeklyScheduleStr = parts[1].trim();
    const holidaysStr = parts[2] ? parts[2].trim() : '';

    // Convertir l'heure actuelle dans le fuseau horaire du schedule
    const nowFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'narrow', // 'M', 'T', 'W', etc. ou calcul manuel
    });

    const partsFormatted = nowFormatter.formatToParts(dateNow);
    const dateMap = {};
    for (const p of partsFormatted) {
      dateMap[p.type] = p.value;
    }

    const monthStr = dateMap.month; // "02"
    const dayStr = dateMap.day;     // "23"
    const hour = parseInt(dateMap.hour, 10);
    const minute = parseInt(dateMap.minute, 10);
    const currentHHMM = hour * 100 + minute; // ex: 1345

    // Calculer le jour de la semaine dans le fuseau horaire (1 = Lundi, ..., 7 = Dimanche)
    // On recrée une date locale à partir de la timezone pour extraire getDay()
    const tzDateStr = `${dateMap.year}-${monthStr}-${dayStr}T${dateMap.hour}:${dateMap.minute}:00`;
    // On déduit le jour de la semaine : dimanche = 0 (qu'on mappe à 7), lundi = 1, ...
    const dayOfWeek = (new Date(`${dateMap.year}-${monthStr}-${dayStr}T12:00:00Z`)).getUTCDay();
    const scheduleDayIndex = dayOfWeek === 0 ? 7 : dayOfWeek; // 1 (Mon) to 7 (Sun)

    // 1. Vérifier si aujourd'hui est un jour spécial / exception fériée (MMDD)
    const todayMMDD = `${monthStr}${dayStr}`;
    let todayRule = null;

    if (holidaysStr) {
      const holidayRules = holidaysStr.split(',');
      for (const h of holidayRules) {
        const [hDate, hSessions] = h.split('/');
        if (hDate === todayMMDD && hSessions) {
          todayRule = hSessions;
          break;
        }
      }
    }

    // 2. Si aucune exception trouvée pour aujourd'hui, utiliser le calendrier hebdomadaire
    if (!todayRule) {
      const weeklyDays = weeklyScheduleStr.split(',');
      if (weeklyDays.length >= 7) {
        todayRule = weeklyDays[scheduleDayIndex - 1]; // 0-indexed : 0 = Lundi, 6 = Dimanche
      }
    }

    if (!todayRule || todayRule === 'C') {
      return false; // Marché fermé toute la journée
    }

    // 3. Parser les sessions du jour (ex: "0000-1700&1800-2400")
    const sessions = todayRule.split('&');
    for (const session of sessions) {
      if (session === 'C') continue;
      const [startStr, endStr] = session.split('-');
      if (!startStr || !endStr) continue;

      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      // Si end est 2400, l'intervalle va jusqu'à 2400 (fin de journée)
      if (currentHHMM >= start && currentHHMM < end) {
        return true;
      }
    }

    return false;
  } catch (err) {
    console.warn("Error parsing market schedule:", err);
    return true; // Fallback ouvert si erreur de parsing
  }
}

/**
 * Calcule le temps restant jusqu'à la prochaine ouverture du marché.
 * @param {string} scheduleStr
 * @param {Date} [dateNow]
 * @returns {string} Ex: "2h 15m" ou "1d 4h" ou "a few moments"
 */
export function getNextMarketOpenTime(scheduleStr, dateNow = new Date()) {
  if (!scheduleStr || typeof scheduleStr !== 'string') return '';

  try {
    const parts = scheduleStr.trim().split(';');
    if (parts.length < 2) return '';

    const timezone = parts[0].trim() || 'America/New_York';
    const weeklyScheduleStr = parts[1].trim();
    const holidaysStr = parts[2] ? parts[2].trim() : '';

    const weeklyDays = weeklyScheduleStr.split(',');
    if (weeklyDays.length < 7) return '';

    // Obtenir la date actuelle dans la timezone
    const nowFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const partsFormatted = nowFormatter.formatToParts(dateNow);
    const dateMap = {};
    for (const p of partsFormatted) {
      dateMap[p.type] = p.value;
    }

    const currentHour = parseInt(dateMap.hour, 10);
    const currentMinute = parseInt(dateMap.minute, 10);
    const currentHHMM = currentHour * 100 + currentMinute;

    const baseYear = parseInt(dateMap.year, 10);
    const baseMonth = parseInt(dateMap.month, 10) - 1;
    const baseDay = parseInt(dateMap.day, 10);

    // Parcourir les 8 prochains jours pour trouver la prochaine session ouverte
    for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
      const checkDate = new Date(Date.UTC(baseYear, baseMonth, baseDay + dayOffset, 12, 0, 0));
      const checkDayOfWeek = checkDate.getUTCDay(); // 0 = Dimanche, 1 = Lundi, ...
      const scheduleDayIndex = checkDayOfWeek === 0 ? 7 : checkDayOfWeek;

      const m = String(checkDate.getUTCMonth() + 1).padStart(2, '0');
      const d = String(checkDate.getUTCDate()).padStart(2, '0');
      const checkMMDD = `${m}${d}`;

      // Règle fériée ou hebdomadaire
      let dayRule = null;
      if (holidaysStr) {
        const holidayRules = holidaysStr.split(',');
        for (const h of holidayRules) {
          const [hDate, hSessions] = h.split('/');
          if (hDate === checkMMDD && hSessions) {
            dayRule = hSessions;
            break;
          }
        }
      }

      if (!dayRule) {
        dayRule = weeklyDays[scheduleDayIndex - 1];
      }

      if (!dayRule || dayRule === 'C') continue;

      const sessions = dayRule.split('&');
      for (const session of sessions) {
        if (session === 'C') continue;
        const [startStr] = session.split('-');
        if (!startStr) continue;

        const startHHMM = parseInt(startStr, 10);
        const startHour = Math.floor(startHHMM / 100);
        const startMin = startHHMM % 100;

        if (dayOffset === 0) {
          // Si c'est aujourd'hui, la session doit commencer après l'heure actuelle
          if (startHHMM <= currentHHMM) continue;
        }

        // Calcul du délai total en minutes
        const totalMinutesCurrent = (currentHour * 60) + currentMinute;
        const totalMinutesStart = (dayOffset * 24 * 60) + (startHour * 60) + startMin;
        const diffMinutes = totalMinutesStart - totalMinutesCurrent;

        if (diffMinutes <= 0) continue;

        const days = Math.floor(diffMinutes / (24 * 60));
        const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
        const mins = diffMinutes % 60;

        if (days > 0) {
          return `${days}d ${hours}h`;
        }
        if (hours > 0) {
          return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
      }
    }

    return '';
  } catch (e) {
    return '';
  }
}

