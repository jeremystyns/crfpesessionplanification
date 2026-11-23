/**
 * useLiveDay — Live Mode of a whole plan: which day runs, and its runtime state.
 *
 * Role: Live Mode follows the running day: a manually started day, else the day
 *       scheduled for now, else the visible day. Deleting a manually started day
 *       ends its run instead of carrying its elapsed time over to another day.
 * Used by: WorkshopPlanner
 */
import { useEffect, useMemo, useState } from 'react';
import { WorkshopData } from '@/types/workshop';
import { usePlayMode, type PlayModeState } from '@/hooks/usePlayMode';
import { useScheduledDay } from '@/hooks/useScheduledDay';
import { getDays, isMultiDay, projectDay, resolveDayId } from '@/lib/workshop-days';
import { calculateEffectiveDuration } from '@/lib/workshopUtils';

export function useLiveDay(
  plan: WorkshopData,
  activeDayId: string,
  soundsEnabled: boolean,
): { playMode: PlayModeState; liveDayId: string } {
  const scheduledDayId = useScheduledDay(plan);
  const [manualDayId, setManualDayId] = useState<string | null>(null);
  const liveDayId = resolveDayId(plan, manualDayId ?? scheduledDayId ?? activeDayId);
  const liveDay = useMemo(() => projectDay(plan, liveDayId), [plan, liveDayId]);
  const liveDayDuration = calculateEffectiveDuration(liveDay.items, liveDay.workshop.startTime);
  const basePlayMode = usePlayMode(liveDay, liveDayDuration, soundsEnabled);
  const { activate: activateDay, deactivate: deactivateDay, startFromItem: startItem } = basePlayMode;
  // Départ demandé depuis un élément d'un autre jour que celui qui tourne : on attend que
  // le live ait basculé sur le jour visible avant de se placer sur l'élément.
  const [pendingStartId, setPendingStartId] = useState<string | null>(null);

  // Only a multi-day plan can tell: collapsing to one day drops the stored day IDs.
  const manualDayDeleted = manualDayId !== null && isMultiDay(plan)
    && !getDays(plan).some((day) => day.id === manualDayId);

  useEffect(() => {
    if (!manualDayDeleted) return;
    setManualDayId(null);
    deactivateDay();
  }, [manualDayDeleted, deactivateDay]);

  useEffect(() => {
    if (pendingStartId === null || liveDayId !== activeDayId || manualDayId !== activeDayId) return;
    startItem(pendingStartId);
    setPendingStartId(null);
  }, [pendingStartId, liveDayId, activeDayId, manualDayId, startItem]);

  return {
    liveDayId,
    playMode: {
      ...basePlayMode,
      activate: () => {
        setManualDayId(activeDayId);
        activateDay();
      },
      deactivate: () => {
        setManualDayId(null);
        setPendingStartId(null);
        deactivateDay();
      },
      startFromItem: (itemId: string) => {
        // Le live tourne déjà sur ce jour : on s'y rend (la pause est conservée).
        if (basePlayMode.isActive && liveDayId === activeDayId) return startItem(itemId);
        setManualDayId(activeDayId);
        if (liveDayId === activeDayId) return startItem(itemId);
        setPendingStartId(itemId);
        return true;
      },
    },
  };
}
