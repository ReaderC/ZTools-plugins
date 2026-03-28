(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.autoModeUiState = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function getDisplayName(item) {
    return normalizeText(item && item.name) || '未命名地点';
  }

  function getCoordinateLabel(item) {
    if (!item) {
      return '';
    }
    var lat = typeof item.lat === 'number' ? item.lat : item.latitude;
    var lng = typeof item.lng === 'number' ? item.lng : item.longitude;
    if (typeof lat !== 'number' || !isFinite(lat) || typeof lng !== 'number' || !isFinite(lng)) {
      return '';
    }
    return lat.toFixed(2) + ', ' + lng.toFixed(2);
  }

  function getQualifierValue(item, key) {
    if (key === 'region') {
      return normalizeText(item && item.region);
    }
    if (key === 'country') {
      return normalizeText(item && item.country);
    }
    if (key === 'timezone') {
      return normalizeText(item && item.timezone);
    }
    if (key === 'coords') {
      return getCoordinateLabel(item);
    }
    return '';
  }

  function buildQualifierLabel(item, keys) {
    return keys.map(function(key) {
      return getQualifierValue(item, key);
    }).filter(Boolean).join(' · ');
  }

  function pickDisambiguationKeys(group) {
    var candidates = [
      ['region'],
      ['region', 'country'],
      ['region', 'country', 'timezone'],
      ['region', 'country', 'timezone', 'coords']
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      var keys = candidates[i];
      var seen = Object.create(null);
      var valid = true;

      for (var j = 0; j < group.length; j += 1) {
        var label = buildQualifierLabel(group[j], keys);
        if (!label || seen[label]) {
          valid = false;
          break;
        }
        seen[label] = true;
      }

      if (valid) {
        return keys;
      }
    }

    return [];
  }

  function buildSearchMeta(item, usedKeys) {
    var region = getQualifierValue(item, 'region');
    var country = getQualifierValue(item, 'country');
    var timezone = getQualifierValue(item, 'timezone');
    var omit = Object.create(null);

    (usedKeys || []).forEach(function(key) {
      omit[key] = true;
    });

    var locationParts = [];
    if (!omit.region && region) {
      locationParts.push(region);
    }
    if (!omit.country && country) {
      locationParts.push(country);
    }

    var metaParts = [];
    if (locationParts.length > 0) {
      metaParts.push(locationParts.join(', '));
    }
    if (!omit.timezone && timezone) {
      metaParts.push(timezone);
    }
    return metaParts.join(' · ');
  }

  function getSearchResultDisplays(results) {
    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    var groups = Object.create(null);
    results.forEach(function(item) {
      var name = getDisplayName(item);
      if (!groups[name]) {
        groups[name] = [];
      }
      groups[name].push(item);
    });

    var keysByName = Object.create(null);
    Object.keys(groups).forEach(function(name) {
      if (groups[name].length > 1) {
        keysByName[name] = pickDisambiguationKeys(groups[name]);
      }
    });

    return results.map(function(item) {
      var name = getDisplayName(item);
      var usedKeys = keysByName[name] || [];
      var qualifier = buildQualifierLabel(item, usedKeys);
      return {
        item: item,
        title: qualifier ? name + ' · ' + qualifier : name,
        meta: buildSearchMeta(item, usedKeys)
      };
    });
  }

  function shouldDisableScheduleInputs(state) {
    return !!state && state.currentMode === 'schedule' && !!state.scheduleEnabled;
  }

  function hasThemeStateChanged(state) {
    if (!state) {
      return false;
    }
    return state.previousIsDark !== !!state.detectedIsDark;
  }

  function canEnableSunMode(state) {
    return !!state && !!state.selectedLocation && !!state.sunTimesReady && !state.sunFetchError;
  }

  function shouldShowSearchEmpty(state) {
    return !!state &&
      (state.query || '').trim().length >= 2 &&
      !state.loading &&
      !state.error &&
      Array.isArray(state.results) &&
      state.results.length === 0;
  }

  function shouldShowSearchError(state) {
    return !!state &&
      (state.query || '').trim().length >= 2 &&
      !state.loading &&
      !!state.error;
  }

  return {
    shouldDisableScheduleInputs: shouldDisableScheduleInputs,
    hasThemeStateChanged: hasThemeStateChanged,
    canEnableSunMode: canEnableSunMode,
    shouldShowSearchEmpty: shouldShowSearchEmpty,
    shouldShowSearchError: shouldShowSearchError,
    getSearchResultDisplays: getSearchResultDisplays
  };
}));
