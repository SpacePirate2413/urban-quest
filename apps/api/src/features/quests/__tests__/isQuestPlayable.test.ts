import { describe, expect, it } from 'vitest';
import { END_SCENE_ID, isQuestPlayable } from '../quests.service.js';

/**
 * Unit tests for the pure playability validator. No DB, no HTTP — just inputs
 * and outputs. Each test pins exactly one rejection branch so a regression
 * tells us *which* rule changed.
 *
 * Test data builders below keep the noise out of each `it(...)` body. Default
 * shape is the smallest playable quest; tests override only the fields they
 * care about.
 */

const wp = (id: string) => ({ id });

const scene = (overrides: Partial<{
  id: string; script: string | null; question: string | null;
  choices: string | null; mediaUrl: string | null;
}> = {}) => ({
  id: 's1',
  script: 'A line',
  question: 'Pick one',
  choices: JSON.stringify([{ text: 'End', sceneId: END_SCENE_ID }]),
  mediaUrl: '/api/media/x.mp3',
  ...overrides,
});

const quest = (overrides: Partial<{
  waypoints: { id: string }[];
  scenes: ReturnType<typeof scene>[];
}> = {}) => ({
  waypoints: [wp('w1')],
  scenes: [scene()],
  ...overrides,
});

describe('isQuestPlayable', () => {
  it('returns true for the minimal valid shape (one waypoint, one scene, END choice)', () => {
    expect(isQuestPlayable(quest())).toBe(true);
  });

  it('rejects a quest with no waypoints', () => {
    expect(isQuestPlayable(quest({ waypoints: [] }))).toBe(false);
  });

  it('rejects a quest with no scenes', () => {
    expect(isQuestPlayable(quest({ scenes: [] }))).toBe(false);
  });

  it('rejects a scene with an empty question', () => {
    expect(isQuestPlayable(quest({ scenes: [scene({ question: '' })] }))).toBe(false);
  });

  it('rejects a scene with a whitespace-only question', () => {
    expect(isQuestPlayable(quest({ scenes: [scene({ question: '   ' })] }))).toBe(false);
  });

  it('rejects a scene with a null question', () => {
    expect(isQuestPlayable(quest({ scenes: [scene({ question: null })] }))).toBe(false);
  });

  it('rejects a scene with no mediaUrl', () => {
    expect(isQuestPlayable(quest({ scenes: [scene({ mediaUrl: null })] }))).toBe(false);
  });

  it('rejects a scene whose choices field is not valid JSON', () => {
    expect(isQuestPlayable(quest({ scenes: [scene({ choices: 'not json {' })] }))).toBe(false);
  });

  it('rejects a scene whose choices array is empty', () => {
    expect(isQuestPlayable(quest({ scenes: [scene({ choices: '[]' })] }))).toBe(false);
  });

  it('rejects a scene whose choices field parses to a non-array', () => {
    expect(isQuestPlayable(quest({ scenes: [scene({ choices: '{"text":"oops"}' })] }))).toBe(false);
  });

  it('rejects a choice with empty text', () => {
    const choices = JSON.stringify([{ text: '', sceneId: END_SCENE_ID }]);
    expect(isQuestPlayable(quest({ scenes: [scene({ choices })] }))).toBe(false);
  });

  it('rejects a choice pointing at a sceneId that does not exist on the quest', () => {
    const choices = JSON.stringify([{ text: 'Go', sceneId: 'ghost-scene' }]);
    expect(isQuestPlayable(quest({ scenes: [scene({ choices })] }))).toBe(false);
  });

  it('accepts a choice pointing at a valid sceneId on the quest', () => {
    const choices = JSON.stringify([{ text: 'Go', sceneId: 's2' }]);
    const q = quest({
      scenes: [scene({ choices }), scene({ id: 's2', choices: JSON.stringify([{ text: 'End', sceneId: END_SCENE_ID }]) })],
    });
    expect(isQuestPlayable(q)).toBe(true);
  });

  it('accepts a legacy choice pointing at a valid waypointId (back-compat)', () => {
    const choices = JSON.stringify([{ text: 'Go', waypointId: 'w1' }]);
    expect(isQuestPlayable(quest({ scenes: [scene({ choices })] }))).toBe(true);
  });

  it('rejects a legacy choice pointing at a waypointId that does not exist', () => {
    const choices = JSON.stringify([{ text: 'Go', waypointId: 'ghost-wp' }]);
    expect(isQuestPlayable(quest({ scenes: [scene({ choices })] }))).toBe(false);
  });

  it('rejects a choice with neither sceneId nor waypointId set', () => {
    const choices = JSON.stringify([{ text: 'Go nowhere' }]);
    expect(isQuestPlayable(quest({ scenes: [scene({ choices })] }))).toBe(false);
  });

  it('accepts the END sentinel as a routing target without needing a real id', () => {
    const choices = JSON.stringify([{ text: 'Finish', sceneId: END_SCENE_ID }]);
    expect(isQuestPlayable(quest({ scenes: [scene({ choices })] }))).toBe(true);
  });
});
