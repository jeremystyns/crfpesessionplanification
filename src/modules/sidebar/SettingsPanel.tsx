import { Button } from '@/components/primitives/button';
import { useTranslation } from 'react-i18next';
import { Eraser, Keyboard, MessageSquare, Sparkles } from 'lucide-react';
import { ThemeToggle } from './atoms/ThemeToggle';

interface SettingsPanelProps {
  /** Efface la planification ouverte (absent quand il n'y en a pas). */
  onErasePlan?: () => void;
  onOpenAiHelp?: () => void;
  /** Open the optional feedback dialog (always available; bypasses locks). */
  onOpenFeedback?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  panelRef: React.RefObject<HTMLDivElement>;
}

export const SettingsPanel = ({
  onErasePlan,
  onOpenAiHelp,
  onOpenFeedback,
  onOpenKeyboardShortcuts,
  panelRef,
}: SettingsPanelProps) => {
  const { t } = useTranslation('common');

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-0 right-0 bg-popover border-y shadow-[0_-4px_16px_rgba(0,0,0,0.08)] overflow-y-auto z-20"
    >
      <div className="py-2 space-y-1">
        <ThemeToggle />

        <div className="border-t pt-1 mt-1">
          {onOpenFeedback && (
            <Button variant="plain" size="none"
              onClick={onOpenFeedback}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              {t('feedback.give')}
            </Button>
          )}
          {onOpenKeyboardShortcuts && (
            <Button variant="plain" size="none"
              onClick={onOpenKeyboardShortcuts}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors [@media(pointer:coarse)]:hidden"
            >
              <Keyboard className="h-4 w-4" />
              {t('shortcuts.title')}
            </Button>
          )}
          {onOpenAiHelp && (
            <Button variant="plain" size="none"
              onClick={() => {
                onOpenAiHelp();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              {t('settings.aiHelp')}
            </Button>
          )}
          {onErasePlan && (
            <Button variant="plain" size="none"
              onClick={onErasePlan}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 text-destructive-text transition-colors font-semibold"
            >
              <Eraser className="h-4 w-4" />
              {t('settings.erasePlan')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
