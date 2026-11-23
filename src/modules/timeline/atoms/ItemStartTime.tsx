import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { LiveStartButton } from './LiveStartButton';

interface ItemStartTimeProps {
  /** Élément concerné : permet le bouton « Live » à gauche de l'heure. */
  itemId?: string;
  time: string;
  isFixed: boolean;
  onUnlock: () => void;
  onEdit: () => void;
  className: string;
  unlockButtonClassName: string;
  lockIconClassName: string;
  timeButtonClassName: string;
}

/** An item's start time, opening the time field, plus the button that releases a fixed time. */
export const ItemStartTime = ({
  itemId,
  time,
  isFixed,
  onUnlock,
  onEdit,
  className,
  unlockButtonClassName,
  lockIconClassName,
  timeButtonClassName,
}: ItemStartTimeProps) => {
  const { t } = useTranslation('common');

  return (
    <div className={className}>
      {itemId && <LiveStartButton itemId={itemId} />}
      {isFixed && (
        <Button
          variant="plain"
          size="none"
          onClick={(e) => {
            e.stopPropagation();
            onUnlock();
          }}
          className={unlockButtonClassName}
          title={t('block.unlockStartTime')}
        >
          <Lock className={lockIconClassName} />
        </Button>
      )}
      <Button
        variant="plain"
        size="none"
        className={timeButtonClassName}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        {time}
      </Button>
    </div>
  );
};
