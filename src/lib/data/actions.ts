"use server";

import { revalidatePath } from "next/cache";
import { getDataStore } from "./index";
import type {
  ContentIdeaInput,
  MajorEventInput,
  StorylineInput,
} from "./types";
import type { Importance, RelatedTable } from "@/types/domain";

function refresh() {
  revalidatePath("/", "layout");
}

// Storylines -----------------------------------------------------------
export async function createStorylineAction(input: StorylineInput) {
  const storyline = await getDataStore().createStoryline(input);
  refresh();
  return storyline;
}

export async function updateStorylineAction(id: string, input: Partial<StorylineInput>) {
  const storyline = await getDataStore().updateStoryline(id, input);
  refresh();
  return storyline;
}

export async function archiveStorylineAction(id: string) {
  await getDataStore().archiveStoryline(id);
  refresh();
}

export async function restoreStorylineAction(id: string) {
  await getDataStore().restoreStoryline(id);
  refresh();
}

// Content ideas ----------------------------------------------------------
export async function createContentIdeaAction(input: ContentIdeaInput) {
  const idea = await getDataStore().createContentIdea(input);
  refresh();
  return idea;
}

export async function updateContentIdeaAction(id: string, input: Partial<ContentIdeaInput>) {
  const idea = await getDataStore().updateContentIdea(id, input);
  refresh();
  return idea;
}

export async function archiveContentIdeaAction(id: string) {
  await getDataStore().archiveContentIdea(id);
  refresh();
}

export async function restoreContentIdeaAction(id: string) {
  await getDataStore().restoreContentIdea(id);
  refresh();
}

// Games --------------------------------------------------------------------
export async function archiveGameAction(id: string) {
  await getDataStore().archiveGame(id);
  refresh();
}

export async function restoreGameAction(id: string) {
  await getDataStore().restoreGame(id);
  refresh();
}

export async function setGameImportanceAction(id: string, importance: Importance, manual: boolean) {
  await getDataStore().setGameImportance(id, importance, manual);
  refresh();
}

// Major events ---------------------------------------------------------
export async function createMajorEventAction(input: MajorEventInput) {
  const event = await getDataStore().createMajorEvent(input);
  refresh();
  return event;
}

export async function updateMajorEventAction(id: string, input: Partial<MajorEventInput>) {
  const event = await getDataStore().updateMajorEvent(id, input);
  refresh();
  return event;
}

export async function archiveMajorEventAction(id: string) {
  await getDataStore().archiveMajorEvent(id);
  refresh();
}

export async function restoreMajorEventAction(id: string) {
  await getDataStore().restoreMajorEvent(id);
  refresh();
}

// Reference links ------------------------------------------------------
export async function addReferenceLinkAction(table: RelatedTable, id: string, url: string, label?: string | null) {
  const link = await getDataStore().addReferenceLink(table, id, url, label ?? null);
  refresh();
  return link;
}

export async function removeReferenceLinkAction(id: string) {
  await getDataStore().removeReferenceLink(id);
  refresh();
}

// Notifications ----------------------------------------------------------
export async function markNotificationReadAction(id: string) {
  await getDataStore().markNotificationRead(id);
  refresh();
}

export async function markAllNotificationsReadAction() {
  await getDataStore().markAllNotificationsRead();
  refresh();
}
