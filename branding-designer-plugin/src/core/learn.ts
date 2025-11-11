import { LearningSnapshot, PreferenceStat } from '../types/brand';

const STORAGE_KEY = 'brandpilot:feedback';
export async function recordFeedback(key: string, upvote: boolean): Promise<LearningSnapshot> {
  const snapshot = await loadSnapshot();
  const current: PreferenceStat = snapshot.feedback[key] ?? { positive: 1, negative: 1 }; // beta prior
  const updated: PreferenceStat = {
    positive: current.positive + (upvote ? 1 : 0),
    negative: current.negative + (upvote ? 0 : 1)
  };
  snapshot.feedback[key] = updated;
  snapshot.updatedAt = new Date().toISOString();
  await saveSnapshot(snapshot);
  return snapshot;
}

export async function incrementApprovals(): Promise<LearningSnapshot> {
  const snapshot = await loadSnapshot();
  snapshot.selectionsApproved += 1;
  snapshot.updatedAt = new Date().toISOString();
  await saveSnapshot(snapshot);
  return snapshot;
}

export async function loadSnapshot(): Promise<LearningSnapshot> {
  const raw = await figma.clientStorage.getAsync(STORAGE_KEY);
  if (raw && typeof raw === 'object') {
    return raw as LearningSnapshot;
  }
  return {
    updatedAt: new Date().toISOString(),
    selectionsApproved: 0,
    feedback: {}
  };
}

async function saveSnapshot(snapshot: LearningSnapshot) {
  await figma.clientStorage.setAsync(STORAGE_KEY, snapshot);
}

