/**
 * roomLayout — Dispositions de salle proposées pour une phase.
 * L'identifiant est stocké dans la séance ; le libellé vient des traductions
 * (`layouts.<id>`) et l'icône d'ici.
 */
import {
  CircleDot,
  LayoutGrid,
  Magnet,
  Presentation,
  School,
  Shuffle,
  Table2,
  Theater,
  type LucideIcon,
} from 'lucide-react';
import type { RoomLayout } from '@/types/workshop';

export const ROOM_LAYOUT_ICONS: Record<RoomLayout, LucideIcon> = {
  conference: Presentation,
  theatre: Theater,
  class: School,
  circle: CircleDot,
  u: Magnet,
  table: Table2,
  islands: LayoutGrid,
  free: Shuffle,
};

export const isRoomLayout = (value: unknown): value is RoomLayout =>
  typeof value === 'string' && value in ROOM_LAYOUT_ICONS;

