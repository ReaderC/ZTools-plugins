const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const uiState = require('../lib/ui-state');

describe('schedule UI state helpers', () => {
  it('should disable schedule inputs when schedule mode is enabled', () => {
    assert.equal(
      uiState.shouldDisableScheduleInputs({ currentMode: 'schedule', scheduleEnabled: true }),
      true
    );
  });

  it('should keep schedule inputs enabled when schedule mode is disabled', () => {
    assert.equal(
      uiState.shouldDisableScheduleInputs({ currentMode: 'schedule', scheduleEnabled: false }),
      false
    );
  });

  it('should keep schedule inputs enabled in sun mode', () => {
    assert.equal(
      uiState.shouldDisableScheduleInputs({ currentMode: 'sun', scheduleEnabled: true }),
      false
    );
  });
});

describe('theme sync helpers', () => {
  it('should treat the first detected theme as a change', () => {
    assert.equal(
      uiState.hasThemeStateChanged({ previousIsDark: null, detectedIsDark: true }),
      true
    );
  });

  it('should detect a theme change when the value flips', () => {
    assert.equal(
      uiState.hasThemeStateChanged({ previousIsDark: false, detectedIsDark: true }),
      true
    );
  });

  it('should ignore repeated theme values', () => {
    assert.equal(
      uiState.hasThemeStateChanged({ previousIsDark: true, detectedIsDark: true }),
      false
    );
  });
});

describe('sun search state helpers', () => {
  it('should allow enable only when location and sun data are both ready', () => {
    assert.equal(
      uiState.canEnableSunMode({
        selectedLocation: { name: 'London' },
        sunTimesReady: true,
        sunFetchError: false
      }),
      true
    );
  });

  it('should reject enable when sunrise data has failed to load', () => {
    assert.equal(
      uiState.canEnableSunMode({
        selectedLocation: { name: 'London' },
        sunTimesReady: false,
        sunFetchError: true
      }),
      false
    );
  });

  it('should show empty-result state only after a completed search with no matches', () => {
    assert.equal(
      uiState.shouldShowSearchEmpty({
        query: 'Lo',
        loading: false,
        error: false,
        results: []
      }),
      true
    );
  });

  it('should show search error only for meaningful queries after a failed request', () => {
    assert.equal(
      uiState.shouldShowSearchError({
        query: 'Lon',
        loading: false,
        error: true
      }),
      true
    );
  });

  it('should disambiguate duplicate city names with region in the title', () => {
    const displays = uiState.getSearchResultDisplays([
      { name: '上海', region: '上海市', country: '中国', timezone: 'Asia/Shanghai' },
      { name: '上海', region: '浙江', country: '中国', timezone: 'Asia/Shanghai' },
      { name: '上海', region: '云南', country: '中国', timezone: 'Asia/Shanghai' }
    ]);

    assert.deepEqual(
      displays.map(function(item) {
        return { title: item.title, meta: item.meta };
      }),
      [
        { title: '上海 · 上海市', meta: '中国 · Asia/Shanghai' },
        { title: '上海 · 浙江', meta: '中国 · Asia/Shanghai' },
        { title: '上海 · 云南', meta: '中国 · Asia/Shanghai' }
      ]
    );
  });

  it('should keep unique city names clean and preserve region plus country in meta', () => {
    const displays = uiState.getSearchResultDisplays([
      { name: 'London', region: 'England', country: 'United Kingdom', timezone: 'Europe/London' }
    ]);

    assert.deepEqual(displays, [
      {
        item: { name: 'London', region: 'England', country: 'United Kingdom', timezone: 'Europe/London' },
        title: 'London',
        meta: 'England, United Kingdom · Europe/London'
      }
    ]);
  });

  it('should fall back to country when duplicate city names have no region', () => {
    const displays = uiState.getSearchResultDisplays([
      { name: 'San Jose', region: '', country: 'United States', timezone: 'America/Los_Angeles' },
      { name: 'San Jose', region: '', country: 'Costa Rica', timezone: 'America/Costa_Rica' }
    ]);

    assert.deepEqual(
      displays.map(function(item) {
        return { title: item.title, meta: item.meta };
      }),
      [
        { title: 'San Jose · United States', meta: 'America/Los_Angeles' },
        { title: 'San Jose · Costa Rica', meta: 'America/Costa_Rica' }
      ]
    );
  });
});
