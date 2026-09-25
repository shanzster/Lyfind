import test from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import { isAnnouncementCurrentlyActive } from './announcementService.ts';

test('expired announcements are not active', () => {
  const now = new Date('2026-09-25T10:00:00Z');

  const expired = {
    active: true,
    expiresAt: Timestamp.fromDate(new Date('2026-09-24T09:00:00Z')),
  };

  assert.equal(isAnnouncementCurrentlyActive(expired as any, now), false);
});

test('non-expired announcements stay active', () => {
  const now = new Date('2026-09-25T10:00:00Z');

  const active = {
    active: true,
    expiresAt: Timestamp.fromDate(new Date('2026-09-26T09:00:00Z')),
  };

  assert.equal(isAnnouncementCurrentlyActive(active as any, now), true);
});
