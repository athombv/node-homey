import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  formatOverflowMarkerLabel,
  getResponsiveBadgeVisibility,
  getSelectFooterText,
} from '../../lib/ui/homey-select/homey-select-view.mjs';

describe('homey select view helpers', () => {
  it('formats overflow marker labels for singular and plural counts', () => {
    assert.strictEqual(formatOverflowMarkerLabel('above', 1), '1 more above');
    assert.strictEqual(formatOverflowMarkerLabel('below', 4), '4 more below');
  });

  it('returns contextual footer text for the main select states', () => {
    assert.strictEqual(
      getSelectFooterText({
        hasInteractiveHomeys: true,
        isLoading: true,
        query: '',
        visibleCount: 0,
      }),
      'Esc cancel',
    );
    assert.strictEqual(
      getSelectFooterText({
        hasInteractiveHomeys: true,
        query: '',
        visibleCount: 3,
      }),
      '↑/↓ move • type to filter • Enter select • Esc cancel',
    );
    assert.strictEqual(
      getSelectFooterText({
        hasInteractiveHomeys: true,
        query: 'of',
        visibleCount: 2,
      }),
      '↑/↓ move • Enter select • Esc clear',
    );
    assert.strictEqual(
      getSelectFooterText({
        hasInteractiveHomeys: true,
        query: 'zzz',
        visibleCount: 0,
      }),
      'type to filter • Esc clear',
    );
    assert.strictEqual(
      getSelectFooterText({
        hasInteractiveHomeys: false,
        query: '',
        visibleCount: 0,
      }),
      'Esc cancel',
    );
  });

  it('keeps both badges when there is enough room', () => {
    assert.deepStrictEqual(
      getResponsiveBadgeVisibility({
        availableWidth: 40,
        isCurrent: true,
        platform: 'local',
      }),
      {
        showCurrent: true,
        showPlatform: true,
      },
    );
  });

  it('drops the platform badge before the current badge on narrower rows', () => {
    assert.deepStrictEqual(
      getResponsiveBadgeVisibility({
        availableWidth: 24,
        isCurrent: true,
        platform: 'local',
      }),
      {
        showCurrent: true,
        showPlatform: false,
      },
    );
  });

  it('drops both badges when even the current badge would crowd the name', () => {
    assert.deepStrictEqual(
      getResponsiveBadgeVisibility({
        availableWidth: 20,
        isCurrent: true,
        platform: 'local',
      }),
      {
        showCurrent: false,
        showPlatform: false,
      },
    );
  });

  it('keeps a platform badge for non-current rows when there is room', () => {
    assert.deepStrictEqual(
      getResponsiveBadgeVisibility({
        availableWidth: 20,
        isCurrent: false,
        platform: 'cloud',
      }),
      {
        showCurrent: false,
        showPlatform: true,
      },
    );
  });
});
