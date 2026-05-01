// Pure validation for "is this quest ready to submit for review?".
//
// Returns a flat array of `{ id, tab, message }` items. The `tab` value
// matches the controlled-tab values used in QuestEditor.jsx ('settings' |
// 'waypoints' | 'create') so the floating ValidationPanel can offer
// click-to-jump navigation. Stable `id`s let the panel animate cleanly
// when individual errors come and go.
//
// Lives outside CreateTab.jsx because the popup that displays these
// errors is owned by QuestEditor and persists across tab switches.

export const TABS = {
  settings: 'Quest Info',
  waypoints: 'Waypoints',
  create: 'Create',
};

export function validateQuest(quest) {
  const errors = [];
  if (!quest) return errors;

  // ── Quest Info tab ────────────────────────────────────────────────
  if (!quest.title?.trim()) errors.push({ id: 'qi-title', tab: 'settings', message: 'Title is required' });
  if (!quest.description?.trim()) errors.push({ id: 'qi-description', tab: 'settings', message: 'Description is required' });
  if (!quest.tagline?.trim()) errors.push({ id: 'qi-tagline', tab: 'settings', message: 'Tagline is required' });
  if (!quest.coverImage) errors.push({ id: 'qi-cover', tab: 'settings', message: 'Cover image is required' });
  if (!quest.genre) errors.push({ id: 'qi-genre', tab: 'settings', message: 'Genre is required' });
  if (!quest.ageRating) errors.push({ id: 'qi-age', tab: 'settings', message: 'Age rating is required' });
  if (!quest.estimatedDuration || quest.estimatedDuration < 1) {
    errors.push({ id: 'qi-duration', tab: 'settings', message: 'Estimated duration is required (min 1 minute)' });
  }
  if (quest.mediaType !== 'audio' && quest.mediaType !== 'video') {
    errors.push({ id: 'qi-media-type', tab: 'settings', message: 'Media type (audio or video) is required' });
  }

  // ── Waypoints tab ─────────────────────────────────────────────────
  if (!quest.waypoints || quest.waypoints.length === 0) {
    errors.push({ id: 'wp-empty', tab: 'waypoints', message: 'At least one waypoint is required' });
  }

  // ── Create tab ────────────────────────────────────────────────────
  if (!quest.scenes || quest.scenes.length === 0) {
    errors.push({ id: 'sc-empty', tab: 'create', message: 'At least one scene is required' });
  }

  const sceneIds = new Set((quest.scenes || []).map((s) => s.id));
  const waypointIds = new Set((quest.waypoints || []).map((w) => w.id));

  (quest.scenes || []).forEach((scene, idx) => {
    const label = `Scene ${idx + 1}`;
    if (!scene.mediaUrl) {
      errors.push({ id: `sc-${scene.id}-media`, tab: 'create', message: `${label}: Media file is required` });
    }
    if (!scene.question?.trim()) {
      errors.push({ id: `sc-${scene.id}-question`, tab: 'create', message: `${label}: Question is required` });
    }
    if (!scene.waypointId) {
      errors.push({ id: `sc-${scene.id}-waypoint`, tab: 'create', message: `${label}: Location (waypoint) is required` });
    }
    if (!scene.choices || scene.choices.length === 0) {
      errors.push({ id: `sc-${scene.id}-choices`, tab: 'create', message: `${label}: At least one choice is required` });
    } else {
      scene.choices.forEach((c, ci) => {
        if (!c.text?.trim()) {
          errors.push({
            id: `sc-${scene.id}-choice-${ci}-text`,
            tab: 'create',
            message: `${label}, choice ${ci + 1}: Text is required`,
          });
        }
        // Accept the new sceneId shape, the END sentinel, or — for legacy
        // choices that haven't been re-saved yet — a valid waypointId.
        const target = c.sceneId ?? c.waypointId;
        if (target !== '__END__' && !sceneIds.has(target) && !waypointIds.has(target)) {
          errors.push({
            id: `sc-${scene.id}-choice-${ci}-dest`,
            tab: 'create',
            message: `${label}, choice ${ci + 1}: Pick a destination scene or "End Quest"`,
          });
        }
      });
    }
  });

  return errors;
}
