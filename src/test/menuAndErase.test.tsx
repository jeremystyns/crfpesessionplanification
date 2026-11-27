import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPanel } from '@/modules/sidebar/SettingsPanel';
import { SidebarDialogs } from '@/modules/sidebar/SidebarDialogs';
import { HeaderActionButtons } from '@/modules/planner/HeaderActionButtons';
import { SessionHistoryList } from '@/components/sections/SessionHistoryList';
import { getSessionHistory, upsertSessionToHistory } from '@/lib/workshopLocalStorage';
import type { SessionHistoryEntry } from '@/types/sessionHistory';
import { installClipboardMock } from './test-helpers';

const device = vi.hoisted(() => ({ mobile: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => device.mobile }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'fr' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/contexts/LocaleContext', () => ({ useLocale: () => ({ locale: 'fr', alternates: {} }) }));

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  device.mobile = false; installClipboardMock(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const panel = (props: Partial<Parameters<typeof SettingsPanel>[0]> = {}) =>
  render(<SettingsPanel panelRef={{ current: null }} {...props} />);

describe('settings menu', () => {
  it('no longer has the export, import and “clear everything” entries', () => {
    panel({ onErasePlan: () => {} });
    for (const key of ['settings.exportPdf', 'settings.exportCsv', 'settings.exportData', 'settings.importData', 'settings.clearAll']) {
      expect(screen.queryByText(key)).toBeNull();
    }
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('offers to erase the open plan, only when there is one', () => {
    const onErasePlan = vi.fn();
    const { unmount } = panel({ onErasePlan });
    fireEvent.click(screen.getByText('settings.erasePlan'));
    expect(onErasePlan).toHaveBeenCalledTimes(1);
    unmount();
    panel();
    expect(screen.queryByText('settings.erasePlan')).toBeNull();
  });
});

describe('erase confirmation', () => {
  const dialogs = (onErasePlan = vi.fn()) =>
    render(
      <SidebarDialogs
        showErasePlanDialog
        onShowErasePlanDialogChange={() => {}}
        onErasePlan={onErasePlan}
        pendingDelete={null}
        onClearPendingDelete={() => {}}
        onConfirmDelete={() => {}}
        pendingTemplate={null}
        onClearPendingTemplate={() => {}}
        onConfirmLoadTemplate={() => {}}
      />,
    );

  it('asks before erasing and then erases', () => {
    const onErasePlan = vi.fn();
    dialogs(onErasePlan);
    expect(screen.getByText('settings.erasePlanTitle')).toBeTruthy();
    expect(screen.getByText('settings.erasePlanConfirm')).toBeTruthy();
    expect(onErasePlan).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'settings.erasePlan' }));
    expect(onErasePlan).toHaveBeenCalledTimes(1);
  });
});

describe('share menu', () => {
  const props = () => ({
    playMode: { isActive: false, activate: vi.fn(), deactivate: vi.fn() },
    onReset: vi.fn(), serverKey: null, isEnablingServerMode: false,
    onToggleServerMode: vi.fn(async () => null),
    getEditorShareUrl: () => 'http://x/#data=1', getReadOnlyShareUrl: () => 'http://x/#data=1',
    canEditServerSession: true, isLegacyServerSession: false,
    onMigrateLegacyLink: vi.fn(async () => null), legacyMigrationStatus: 'new' as const,
    snapshotUrl: 'http://x/#data=1', dateLocale: 'fr-FR',
    canUndo: false, onUndo: vi.fn(), onMenuClick: vi.fn(),
  });

  it('holds the exports: PDF, spreadsheet and file', () => {
    const onExportJson = vi.fn();
    const onExportCsv = vi.fn();
    render(<HeaderActionButtons {...props()} onExportJson={onExportJson} onExportCsv={onExportCsv} />);
    fireEvent.click(screen.getByTitle('planner.shareOptions'));
    expect(screen.getByText('settings.exportPdf')).toBeTruthy();
    fireEvent.click(screen.getByText('settings.exportCsv'));
    fireEvent.click(screen.getByText('settings.exportData'));
    expect(onExportCsv).toHaveBeenCalledTimes(1);
    expect(onExportJson).toHaveBeenCalledTimes(1);
  });
});

describe('home page list', () => {
  const entry = (id: string, title: string): SessionHistoryEntry => ({
    id, title, type: 'local', urlHash: 'abc', itemCount: 2, totalDuration: 30, updatedAt: Date.now(), lastOpenedAt: Date.now(),
  } as SessionHistoryEntry);

  it('has a small cross on each card that erases the plan after confirmation', async () => {
    upsertSessionToHistory(entry('s1', 'Atelier A'));
    upsertSessionToHistory(entry('s2', 'Atelier B'));
    render(<SessionHistoryList onReopenSession={() => {}} />);
    const crosses = screen.getAllByRole('button', { name: 'sessionHistory.hide' });
    expect(crosses).toHaveLength(2);

    fireEvent.click(crosses[0]);
    expect(screen.getByText('sessionHistory.hideConfirmTitle')).toBeTruthy();
    // Nothing is erased until the person confirms.
    expect(getSessionHistory()).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'sessionHistory.hideConfirmAction' }));
    await waitFor(() => expect(getSessionHistory()).toHaveLength(1));
  });
});
