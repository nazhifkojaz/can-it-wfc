import posthog from 'posthog-js'
import { logger } from '../utils/logger'

/**
 * Initialize PostHog analytics.
 *
 * Key configuration decisions:
 * - `autocapture: false` — We define explicit events for clean data. Autocapture creates noisy, hard-to-analyze event streams.
 * - `person_profiles: 'identified_only'` — Only create person profiles for logged-in users, saving quota.
 * - `maskAllInputs: true` — Mask form inputs in session recordings for privacy (passwords, emails).
 */
export function initPostHog() {
  if (typeof window !== 'undefined') {
    const key = import.meta.env.VITE_POSTHOG_KEY
    const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

    if (!key) {
      logger.warn('[PostHog] VITE_POSTHOG_KEY not set - analytics disabled')
      return
    }

    posthog.init(key, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
    })

    logger.debug('[PostHog] Initialized')
  }
}

/**
 * Identify the current user in PostHog.
 *
 * Call this when:
 * - User completes login/register
 * - Session is restored (user already logged in on app load)
 *
 * @param userId - The user's ID
 * @param properties - User properties to set on the PostHog person profile
 */
export function identifyUser(
  userId: number,
  properties: {
    username: string
    email?: string
    auth_method?: 'google' | 'email'
    created_at: string
    is_private_profile?: boolean
    total_reviews: number
    total_visits: number
    followers_count?: number
  }
) {
  if (typeof window !== 'undefined') {
    posthog.identify(String(userId), properties)
    logger.debug('[PostHog] Identified user', { userId: String(userId) })
  }
}

/**
 * Reset the PostHog session.
 *
 * Call this when the user logs out to clear the identified user
 * and prevent subsequent events from being attributed to them.
 */
export function resetPostHog() {
  if (typeof window !== 'undefined') {
    posthog.reset()
    logger.debug('[PostHog] Session reset')
  }
}

export { posthog }
