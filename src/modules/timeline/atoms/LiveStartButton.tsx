import { useContext } from 'react';
import { Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/primitives/button';
import { LiveStartContext } from '@/contexts/LiveStartContext';
import { cn } from '@/lib/utils';

interface LiveStartButtonProps {
  itemId: string;
  className?: string;
}

/**
 * Bouton « Live » discret, à gauche de l'heure d'un élément : lance le direct à
 * partir de cet élément (même icône que le bouton de lecture du menu), ou, si le
 * direct tourne déjà, s'y rend.
 */
export const LiveStartButton = ({ itemId, className }: LiveStartButtonProps) => {
  const { t } = useTranslation('common');
  const live = useContext(LiveStartContext);
  if (!live) return null;
  const label = t(live.isLive ? 'live.goHere' : 'live.startHere');

  return (
    <Button
      variant="plain"
      size="none"
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        live.startFrom(itemId);
      }}
      title={label}
      aria-label={label}
      data-live-start
      className={cn(
        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-40 transition-opacity',
        'hover:bg-primary/10 hover:text-primary-text hover:opacity-100 focus-visible:opacity-100 print:hidden',
        className,
      )}
    >
      <Play className="h-3 w-3" />
    </Button>
  );
};
