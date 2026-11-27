import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from './atoms/ConfirmDialog';
import type { WorkshopTemplate } from '@/lib/workshopStorage';

interface PendingDelete {
  kind: 'blockType' | 'person';
  id: string;
  name: string;
}

interface SidebarDialogsProps {
  showErasePlanDialog: boolean;
  onShowErasePlanDialogChange: (open: boolean) => void;
  onErasePlan: () => void;
  pendingDelete: PendingDelete | null;
  onClearPendingDelete: () => void;
  onConfirmDelete: () => void;
  pendingTemplate: WorkshopTemplate | null;
  onClearPendingTemplate: () => void;
  onConfirmLoadTemplate: () => void;
}

export const SidebarDialogs = ({
  showErasePlanDialog,
  onShowErasePlanDialogChange,
  onErasePlan,
  pendingDelete,
  onClearPendingDelete,
  onConfirmDelete,
  pendingTemplate,
  onClearPendingTemplate,
  onConfirmLoadTemplate,
}: SidebarDialogsProps) => {
  const { t } = useTranslation('common');

  return (
    <>
      <ConfirmDialog
        open={showErasePlanDialog}
        onOpenChange={onShowErasePlanDialogChange}
        title={t('settings.erasePlanTitle')}
        description={t('settings.erasePlanConfirm')}
        confirmLabel={t('settings.erasePlan')}
        cancelLabel={t('settings.clearAllCancel')}
        onConfirm={onErasePlan}
        destructive
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && onClearPendingDelete()}
        title={
          pendingDelete?.kind === 'blockType'
            ? t('sidebar.deleteTypeTitle')
            : t('sidebar.deletePersonTitle')
        }
        description={
          pendingDelete?.kind === 'blockType'
            ? t('sidebar.deleteTypeConfirm')
            : t('sidebar.deletePersonConfirm')
        }
        confirmLabel={t('actions.delete')}
        cancelLabel={t('dialog.cancel')}
        onConfirm={onConfirmDelete}
        destructive
      />

      <ConfirmDialog
        open={!!pendingTemplate}
        onOpenChange={(open) => !open && onClearPendingTemplate()}
        title={t('dialog.loadTemplateConfirm')}
        description={t('dialog.loadTemplateDescription')}
        confirmLabel={t('dialog.loadTemplate')}
        cancelLabel={t('dialog.cancel')}
        onConfirm={onConfirmLoadTemplate}
      />
    </>
  );
};
