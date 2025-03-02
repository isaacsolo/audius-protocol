import { Environment } from '../env'

/* FeatureFlags must be lowercase snake case */
export enum FeatureFlags {
  SOLANA_LISTEN_ENABLED = 'solana_listen_enabled',
  SURFACE_AUDIO_ENABLED = 'surface_audio_enabled',
  PREFER_HIGHER_PATCH_FOR_PRIMARY = 'prefer_higher_patch_for_primary',
  PREFER_HIGHER_PATCH_FOR_SECONDARIES = 'prefer_higher_patch_for_secondaries',
  ENABLE_SPL_AUDIO = 'enable_spl_audio',
  DISABLE_SIGN_UP_CONFIRMATION = 'disable_sign_up_confirmation',
  TIPPING_ENABLED = 'tipping_enabled',
  EARLY_ACCESS = 'early_access',
  NEW_ARTIST_DASHBOARD_TABLE = 'new_artist_dashboard_table',
  BUY_AUDIO_COINBASE_ENABLED = 'buy_audio_coinbase_enabled',
  BUY_AUDIO_STRIPE_ENABLED = 'buy_audio_stripe_enabled',
  OFFLINE_MODE_RELEASE = 'offline_mode_release',
  VERIFY_HANDLE_WITH_TIKTOK = 'verify_handle_with_tiktok',
  VERIFY_HANDLE_WITH_TWITTER = 'verify_handle_with_twitter',
  VERIFY_HANDLE_WITH_INSTAGRAM = 'verify_handle_with_instagram',
  RATE_CTA_ENABLED = 'rate_cta_enabled_v2',
  FAST_CACHE = 'fast_cache',
  SAFE_FAST_CACHE = 'safe_fast_cache',
  SIMPLE_CACHE = 'simple_cache',
  PODCAST_CONTROL_UPDATES_ENABLED = 'podcast_control_updates_enabled',
  PODCAST_CONTROL_UPDATES_ENABLED_FALLBACK = 'podcast_control_updates_enabled_fallback',
  LAZY_USERBANK_CREATION_ENABLED = 'lazy_userbank_creation_enabled',
  DISCOVERY_NOTIFICATIONS = 'discovery_notifications',
  REPOST_OF_REPOST_NOTIFICATIONS = 'repost_of_repost_notifications',
  SAVE_OF_REPOST_NOTIFICATIONS = 'save_of_repost_notifications',
  TRENDING_PLAYLIST_NOTIFICATIONS = 'trending_playlist_notifications',
  TRENDING_UNDERGROUND_NOTIFICATIONS = 'trending_underground_notifications',
  TASTEMAKER_NOTIFICATIONS = 'tastemaker_notifications',
  SDK_DISCOVERY_NODE_SELECTOR = 'sdk_discovery_node_selector_2',
  RELATED_ARTISTS_ON_PROFILE_ENABLED = 'related_artists_on_profile_enabled',
  PROXY_WORMHOLE = 'proxy_wormhole',
  AI_ATTRIBUTION = 'ai_attribution',
  DEVELOPER_APPS_PAGE = 'developer_apps_page',
  USDC_PURCHASES = 'usdc_purchases',
  USDC_PURCHASES_UPLOAD = 'usdc_purchases_upload',
  NEW_PLAYLIST_ROUTES = 'new_playlist_routes',
  FEATURE_FLAG_ACCESS = 'feature_flag_access',
  BUY_USDC_VIA_SOL = 'buy_usdc_via_sol',
  IOS_USDC_PURCHASE_ENABLED = 'ios_usdc_purchase_enabled',
  SCHEDULED_RELEASES = 'scheduled_releases',
  BUY_WITH_COINFLOW = 'buy_with_coinflow',
  EDIT_ALBUMS = 'edit_albums',
  COINFLOW_OFFRAMP_ENABLED = 'coinflow_offramp_enabled',
  TIKTOK_NATIVE_AUTH = 'tiktok_native_auth',
  PREMIUM_ALBUMS_ENABLED = 'premium_albums_enabled',
  REWARDS_COOLDOWN = 'rewards_cooldown',
  SDK_MIGRATION_SHADOWING = 'sdk_migration_shadowing',
  DISCOVERY_TIP_REACTIONS = 'discovery_tip_reactions',
  USE_ADDRESS_LOOKUPS = 'use_address_lookups',
  MANAGER_MODE = 'manager_mode',
  SEARCH_V2 = 'search_v2',
  PAYOUT_WALLET_ENABLED = 'payout_wallet_enabled',
  EDIT_TRACK_REDESIGN = 'edit_track_redesign',
  SKIP_STREAM_CHECK = 'skip_stream_check',
  PREFETCH_STREAM_URLS = 'prefetch_stream_urls',
  HIDDEN_PAID_SCHEDULED = 'hidden_paid_scheduled',
  EDITABLE_ACCESS_ENABLED = 'editable_access_enabled',
  PAID_SCHEDULED = 'paid_scheduled'
}

type FlagDefaults = Record<FeatureFlags, boolean>

export const environmentFlagDefaults: Record<
  Environment,
  Partial<FlagDefaults>
> = {
  development: {},
  staging: {},
  production: {}
}

/**
 * If optimizely errors, these default values are used.
 */
export const flagDefaults: FlagDefaults = {
  [FeatureFlags.SOLANA_LISTEN_ENABLED]: false,
  [FeatureFlags.SURFACE_AUDIO_ENABLED]: false,
  [FeatureFlags.PREFER_HIGHER_PATCH_FOR_PRIMARY]: true,
  [FeatureFlags.PREFER_HIGHER_PATCH_FOR_SECONDARIES]: true,
  [FeatureFlags.ENABLE_SPL_AUDIO]: false,
  [FeatureFlags.DISABLE_SIGN_UP_CONFIRMATION]: false,
  [FeatureFlags.TIPPING_ENABLED]: false,
  [FeatureFlags.EARLY_ACCESS]: false,
  [FeatureFlags.NEW_ARTIST_DASHBOARD_TABLE]: false,
  [FeatureFlags.BUY_AUDIO_COINBASE_ENABLED]: false,
  [FeatureFlags.BUY_AUDIO_STRIPE_ENABLED]: false,
  [FeatureFlags.OFFLINE_MODE_RELEASE]: true,
  [FeatureFlags.VERIFY_HANDLE_WITH_TIKTOK]: false,
  [FeatureFlags.VERIFY_HANDLE_WITH_TWITTER]: false,
  [FeatureFlags.VERIFY_HANDLE_WITH_INSTAGRAM]: false,
  [FeatureFlags.RATE_CTA_ENABLED]: false,
  [FeatureFlags.FAST_CACHE]: false,
  [FeatureFlags.SAFE_FAST_CACHE]: false,
  [FeatureFlags.SIMPLE_CACHE]: false,
  [FeatureFlags.PODCAST_CONTROL_UPDATES_ENABLED]: false,
  [FeatureFlags.PODCAST_CONTROL_UPDATES_ENABLED_FALLBACK]: false,
  [FeatureFlags.LAZY_USERBANK_CREATION_ENABLED]: false,
  [FeatureFlags.DISCOVERY_NOTIFICATIONS]: false,
  [FeatureFlags.REPOST_OF_REPOST_NOTIFICATIONS]: false,
  [FeatureFlags.SAVE_OF_REPOST_NOTIFICATIONS]: false,
  [FeatureFlags.TRENDING_PLAYLIST_NOTIFICATIONS]: false,
  [FeatureFlags.TRENDING_UNDERGROUND_NOTIFICATIONS]: false,
  [FeatureFlags.TASTEMAKER_NOTIFICATIONS]: false,
  [FeatureFlags.SDK_DISCOVERY_NODE_SELECTOR]: false,
  [FeatureFlags.RELATED_ARTISTS_ON_PROFILE_ENABLED]: false,
  [FeatureFlags.PROXY_WORMHOLE]: false,
  [FeatureFlags.AI_ATTRIBUTION]: false,
  [FeatureFlags.DEVELOPER_APPS_PAGE]: false,
  [FeatureFlags.USDC_PURCHASES]: false,
  [FeatureFlags.USDC_PURCHASES_UPLOAD]: false,
  [FeatureFlags.NEW_PLAYLIST_ROUTES]: false,
  [FeatureFlags.FEATURE_FLAG_ACCESS]: false,
  [FeatureFlags.BUY_USDC_VIA_SOL]: false,
  [FeatureFlags.IOS_USDC_PURCHASE_ENABLED]: true,
  [FeatureFlags.SCHEDULED_RELEASES]: false,
  [FeatureFlags.BUY_WITH_COINFLOW]: false,
  [FeatureFlags.EDIT_ALBUMS]: false,
  [FeatureFlags.COINFLOW_OFFRAMP_ENABLED]: false,
  [FeatureFlags.TIKTOK_NATIVE_AUTH]: true,
  [FeatureFlags.PREMIUM_ALBUMS_ENABLED]: false,
  [FeatureFlags.REWARDS_COOLDOWN]: false,
  [FeatureFlags.SDK_MIGRATION_SHADOWING]: false,
  [FeatureFlags.DISCOVERY_TIP_REACTIONS]: false,
  [FeatureFlags.USE_ADDRESS_LOOKUPS]: false,
  [FeatureFlags.MANAGER_MODE]: false,
  [FeatureFlags.SEARCH_V2]: false,
  [FeatureFlags.PAYOUT_WALLET_ENABLED]: false,
  [FeatureFlags.EDIT_TRACK_REDESIGN]: false,
  [FeatureFlags.SKIP_STREAM_CHECK]: false,
  [FeatureFlags.PREFETCH_STREAM_URLS]: false,
  [FeatureFlags.HIDDEN_PAID_SCHEDULED]: false,
  [FeatureFlags.EDITABLE_ACCESS_ENABLED]: false,
  [FeatureFlags.PAID_SCHEDULED]: false
}
