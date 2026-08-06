/**
 * Onboarding-checklist types for the `/onboarding` endpoints. The checklist is
 * a fixed catalog of tasks the API declares, so `OnboardingTask` is a runtime
 * const (mirroring the generated union) that callers can iterate to render the
 * list without restating the keys.
 *
 * Credit amounts (`credits`, `claimable_credits`, `credits_granted`) arrive as
 * decimal **strings**, matching the rest of the billing surface — don't do
 * arithmetic on them without parsing.
 */

import type { Eq, Expect } from './assert'
import type { Schemas } from './schemas'

/* ---------------------------------------------------------------------------
 * Enums.
 * ------------------------------------------------------------------------- */

/** Checklist item key. */
export const OnboardingTask = {
  AiRecall: 'ai_recall',
  ProductTour: 'product_tour',
  FirstNote: 'first_note',
  FirstCollection: 'first_collection',
} as const satisfies Record<string, Schemas.OnboardingTaskState['task']>
export type OnboardingTask = (typeof OnboardingTask)[keyof typeof OnboardingTask]
/** @internal */
export type _OnboardingTaskExhaustive = Expect<
  Eq<OnboardingTask, Schemas.OnboardingTaskState['task']>
>

/* ---------------------------------------------------------------------------
 * Onboarding entities.
 * ------------------------------------------------------------------------- */

/**
 * One checklist row. `completed` is derived server-side from what the user
 * owns, so it can flip to `true` without the client doing anything; `claimed`
 * only flips through `sdk.Onboarding.claimReward`.
 */
export type OnboardingTaskState = Schemas.OnboardingTaskState

/** `GET /onboarding` response — every checklist item, in catalog order. */
export type OnboardingStatus = Schemas.OnboardingStatus

/** `POST /onboarding/{task}/reward` response — the credits just granted. */
export type OnboardingReward = Schemas.OnboardingReward
