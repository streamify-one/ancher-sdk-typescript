
  
  export namespace Schemas {
    // <Schemas>
  /**
 * Body for POST /users/me/activation-code.
 */
export type ActivationCodeSubmission = {
  /**
   * Activation code to consume
   */
  code: string;
}
/**
 * Body for POST /users/me/api-keys.
 */
export type ApiKeyCreateRequest = {
  /**
   * Label for the key
   */
  name: string;
  /**
   * Body for POST /users/me/api-keys.
   */
  expires_in_days?: (number | null) | undefined;
}
/**
 * Creation response — carries the plaintext key, returned exactly once.
 */
export type ApiKeyCreateResponse = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * User-supplied label
   */
  name: string;
  /**
   * Non-secret display prefix
   */
  key_prefix: string;
  /**
   * Granted scopes
   */
  scopes: Array<string>;
  /**
   * When the key expires (null = never)
   */
  expires_at: (string | null);
  /**
   * Last time the key authenticated a request
   */
  last_used_at: (string | null);
  /**
   * Soft-revocation flag
   */
  revoked: boolean;
  /**
   * Creation timestamp
   */
  created_at: string;
  /**
   * The full API key (shown only once)
   */
  api_key: string;
}
/**
 * API key metadata — never includes the secret.
 */
export type ApiKeyResponse = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * User-supplied label
   */
  name: string;
  /**
   * Non-secret display prefix
   */
  key_prefix: string;
  /**
   * Granted scopes
   */
  scopes: Array<string>;
  /**
   * When the key expires (null = never)
   */
  expires_at: (string | null);
  /**
   * Last time the key authenticated a request
   */
  last_used_at: (string | null);
  /**
   * Soft-revocation flag
   */
  revoked: boolean;
  /**
   * Creation timestamp
   */
  created_at: string;
}
/**
 * Transmuter for S3Object model (content stored in S3).
 */
export type S3Object = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * S3 object key
   */
  s3_id: string;
  /**
   * SHA256 hash of file content
   */
  content_hash: string;
  /**
   * MD5 hash of file content
   */
  content_hash_md5: string;
  /**
   * File size in bytes
   */
  size: number;
  /**
   * MIME type of the file content
   */
  mimetype: string;
  /**
   * Content metadata (e.g. image width/height in pixels)
   */
  meta: Record<string, unknown>;
}
/**
 * Transmuter for FileRevision model (file-to-S3Object association).
 */
export type FileRevision = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * File this revision belongs to
   */
  file_id: string;
  /**
   * S3 content object for this revision
   */
  s3_object_id: string;
  /**
   * Revision number within the file
   */
  revision_number: number;
  s3_object: (S3Object | null);
}
/**
 * Transmuter for File model.
 */
export type File = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Parent file id
   */
  parent_file_id: (string | null);
  /**
   * User who uploaded this file
   */
  user_id: (string | null);
  /**
   * file name
   */
  filename: string;
  /**
   * Currently active revision
   */
  current_revision_id: (string | null);
  /**
   * Whether file is publicly accessible
   */
  is_public: boolean;
  /**
   * When this file expires and should be cleaned up
   */
  expires_at: (string | null);
  revision: (FileRevision | null);
  /**
   * S3 object key
   */
  s3_id: string;
  /**
   * SHA256 hash of file content
   */
  content_hash: string;
  /**
   * MD5 hash of file content
   */
  content_hash_md5: string;
  /**
   * File size in bytes
   */
  size: number;
  /**
   * MIME type of the file
   */
  mimetype: string;
  /**
   * Presigned CDN download URL. Populated by an active presign context; null in non-router contexts (worker / agent paths).
   */
  presigned_url: (string | null);
}
/**
 * Schema for article data.
 */
export type Article = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Processing status
   */
  status: ("queued" | "processing" | "ready" | "error");
  /**
   * Error message if failed
   */
  error_message: (string | null);
  /**
   * Article title (extracted during parsing)
   */
  title: (string | null);
  /**
   * Article description
   */
  description: (string | null);
  /**
   * Article author name
   */
  author: (string | null);
  /**
   * Original publication date
   */
  published_date: (string | null);
  /**
   * Name of the website or publication
   */
  site_name: (string | null);
  /**
   * Content language code
   */
  language: string;
  /**
   * Arbitrary metadata
   */
  metadata_: (Record<string, unknown> | null);
  /**
   * Normalized URL
   */
  url: (string | null);
  /**
   * Source: file, text, or platform name
   */
  source: string;
  /**
   * Combined SHA256 hash of origin file content hashes for deduplication
   */
  origin_files_hash: (string | null);
  /**
   * Combined MD5 hash of origin file content hashes for redundant deduplication
   */
  origin_files_hash_md5: (string | null);
  files: Record<string, File>;
  /**
   * User-uploaded source files (not present for URL/text-sourced notes)
   */
  origin_files: Array<File>;
}
/**
 * Request schema for creating note from an already-uploaded file.
 */
export type ArticleCreateFromFile = {
  /**
   * ID of the uploaded file
   */
  file_id: string;
  /**
   * Request schema for creating note from an already-uploaded file.
   */
  comment?: (string | null) | undefined;
}
/**
 * Request schema for creating note from plain text content.
 */
export type ArticleCreateFromText = {
  /**
   * Plain text content
   */
  text: string;
  /**
   * Request schema for creating note from plain text content.
   */
  comment?: (string | null) | undefined;
}
/**
 * Request schema for creating note from a URL or share text containing a URL.
 */
export type ArticleCreateFromUrl = {
  /**
   * URL or share text containing a URL
   */
  text: string;
  /**
   * Request schema for creating note from a URL or share text containing a URL.
   */
  comment?: (string | null) | undefined;
}
export type Artifact = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Owner user ID
   */
  user_id: string;
  /**
   * Short user-facing name
   */
  name: string;
  /**
   * Optional longer description
   */
  description: (string | null);
  /**
   * Public visibility
   */
  is_public: boolean;
  /**
   * Share slug; serves as the <slug>.ancher.app subdomain
   */
  slug: string;
  /**
   * Reaction to the artifact
   */
  reaction: (("like" | "dislike" | "neutral") | null);
  /**
   * Files attached to this artifact, keyed by category.
   */
  files: Record<string, File>;
  /**
   * MIME type of the active content file
   */
  mimetype: (string | null);
  /**
   * Size in bytes of the active content file
   */
  size: (number | null);
  /**
   * Primary (content) file ID
   */
  content_file_id: string;
  /**
   * Display file ID if a renderable sibling exists
   */
  display_file_id: (string | null);
  /**
   * Thumbnail file ID if a thumbnail sibling exists
   */
  thumbnail_file_id: (string | null);
  /**
   * Whether the content file is an HTML page, derived from its MIME type (the same check the public resolver gates on). Gates share_url. Null when the content file is not loaded.
   */
  is_html: (boolean | null);
  /**
   * Public page URL (https://<slug>.<share-domain>) when the artifact is public and its content is HTML; null otherwise. Non-HTML content is rejected by the public resolver (404), so no URL is advertised. Revoking is_public drops this and makes the page itself 404.
   */
  share_url: (string | null);
}
export type ArtifactCreate = {
  /**
   * ID of the file to wrap
   */
  file_id: string;
  /**
   * Short user-facing name
   */
  name: string;
  description?: (string | null) | undefined;
}
export type ArtifactUpdate = Partial<{ name: (string | null), description: (string | null), is_public: (boolean | null), reaction: (("like" | "dislike" | "neutral") | null) }>
/**
 * Granted / used / remaining for one credit bucket — a complete gauge.
 */
export type BucketUsage = {
  /**
   * Live (non-expired) credits granted into the bucket
   */
  granted: string;
  /**
   * Credits consumed from those grants
   */
  used: string;
  /**
   * granted - used
   */
  remaining: string;
}
/**
 * Response for ``GET /me/billing/credits``.
 * 
 * Totals only — ledger history is deliberately NOT included (it grows
 * unbounded); a dedicated paginated endpoint can serve it if a client
 * ever needs the history.
 */
export type BalanceResponse = {
  /**
   * Monthly subscription credits (expire per credit window)
   */
  subscription: BucketUsage;
  /**
   * Purchased top-up credits (never expire)
   */
  topup: BucketUsage;
}
/**
 * Schema for error detail information.
 */
export type ErrorDetail = {
  /**
   * Error code (e.g., API-FLS001)
   */
  code: string;
  /**
   * Human-readable error message
   */
  message: string;
  /**
   * Additional error context
   */
  details: (Record<string, unknown> | null);
}
/**
 * Individual file upload result.
 */
export type BatchFileUploadResult = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Parent file id
   */
  parent_file_id: (string | null);
  /**
   * file name
   */
  filename: (string | null);
  /**
   * S3 object key
   */
  s3_id: (string | null);
  /**
   * SHA256 hash of file content
   */
  content_hash: (string | null);
  /**
   * MD5 hash of file content
   */
  content_hash_md5: (string | null);
  /**
   * File size in bytes
   */
  size: (number | null);
  /**
   * MIME type of the file
   */
  mimetype: (string | null);
  /**
   * Error detail if upload failed
   */
  error: (ErrorDetail | null);
}
/**
 * Body for POST /external-connections/{provider}/authorization.
 */
export type BeginConnectRequest = Partial<{ redirect_after_uri: (string | null), extra_scopes: (Array<string> | null) }>
/**
 * Response for POST /external-connections/{provider}/authorization.
 */
export type BeginConnectResponse = {
  /**
   * Provider-side URL to redirect the user to
   */
  authorize_url: string;
}
export type Body_confirm_verification_api_v1_users_verification_put = {
  /**
   * User's email
   */
  email: string;
  /**
   * 6-digit verification code
   */
  code: string;
}
export type Body_create_file_api_v1_files__post = { file: string, public?: boolean | undefined }
export type Body_create_files_batch_api_v1_files_batch_post = { files: Array<string> }
export type Body_create_image_prompt_api_v1_image_prompts__post = { image: string }
export type Body_revoke_endpoint_api_v1_oauth2_revoke_post = { token: string, token_type_hint?: (string | null) | undefined }
export type Body_update_artifact_content_api_v1_artifacts__artifact_id__content_put = { file: string }
export type Body_update_note_content_file_api_v1_notes__note_id__files__file_id__content_put = { file: string }
/**
 * Schema for changing password.
 */
export type ChangePassword = {
  /**
   * Current password
   */
  current_password: string;
  /**
   * New password
   */
  new_password: string;
}
/**
 * FileReference referencing a DB entity (file, note, or tag).
 */
export type ResourceAttachment = {
  /**
   * ID of the attached resource
   */
  id: string;
  /**
   * Type of the attachment
   */
  type: ("file" | "note" | "tag" | "collection" | "artifact");
}
/**
 * Inline content the user selected for the conversation context.
 */
export type SelectedContentAttachment = {
  /**
   * Inline content the user selected for the conversation context.
   */
  type?: string | undefined;
  /**
   * Whether the selected content is text or an image
   */
  content_type: ("text" | "image");
  /**
   * The selected content — plain text or base64-encoded image
   */
  content: string;
}
export type ClarificationSubmitItem = { question_id: string, value: (string | Array<string>) }
export type ClarificationSubmitPayload = { request_id: string, action: ("answer" | "skip" | "cancel"), answers?: Array<ClarificationSubmitItem> | undefined, note?: (string | null) | undefined }
/**
 * Unified schema for chat requests (both new and continuing conversations).
 */
export type ChatRequestSchema = Partial<{ content: (string | null), voice_file_id: (string | null), attachments: Array<(ResourceAttachment | SelectedContentAttachment)>, enable_kb_search: boolean, enable_web_search: boolean, clarification: (ClarificationSubmitPayload | null) }>
/**
 * Request body for ``POST /me/billing/checkout-session``.
 */
export type CheckoutSessionRequest = {
  /**
   * Plan to check out
   */
  plan_slug: string;
  /**
   * Payment provider
   */
  provider: ("stripe" | "apple" | "google" | "internal");
}
/**
 * Response for ``POST /me/billing/checkout-session``.
 */
export type CheckoutSessionResponse = {
  /**
   * Provider that owns the session
   */
  provider: ("stripe" | "apple" | "google" | "internal");
  /**
   * Hosted-checkout URL the client should redirect to (Stripe). Null for mobile providers.
   */
  hosted_url: (string | null);
  /**
   * Provider-side session identifier — useful for client-side analytics.
   */
  session_token: (string | null);
}
/**
 * Response for ``GET /me/billing/checkout-session/{session_id}``.
 */
export type CheckoutSessionStatusResponse = {
  /**
   * 'complete' once the user finished checkout; 'open' while still in progress; 'expired' when abandoned past its lifetime.
   */
  status: ("open" | "complete" | "expired");
  /**
   * 'paid' once funds are captured; 'unpaid' while an async payment method is still processing; 'no_payment_required' for trials.
   */
  payment_status: ("paid" | "unpaid" | "no_payment_required");
  /**
   * 'payment' for one-time credit-pack purchases; 'subscription' for recurring plans.
   */
  mode: ("payment" | "subscription");
  /**
   * True once a one-time purchase has had its topup credits applied to the balance. Always false for subscription sessions.
   */
  credits_granted: boolean;
}
/**
 * Transmuter for FileReference model.
 */
export type FileReference = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Reference to the file
   */
  file_id: string;
  /**
   * Reference to the owning entity
   */
  owner_id: string;
  /**
   * Whether this owner holds mutation rights
   */
  mutable: boolean;
  /**
   * Collection group discriminator
   */
  label: (string | null);
  /**
   * Semantic category
   */
  category: (string | null);
  file: (File | null);
}
/**
 * Schema for embedded text chunks.
 */
export type Chunk = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * The embedded text content of this chunk
   */
  embedded_text: string;
  /**
   * Reference to the source article
   */
  article_id: string;
  /**
   * Reference to the note
   */
  note_id: (string | null);
  /**
   * Chunk role: 'content' (source-derived text), 'markdown' (split from the note's content file) or 'metadata' (title+tags row)
   */
  kind: ("content" | "markdown" | "metadata");
  file_ref: (FileReference | null);
}
export type ClarificationAnswer = { question_id: string, value: (string | Array<string>) }
export type ClarificationFreeTextAnswer = { label: string, placeholder: (string | null) }
export type ClarificationOption = { label: string, description: (string | null), recommended: boolean }
export type ClarificationQuestion = { id: string, prompt: string, header: (string | null), reason: (string | null), options: Array<ClarificationOption>, free_text: ClarificationFreeTextAnswer }
export type ClarificationRequestedEvent = {
  kind: string;
  request_id: string;
  conversation_id: string;
  message_id: string;
  reason: string;
  questions: Array<ClarificationQuestion>;
  /**
   * Number of questions in this clarification request
   */
  remaining_question_budget: number;
}
export type ClarificationResolvedEvent = { kind: string, request_id: string, conversation_id: string, message_id: string, status: ("answered" | "skipped" | "cancelled"), answers: Array<ClarificationAnswer>, note: (string | null), assistant_summary: string, response_assistant_message_id: (string | null), response_run_id: (string | null) }
/**
 * Schema for collection data.
 */
export type Collection = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Collection name
   */
  name: string;
  /**
   * Collection description
   */
  description: (string | null);
  /**
   * Collection color token
   */
  color: ("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose");
  /**
   * Owner user ID
   */
  user_id: string;
  /**
   * Collection status: active or archived
   */
  status: ("active" | "archived");
}
/**
 * Request schema for appending a single artifact to a collection.
 */
export type CollectionArtifactAppend = {
  /**
   * Artifact ID to add to the collection
   */
  artifact_id: string;
}
/**
 * Request schema for setting artifacts on a collection.
 */
export type CollectionArtifactsUpdate = {
  /**
   * List of artifact IDs to set on the collection
   */
  artifact_ids: Array<string>;
}
/**
 * Request schema for creating a collection.
 */
export type CollectionCreate = {
  /**
   * Collection name
   */
  name: string;
  /**
   * Request schema for creating a collection.
   */
  description?: (string | null) | undefined;
  /**
   * Request schema for creating a collection.
   */
  color?: (("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose") | null) | undefined;
}
/**
 * Request schema for appending a single note to a collection.
 */
export type CollectionNoteAppend = {
  /**
   * Note ID to add to the collection
   */
  note_id: string;
}
/**
 * Request schema for setting notes on a collection.
 */
export type CollectionNotesUpdate = {
  /**
   * List of note IDs to set on the collection
   */
  note_ids: Array<string>;
}
/**
 * Schema for tag data.
 */
export type Tag = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Tag name
   */
  name: string;
  /**
   * Tag palette color
   */
  color: ("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose");
  /**
   * Owner user ID
   */
  user_id: string;
}
/**
 * Response schema for a user's note.
 */
export type Note = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Processing status
   */
  status: ("queued" | "processing" | "ready" | "error");
  /**
   * Error message if failed
   */
  error_message: (string | null);
  /**
   * When the owner last opened this note through the API
   */
  last_accessed_at: (string | null);
  /**
   * Comment from the user during save/share
   */
  comment: (string | null);
  /**
   * Whether this note is publicly accessible
   */
  is_public: boolean;
  /**
   * URL-safe slug derived from title, used for share links
   */
  slug: string;
  /**
   * Reaction to the note: like or dislike
   */
  reaction: (("like" | "dislike" | "neutral") | null);
  /**
   * User who saved this note
   */
  user_id: string;
  /**
   * Referenced article ID
   */
  article_id: string;
  /**
   * Source: file, text, URL, conversation, message, or artifact
   */
  source: string;
  files: Record<string, File>;
  /**
   * Article data
   */
  article: (Article | null);
  /**
   * Tags for this note
   */
  tags: Array<Tag>;
  /**
   * Collections containing this note
   */
  collections: Array<Collection>;
  /**
   * Effective title: the user-edited override when set, otherwise article.title; writes set the override
   */
  title: (string | null);
  /**
   * Effective description: the user-edited override when set, otherwise article.description; writes set the override
   */
  description: (string | null);
}
/**
 * Schema for collection suggestion data.
 */
export type CollectionSuggestion = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Note this suggestion is about
   */
  note_id: string;
  /**
   * Collection the note is being suggested for
   */
  collection_id: string;
  /**
   * Owner user ID
   */
  user_id: string;
  /**
   * Classifier confidence in [0.0, 1.0]
   */
  confidence: number;
  /**
   * Optional explanation of why this collection fits
   */
  reason: (string | null);
  /**
   * Suggestion status: pending, accepted, or dismissed
   */
  status: ("pending" | "accepted" | "dismissed");
  /**
   * The note being suggested
   */
  note: (Note | null);
  /**
   * The candidate collection
   */
  collection: (Collection | null);
}
export type CollectionSuggestionEnvelope = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * User who received this notification
   */
  user_id: string;
  /**
   * Display title
   */
  title: (string | null);
  /**
   * Display subtitle
   */
  subtitle: (string | null);
  /**
   * Display body
   */
  body: (string | null);
  /**
   * Inbox read state
   */
  status: ("unread" | "read" | "dismissed");
  /**
   * When first marked read or dismissed
   */
  read_at: (string | null);
  /**
   * When the notification was created
   */
  created_at: string;
  /**
   * Notification type discriminator
   */
  type: string;
  /**
   * The carried collection suggestion
   */
  suggestion: CollectionSuggestion;
}
/**
 * Request schema for updating a collection.
 */
export type CollectionUpdate = Partial<{ name: (string | null), description: (string | null), color: (("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose") | null), status: (("active" | "archived") | null) }>
/**
 * Schema for completing a direct upload.
 */
export type CompleteUploadRequest = {
  /**
   * S3 object key that was uploaded
   */
  s3_key: string;
  /**
   * Schema for completing a direct upload.
   */
  filename?: (string | null) | undefined;
}
/**
 * Public view of a connection row — never carries decrypted credentials.
 */
export type ConnectionSummary = { id: string, provider: string, provider_account_id: string, provider_account_label: (string | null), scopes: Array<string>, status: string, expires_at: string, last_used_at: (string | null) }
export type Recommendation = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Owner user ID
   */
  user_id: string;
  /**
   * Collection this recommendation belongs to
   */
  collection_id: string;
  /**
   * Recommended URL
   */
  url: string;
  /**
   * Title of the recommended content
   */
  title: string;
  /**
   * Search result snippet
   */
  snippet: (string | null);
  /**
   * Source website name
   */
  site_name: (string | null);
  /**
   * Query that found this
   */
  search_query: (string | null);
  /**
   * Recommendation status
   */
  status: ("active" | "dismissed" | "saved" | "not_interested");
  /**
   * Note created on save action
   */
  note_id: (string | null);
  /**
   * The source collection
   */
  collection: (Collection | null);
}
export type ContentRecommendationEnvelope = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * User who received this notification
   */
  user_id: string;
  /**
   * Display title
   */
  title: (string | null);
  /**
   * Display subtitle
   */
  subtitle: (string | null);
  /**
   * Display body
   */
  body: (string | null);
  /**
   * Inbox read state
   */
  status: ("unread" | "read" | "dismissed");
  /**
   * When first marked read or dismissed
   */
  read_at: (string | null);
  /**
   * When the notification was created
   */
  created_at: string;
  /**
   * Notification type discriminator
   */
  type: string;
  /**
   * The carried content recommendation
   */
  recommendation: Recommendation;
}
/**
 * Transmuter for Conversation model.
 */
export type Conversation = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Reference to the user
   */
  user_id: string;
  /**
   * Name of the conversation
   */
  name: (string | null);
  /**
   * Whether this conversation is pinned in the sidebar
   */
  pinned: boolean;
}
/**
 * Feature flag configuration for conversation limits.
 */
export type ConversationFeatureFlag = Partial<{ daily_messages: number, tokens_per_message: number, tokens_per_day: number, system_prompt_key: string, use_review_agent: boolean, enable_agent_skills: boolean }>
/**
 * Receipt returned when an async conversation run has been accepted.
 */
export type ConversationRunReceipt = {
  /**
   * ID of the conversation
   */
  conversation_id: string;
  /**
   * ID of the assistant message placeholder being generated
   */
  message_id: string;
  /**
   * ID of the persisted user message
   */
  user_message_id: string;
  /**
   * API-generated ID for this chat run
   */
  run_id: string;
  /**
   * URL for the live/replay SSE stream
   */
  stream_url: string;
  /**
   * Current async chat run status
   */
  status: ("running" | "finished" | "cancelled");
}
/**
 * Base schema for conversations.
 */
export type ConversationSchema = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Name or title of the conversation
   */
  name: (string | null);
  /**
   * ID of the user who owns this conversation
   */
  user_id: string;
  /**
   * Whether this conversation is pinned in the sidebar
   */
  pinned: boolean;
}
/**
 * Schema for updating a conversation (request).
 */
export type ConversationUpdateRequest = Partial<{ name: (string | null), pinned: (boolean | null) }>
export type NumericCriteria_datetime_ = Partial<{ eq: (string | null), is_null: (boolean | null), ne: (string | null), in: (Array<string> | null), not_in: (Array<string> | null), lt: (string | null), le: (string | null), gt: (string | null), ge: (string | null) }>
export type TextCriteria_str_ = Partial<{ eq: (string | null), is_null: (boolean | null), ne: (string | null), in: (Array<string> | null), not_in: (Array<string> | null), lt: (string | null), le: (string | null), gt: (string | null), ge: (string | null), contains: (string | null), not_contains: (string | null), starts_with: (string | null), ends_with: (string | null), like: (string | null), ilike: (string | null), not_like: (string | null) }>
export type NumericCriteria_UUID_ = Partial<{ eq: (string | null), is_null: (boolean | null), ne: (string | null), in: (Array<string> | null), not_in: (Array<string> | null), lt: (string | null), le: (string | null), gt: (string | null), ge: (string | null) }>
export type ExactCriteria_Literal__queued____processing____ready____error___ = Partial<{ eq: (("queued" | "processing" | "ready" | "error") | null), is_null: (boolean | null), ne: (("queued" | "processing" | "ready" | "error") | null), in: (Array<("queued" | "processing" | "ready" | "error")> | null), not_in: (Array<("queued" | "processing" | "ready" | "error")> | null) }>
export type Criteria_Article_ = Partial<{ and: (Array<Criteria_Article_> | null), or: (Array<Criteria_Article_> | null), not: (Criteria_Article_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), status: (ExactCriteria_Literal__queued____processing____ready____error___ | null), error_message: (TextCriteria_str_ | null), title: (TextCriteria_str_ | null), description: (TextCriteria_str_ | null), author: (TextCriteria_str_ | null), published_date: (NumericCriteria_datetime_ | null), site_name: (TextCriteria_str_ | null), language: (TextCriteria_str_ | null), url: (TextCriteria_str_ | null), source: (TextCriteria_str_ | null), origin_files_hash: (TextCriteria_str_ | null), origin_files_hash_md5: (TextCriteria_str_ | null) }>
export type NumericCriteria_bool_ = Partial<{ eq: (boolean | null), is_null: (boolean | null), ne: (boolean | null), in: (Array<boolean> | null), not_in: (Array<boolean> | null), lt: (boolean | null), le: (boolean | null), gt: (boolean | null), ge: (boolean | null) }>
export type ExactCriteria_Literal__like____dislike____neutral___ = Partial<{ eq: (("like" | "dislike" | "neutral") | null), is_null: (boolean | null), ne: (("like" | "dislike" | "neutral") | null), in: (Array<("like" | "dislike" | "neutral")> | null), not_in: (Array<("like" | "dislike" | "neutral")> | null) }>
export type NumericCriteria_int_ = Partial<{ eq: (number | null), is_null: (boolean | null), ne: (number | null), in: (Array<number> | null), not_in: (Array<number> | null), lt: (number | null), le: (number | null), gt: (number | null), ge: (number | null) }>
export type Criteria_Artifact_ = Partial<{ and: (Array<Criteria_Artifact_> | null), or: (Array<Criteria_Artifact_> | null), not: (Criteria_Artifact_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), user_id: (NumericCriteria_UUID_ | null), name: (TextCriteria_str_ | null), description: (TextCriteria_str_ | null), is_public: (NumericCriteria_bool_ | null), slug: (TextCriteria_str_ | null), reaction: (ExactCriteria_Literal__like____dislike____neutral___ | null), mimetype: (TextCriteria_str_ | null), size: (NumericCriteria_int_ | null) }>
export type NumericCriteria_float_ = Partial<{ eq: (number | null), is_null: (boolean | null), ne: (number | null), in: (Array<number> | null), not_in: (Array<number> | null), lt: (number | null), le: (number | null), gt: (number | null), ge: (number | null) }>
export type ExactCriteria_Literal__pending____accepted____dismissed___ = Partial<{ eq: (("pending" | "accepted" | "dismissed") | null), is_null: (boolean | null), ne: (("pending" | "accepted" | "dismissed") | null), in: (Array<("pending" | "accepted" | "dismissed")> | null), not_in: (Array<("pending" | "accepted" | "dismissed")> | null) }>
export type Criteria_CollectionSuggestion_ = Partial<{ and: (Array<Criteria_CollectionSuggestion_> | null), or: (Array<Criteria_CollectionSuggestion_> | null), not: (Criteria_CollectionSuggestion_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), note_id: (NumericCriteria_UUID_ | null), collection_id: (NumericCriteria_UUID_ | null), user_id: (NumericCriteria_UUID_ | null), confidence: (NumericCriteria_float_ | null), reason: (TextCriteria_str_ | null), status: (ExactCriteria_Literal__pending____accepted____dismissed___ | null) }>
export type ExactCriteria_Literal__neutral____slate____gray____zinc____stone____red____orange____amber____yellow____lime____green____emerald____teal____cyan____sky____blue____indigo____violet____purple____fuchsia____pink____rose___ = Partial<{ eq: (("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose") | null), is_null: (boolean | null), ne: (("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose") | null), in: (Array<("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose")> | null), not_in: (Array<("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose")> | null) }>
export type ExactCriteria_Literal__active____archived___ = Partial<{ eq: (("active" | "archived") | null), is_null: (boolean | null), ne: (("active" | "archived") | null), in: (Array<("active" | "archived")> | null), not_in: (Array<("active" | "archived")> | null) }>
export type Criteria_Collection_ = Partial<{ and: (Array<Criteria_Collection_> | null), or: (Array<Criteria_Collection_> | null), not: (Criteria_Collection_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), name: (TextCriteria_str_ | null), description: (TextCriteria_str_ | null), color: (ExactCriteria_Literal__neutral____slate____gray____zinc____stone____red____orange____amber____yellow____lime____green____emerald____teal____cyan____sky____blue____indigo____violet____purple____fuchsia____pink____rose___ | null), user_id: (NumericCriteria_UUID_ | null), status: (ExactCriteria_Literal__active____archived___ | null) }>
export type Criteria_Conversation_ = Partial<{ and: (Array<Criteria_Conversation_> | null), or: (Array<Criteria_Conversation_> | null), not: (Criteria_Conversation_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), user_id: (NumericCriteria_UUID_ | null), name: (TextCriteria_str_ | null), pinned: (NumericCriteria_bool_ | null) }>
export type Criteria_FileReference_ = Partial<{ and: (Array<Criteria_FileReference_> | null), or: (Array<Criteria_FileReference_> | null), not: (Criteria_FileReference_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), file_id: (NumericCriteria_UUID_ | null), owner_id: (NumericCriteria_UUID_ | null), mutable: (NumericCriteria_bool_ | null), label: (TextCriteria_str_ | null), category: (TextCriteria_str_ | null) }>
export type Criteria_FileRevision_ = Partial<{ and: (Array<Criteria_FileRevision_> | null), or: (Array<Criteria_FileRevision_> | null), not: (Criteria_FileRevision_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), file_id: (NumericCriteria_UUID_ | null), s3_object_id: (NumericCriteria_UUID_ | null), revision_number: (NumericCriteria_int_ | null) }>
export type Criteria_File_ = Partial<{ and: (Array<Criteria_File_> | null), or: (Array<Criteria_File_> | null), not: (Criteria_File_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), parent_file_id: (NumericCriteria_UUID_ | null), user_id: (NumericCriteria_UUID_ | null), filename: (TextCriteria_str_ | null), current_revision_id: (NumericCriteria_UUID_ | null), is_public: (NumericCriteria_bool_ | null), expires_at: (NumericCriteria_datetime_ | null), size: (NumericCriteria_int_ | null), mimetype: (TextCriteria_str_ | null) }>
export type Criteria_KeyFrame_ = Partial<{ and: (Array<Criteria_KeyFrame_> | null), or: (Array<Criteria_KeyFrame_> | null), not: (Criteria_KeyFrame_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), milliseconds: (NumericCriteria_int_ | null), description: (TextCriteria_str_ | null), video_id: (NumericCriteria_UUID_ | null) }>
export type ExactCriteria_Literal__user____assistant___ = Partial<{ eq: (("user" | "assistant") | null), is_null: (boolean | null), ne: (("user" | "assistant") | null), in: (Array<("user" | "assistant")> | null), not_in: (Array<("user" | "assistant")> | null) }>
export type Criteria_Message_ = Partial<{ and: (Array<Criteria_Message_> | null), or: (Array<Criteria_Message_> | null), not: (Criteria_Message_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), conversation_id: (NumericCriteria_UUID_ | null), user_id: (NumericCriteria_UUID_ | null), role: (ExactCriteria_Literal__user____assistant___ | null), content: (TextCriteria_str_ | null), enable_kb_search: (NumericCriteria_bool_ | null), enable_web_search: (NumericCriteria_bool_ | null), reaction: (ExactCriteria_Literal__like____dislike____neutral___ | null), agent_run_id: (NumericCriteria_UUID_ | null), clarification_request_id: (NumericCriteria_UUID_ | null) }>
export type Criteria_Note_ = Partial<{ and: (Array<Criteria_Note_> | null), or: (Array<Criteria_Note_> | null), not: (Criteria_Note_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), status: (ExactCriteria_Literal__queued____processing____ready____error___ | null), error_message: (TextCriteria_str_ | null), last_accessed_at: (NumericCriteria_datetime_ | null), reindex_requested_at: (NumericCriteria_datetime_ | null), comment: (TextCriteria_str_ | null), title_override: (TextCriteria_str_ | null), description_override: (TextCriteria_str_ | null), is_public: (NumericCriteria_bool_ | null), slug: (TextCriteria_str_ | null), reaction: (ExactCriteria_Literal__like____dislike____neutral___ | null), user_id: (NumericCriteria_UUID_ | null), article_id: (NumericCriteria_UUID_ | null), source: (TextCriteria_str_ | null), title: (TextCriteria_str_ | null), description: (TextCriteria_str_ | null) }>
export type ExactCriteria_Literal__collection_suggestion____content_recommendation____daily_digest____system___ = Partial<{ eq: (("collection_suggestion" | "content_recommendation" | "daily_digest" | "system") | null), is_null: (boolean | null), ne: (("collection_suggestion" | "content_recommendation" | "daily_digest" | "system") | null), in: (Array<("collection_suggestion" | "content_recommendation" | "daily_digest" | "system")> | null), not_in: (Array<("collection_suggestion" | "content_recommendation" | "daily_digest" | "system")> | null) }>
export type ExactCriteria_Literal__unread____read____dismissed___ = Partial<{ eq: (("unread" | "read" | "dismissed") | null), is_null: (boolean | null), ne: (("unread" | "read" | "dismissed") | null), in: (Array<("unread" | "read" | "dismissed")> | null), not_in: (Array<("unread" | "read" | "dismissed")> | null) }>
export type Criteria_Notification_ = Partial<{ and: (Array<Criteria_Notification_> | null), or: (Array<Criteria_Notification_> | null), not: (Criteria_Notification_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), user_id: (NumericCriteria_UUID_ | null), type: (ExactCriteria_Literal__collection_suggestion____content_recommendation____daily_digest____system___ | null), title: (TextCriteria_str_ | null), subtitle: (TextCriteria_str_ | null), body: (TextCriteria_str_ | null), status: (ExactCriteria_Literal__unread____read____dismissed___ | null), read_at: (NumericCriteria_datetime_ | null) }>
export type ExactCriteria_Literal__note____collection____artifact___ = Partial<{ eq: (("note" | "collection" | "artifact") | null), is_null: (boolean | null), ne: (("note" | "collection" | "artifact") | null), in: (Array<("note" | "collection" | "artifact")> | null), not_in: (Array<("note" | "collection" | "artifact")> | null) }>
export type Criteria_PinnedItem_ = Partial<{ and: (Array<Criteria_PinnedItem_> | null), or: (Array<Criteria_PinnedItem_> | null), not: (Criteria_PinnedItem_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), user_id: (NumericCriteria_UUID_ | null), entity_id: (NumericCriteria_UUID_ | null), type: (ExactCriteria_Literal__note____collection____artifact___ | null), index: (NumericCriteria_int_ | null) }>
export type ExactCriteria_Literal__active____dismissed____saved____not_interested___ = Partial<{ eq: (("active" | "dismissed" | "saved" | "not_interested") | null), is_null: (boolean | null), ne: (("active" | "dismissed" | "saved" | "not_interested") | null), in: (Array<("active" | "dismissed" | "saved" | "not_interested")> | null), not_in: (Array<("active" | "dismissed" | "saved" | "not_interested")> | null) }>
export type Criteria_Recommendation_ = Partial<{ and: (Array<Criteria_Recommendation_> | null), or: (Array<Criteria_Recommendation_> | null), not: (Criteria_Recommendation_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), user_id: (NumericCriteria_UUID_ | null), collection_id: (NumericCriteria_UUID_ | null), url: (TextCriteria_str_ | null), title: (TextCriteria_str_ | null), snippet: (TextCriteria_str_ | null), site_name: (TextCriteria_str_ | null), search_query: (TextCriteria_str_ | null), status: (ExactCriteria_Literal__active____dismissed____saved____not_interested___ | null), note_id: (NumericCriteria_UUID_ | null) }>
export type Criteria_Tag_ = Partial<{ and: (Array<Criteria_Tag_> | null), or: (Array<Criteria_Tag_> | null), not: (Criteria_Tag_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), name: (TextCriteria_str_ | null), color: (ExactCriteria_Literal__neutral____slate____gray____zinc____stone____red____orange____amber____yellow____lime____green____emerald____teal____cyan____sky____blue____indigo____violet____purple____fuchsia____pink____rose___ | null), user_id: (NumericCriteria_UUID_ | null) }>
export type Criteria_UserSession_ = Partial<{ and: (Array<Criteria_UserSession_> | null), or: (Array<Criteria_UserSession_> | null), not: (Criteria_UserSession_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), user_id: (NumericCriteria_UUID_ | null), access_token_hash: (TextCriteria_str_ | null), refresh_token_hash: (TextCriteria_str_ | null), source: (TextCriteria_str_ | null), device_id: (NumericCriteria_UUID_ | null), app_version: (TextCriteria_str_ | null), user_agent: (TextCriteria_str_ | null), timezone: (TextCriteria_str_ | null), last_used_at: (NumericCriteria_datetime_ | null), is_active: (NumericCriteria_bool_ | null), access_token_expires_at: (NumericCriteria_datetime_ | null), refresh_token_expires_at: (NumericCriteria_datetime_ | null), remember_me: (NumericCriteria_bool_ | null) }>
export type Cursor_Artifact_ = string
export type Cursor_CollectionSuggestion_ = string
export type Cursor_Collection_ = string
export type Cursor_Conversation_ = string
export type Cursor_FileRevision_ = string
export type Cursor_Message_ = string
export type Cursor_Note_ = string
export type Cursor_Notification_ = string
export type Cursor_PinnedItem_ = string
export type Cursor_Recommendation_ = string
export type Cursor_Tag_ = string
export type Cursor_UserSession_ = string
export type DailyDigest = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Owner user ID
   */
  user_id: string;
  /**
   * Generated infographic artifact ID
   */
  artifact_id: (string | null);
  /**
   * Digest title
   */
  title: string;
  /**
   * Digest summary
   */
  summary: string;
  /**
   * Digest key points for the infographic
   */
  key_points: Array<string>;
  /**
   * Digest generation status
   */
  status: ("processing" | "ready" | "error");
  /**
   * UTC date bucket for idempotency
   */
  digest_date: string;
  /**
   * Timestamp when generation completed
   */
  generated_at: (string | null);
  /**
   * Error message when status is error
   */
  error_message: (string | null);
  /**
   * Generated infographic artifact
   */
  artifact: (Artifact | null);
  /**
   * Notes referenced by the digest
   */
  notes: Array<Note>;
}
export type DailyDigestEnvelope = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * User who received this notification
   */
  user_id: string;
  /**
   * Display title
   */
  title: (string | null);
  /**
   * Display subtitle
   */
  subtitle: (string | null);
  /**
   * Display body
   */
  body: (string | null);
  /**
   * Inbox read state
   */
  status: ("unread" | "read" | "dismissed");
  /**
   * When first marked read or dismissed
   */
  read_at: (string | null);
  /**
   * When the notification was created
   */
  created_at: string;
  /**
   * Notification type discriminator
   */
  type: string;
  /**
   * The carried daily digest
   */
  digest: DailyDigest;
}
/**
 * Transmuter for UserSession model.
 */
export type UserSession = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * User ID
   */
  user_id: string;
  /**
   * SHA256 hash of the access token
   */
  access_token_hash: string;
  /**
   * SHA256 hash of the refresh token
   */
  refresh_token_hash: (string | null);
  /**
   * How the session was created
   */
  source: string;
  /**
   * Device identifier
   */
  device_id: string;
  /**
   * App version
   */
  app_version: string;
  /**
   * HTTP User-Agent header
   */
  user_agent: string;
  /**
   * Last known IP address
   */
  ip_address: string;
  /**
   * User timezone
   */
  timezone: string;
  /**
   * Last activity time (auto-set by database)
   */
  last_used_at: (string | null);
  /**
   * Session active status
   */
  is_active: boolean;
  /**
   * When access token expires (null for web sessions)
   */
  access_token_expires_at: (string | null);
  /**
   * When refresh token expires
   */
  refresh_token_expires_at: string;
  /**
   * Whether to persist session cookies (web clients only)
   */
  remember_me: boolean;
  /**
   * Device information
   */
  device: (Device | null);
}
/**
 * Transmuter for Device model.
 */
export type Device = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Reference to the user who owns this device
   */
  user_id: string;
  /**
   * OS name (e.g., iOS, Android)
   */
  os_name: string;
  /**
   * OS version
   */
  os_version: string;
  /**
   * Human-readable device name
   */
  device_name: string;
  /**
   * Device model
   */
  device_model: string;
  /**
   * Application version
   */
  app_version: string;
  /**
   * FCM registration token
   */
  notification_token: (string | null);
  /**
   * Sessions from this device
   */
  sessions: Array<UserSession>;
}
/**
 * Schema for device response.
 */
export type DeviceResponse = {
  /**
   * Device ID
   */
  id: string;
  /**
   * Operating system name
   */
  os_name: string;
  /**
   * Operating system version
   */
  os_version: string;
  /**
   * Human-readable device name
   */
  device_name: string;
  /**
   * Device model
   */
  device_model: string;
  /**
   * Application version
   */
  app_version: string;
  /**
   * FCM registration token
   */
  notification_token: (string | null);
}
/**
 * Schema for file information.
 */
export type FileInfo = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Parent file id
   */
  parent_file_id: (string | null);
  /**
   * file name
   */
  filename: string;
  /**
   * Currently active revision
   */
  current_revision_id: (string | null);
  /**
   * Whether file is publicly accessible
   */
  is_public: boolean;
  /**
   * When this file expires and should be cleaned up
   */
  expires_at: (string | null);
  /**
   * S3 object key
   */
  s3_id: (string | null);
  /**
   * SHA256 hash of file content
   */
  content_hash: (string | null);
  /**
   * MD5 hash of file content
   */
  content_hash_md5: (string | null);
  /**
   * File size in bytes
   */
  size: (number | null);
  /**
   * MIME type of the file
   */
  mimetype: string;
}
/**
 * Flat response schema for file upload endpoints.
 */
export type FileUploadResponse = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Parent file id
   */
  parent_file_id: (string | null);
  /**
   * file name
   */
  filename: string;
  /**
   * Currently active revision
   */
  current_revision_id: (string | null);
  /**
   * Whether file is publicly accessible
   */
  is_public: boolean;
  /**
   * When this file expires and should be cleaned up
   */
  expires_at: (string | null);
  /**
   * S3 object key
   */
  s3_id: (string | null);
  /**
   * SHA256 hash of file content
   */
  content_hash: (string | null);
  /**
   * MD5 hash of file content
   */
  content_hash_md5: (string | null);
  /**
   * File size in bytes
   */
  size: (number | null);
  /**
   * MIME type of the file
   */
  mimetype: (string | null);
}
/**
 * Schema for file integrity verification response - only returned on success.
 */
export type FileVerificationResponse = {
  /**
   * File UUID
   */
  file_id: string;
  /**
   * Whether file exists in database
   */
  db_exists: boolean;
  /**
   * Whether file exists in S3
   */
  s3_exists: boolean;
  /**
   * Whether sizes match between DB and S3
   */
  size_match: boolean;
  /**
   * File size in database
   */
  db_size: number;
  /**
   * File size in S3
   */
  s3_size: number;
}
export type ValidationError = { loc: Array<(string | number)>, msg: string, type: string, input?: unknown | undefined, ctx?: Record<string, unknown> | undefined }
export type HTTPValidationError = Partial<{ detail: Array<ValidationError> }>
/**
 * Reconstructed text-to-image prompt for an uploaded image.
 * 
 * English is always returned (it tends to work best with text-to-image
 * models, and is the universal fallback). For non-English users we also
 * return their own language in ``prompt_local`` (the client shows English
 * first). English users get ``prompt_local``/``local_lang`` as ``null``.
 */
export type ImagePromptResponse = {
  /**
   * Reconstructed prompt in English (always present)
   */
  prompt_en: string;
  /**
   * Reconstructed text-to-image prompt for an uploaded image.
   * 
   * English is always returned (it tends to work best with text-to-image
   * models, and is the universal fallback). For non-English users we also
   * return their own language in ``prompt_local`` (the client shows English
   * first). English users get ``prompt_local``/``local_lang`` as ``null``.
   */
  prompt_local?: (string | null) | undefined;
  /**
   * Reconstructed text-to-image prompt for an uploaded image.
   * 
   * English is always returned (it tends to work best with text-to-image
   * models, and is the universal fallback). For non-English users we also
   * return their own language in ``prompt_local`` (the client shows English
   * first). English users get ``prompt_local``/``local_lang`` as ``null``.
   */
  local_lang?: (string | null) | undefined;
}
/**
 * Feature flag configuration for insight limits.
 */
export type InsightFeatureFlag = Partial<{ daily_count: number, max_data_points: number, history_days: number }>
/**
 * Schema for video entity with metadata.
 */
export type Video = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Video duration in seconds
   */
  duration: (number | null);
  /**
   * Video width in pixels
   */
  width: (number | null);
  /**
   * Video height in pixels
   */
  height: (number | null);
  /**
   * Frames per second
   */
  fps: (number | null);
  /**
   * Whether the video has audio
   */
  has_audio: boolean;
  files: Record<string, File>;
}
/**
 * Schema for video key frame data.
 */
export type KeyFrame = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Timestamp of the key frame in milliseconds
   */
  milliseconds: number;
  /**
   * Description of what happens at this key frame
   */
  description: (string | null);
  /**
   * Source video this key frame was extracted from
   */
  video_id: (string | null);
  files: Record<string, File>;
  video: (Video | null);
}
/**
 * Transmuter for MessageNote junction table.
 */
export type MessageNote = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Reference to the message
   */
  message_id: string;
  /**
   * Reference to the note
   */
  note_id: string;
  /**
   * Index of the note in the message
   */
  index: number;
  /**
   * The attached note
   */
  note: (Note | null);
}
/**
 * Transmuter for MessageTag junction table.
 */
export type MessageTag = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Reference to the message
   */
  message_id: string;
  /**
   * Reference to the tag
   */
  tag_id: string;
  /**
   * Index of the tag in the message
   */
  index: number;
  /**
   * The attached tag
   */
  tag: (Tag | null);
}
/**
 * Transmuter for MessageCollection junction table.
 */
export type MessageCollection = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Reference to the message
   */
  message_id: string;
  /**
   * Reference to the collection
   */
  collection_id: string;
  /**
   * Index of the collection in the message
   */
  index: number;
  /**
   * The attached collection
   */
  collection: (Collection | null);
}
/**
 * Transmuter for MessageSelectedContent table.
 */
export type MessageSelectedContent = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Reference to the message
   */
  message_id: string;
  /**
   * Position among all attachments
   */
  index: number;
  /**
   * Content type: text or image
   */
  content_type: ("text" | "image");
  /**
   * The selected content
   */
  content: string;
}
/**
 * Transmuter for MessageFileReference — an Inventory subclass that owns a FileReference.
 */
export type MessageFileReference = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Reference to the owning message
   */
  message_id: string;
  /**
   * Position of the file in the message
   */
  index: number;
  /**
   * The attached file reference
   */
  file_ref: (FileReference | null);
}
/**
 * Transmuter for MessageArtifact junction table.
 */
export type MessageArtifact = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Reference to the message
   */
  message_id: string;
  /**
   * Reference to the artifact
   */
  artifact_id: string;
  /**
   * Index of the artifact in the message
   */
  index: number;
  /**
   * The attached artifact
   */
  artifact: (Artifact | null);
}
/**
 * Transmuter for public user-visible Message rows.
 */
export type Message = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Reference to the conversation
   */
  conversation_id: string;
  /**
   * Reference to the user
   */
  user_id: string;
  /**
   * Role of the message sender
   */
  role: ("user" | "assistant");
  /**
   * Content of the message
   */
  content: string;
  /**
   * Whether knowledge-base search was enabled for this message turn
   */
  enable_kb_search: boolean;
  /**
   * Whether web search was enabled for this message turn
   */
  enable_web_search: boolean;
  /**
   * Reaction to the message
   */
  reaction: (("like" | "dislike" | "neutral") | null);
  /**
   * Reference to agent run
   */
  agent_run_id: (string | null);
  /**
   * Clarification request id
   */
  clarification_request_id: (string | null);
  /**
   * Public clarification request or response payload
   */
  clarification: (ClarificationRequestedEvent | ClarificationResolvedEvent | null);
  /**
   * Notes attached to this message
   */
  message_notes: Array<MessageNote>;
  /**
   * Tags attached to this message
   */
  message_tags: Array<MessageTag>;
  /**
   * Collections attached to this message
   */
  message_collections: Array<MessageCollection>;
  /**
   * Selected content attached to this message
   */
  message_selected_contents: Array<MessageSelectedContent>;
  /**
   * Ordered file attachments for this message
   */
  message_file_references: Array<MessageFileReference>;
  /**
   * Original voice input file reference
   */
  voice_file_reference: (FileReference | null);
  /**
   * Artifacts attached to this message
   */
  message_artifacts: Array<MessageArtifact>;
}
/**
 * Schema for updating a message (request).
 * 
 * Convention: ``reaction=null`` (or absent) is a no-op — it leaves the
 * existing value untouched. Send ``reaction='neutral'`` to clear a
 * previous like/dislike.
 */
export type MessageUpdateRequest = Partial<{ reaction: (("like" | "dislike" | "neutral") | null) }>
export type NestedCriteriaBranch_Note_ = Partial<{ and: (Array<Criteria_Note_> | null), or: (Array<Criteria_Note_> | null), not: (Criteria_Note_ | null), created_at: (NumericCriteria_datetime_ | null), created_by: (TextCriteria_str_ | null), updated_at: (NumericCriteria_datetime_ | null), updated_by: (TextCriteria_str_ | null), id: (NumericCriteria_UUID_ | null), status: (ExactCriteria_Literal__queued____processing____ready____error___ | null), error_message: (TextCriteria_str_ | null), last_accessed_at: (NumericCriteria_datetime_ | null), reindex_requested_at: (NumericCriteria_datetime_ | null), comment: (TextCriteria_str_ | null), title_override: (TextCriteria_str_ | null), description_override: (TextCriteria_str_ | null), is_public: (NumericCriteria_bool_ | null), slug: (TextCriteria_str_ | null), reaction: (ExactCriteria_Literal__like____dislike____neutral___ | null), user_id: (NumericCriteria_UUID_ | null), article_id: (NumericCriteria_UUID_ | null), source: (TextCriteria_str_ | null), title: (TextCriteria_str_ | null), description: (TextCriteria_str_ | null), file_refs: (Criteria_FileReference_ | null), files: (Criteria_File_ | null), key_frames: (Criteria_KeyFrame_ | null), article: (Criteria_Article_ | null), tags: (Criteria_Tag_ | null), collections: (Criteria_Collection_ | null) }>
export type NestedCursor_Note_ = string
/**
 * Schema for login response - tokens only, no user info for security.
 */
export type NewSessionResponse = {
  /**
   * JWT access token
   */
  access_token: string;
  /**
   * JWT refresh token
   */
  refresh_token: string;
  /**
   * Token type
   */
  token_type: string;
  /**
   * Access token expiration time in seconds
   */
  expires_in: number;
  /**
   * Whether session cookies should persist (web clients only)
   */
  remember_me: boolean;
}
/**
 * Request schema for copying a public note.
 */
export type NoteCopy = Partial<{ comment: (string | null) }>
/**
 * Request schema for creating a note from an artifact.
 */
export type NoteCreateFromArtifact = {
  /**
   * Artifact ID to create note from
   */
  artifact_id: string;
  /**
   * Request schema for creating a note from an artifact.
   */
  comment?: (string | null) | undefined;
}
/**
 * Request schema for creating a note from a conversation.
 */
export type NoteCreateFromConversation = {
  /**
   * Conversation ID to save as note
   */
  conversation_id: string;
  /**
   * Request schema for creating a note from a conversation.
   */
  comment?: (string | null) | undefined;
}
/**
 * Request schema for creating a note from a single message.
 */
export type NoteCreateFromMessage = {
  /**
   * Conversation the message belongs to
   */
  conversation_id: string;
  /**
   * Message ID to save as note
   */
  message_id: string;
  /**
   * Request schema for creating a note from a single message.
   */
  comment?: (string | null) | undefined;
}
export type NoteRetrievalResult = {
  /**
   * Article identifier
   */
  article_id: string;
  note_id?: (string | null) | undefined;
  note?: (Note | null) | undefined;
  /**
   * Relevance score from vector retrieval
   */
  score: number;
}
/**
 * Request schema for setting tags on a note.
 */
export type NoteTagsUpdate = {
  /**
   * List of tag IDs to set on the note
   */
  tag_ids: Array<string>;
}
/**
 * Request schema for updating a note.
 */
export type NoteUpdate = Partial<{ title: (string | null), description: (string | null), is_public: (boolean | null), reaction: (("like" | "dislike" | "neutral") | null) }>
/**
 * Mark a notification read or dismissed.
 */
export type NotificationStatusUpdate = {
  /**
   * New inbox state for the notification
   */
  status: ("read" | "dismissed");
}
/**
 * Schema for setting a device's push notification token.
 */
export type NotificationTokenUpdate = {
  /**
   * Push notification token (FCM or APNs)
   */
  notification_token: string;
}
/**
 * JSON body posted by the web-app consent page on Approve.
 * 
 * Carries the OAuth2 parameters the consent page received from
 * ``GET /oauth2/authorize``; everything is re-validated here before a code
 * is issued, so the page itself never needs to be trusted.
 */
export type OAuth2AuthorizationGrantRequest = {
  /**
   * Our OAuth2 client_id
   */
  client_id: string;
  /**
   * Original redirect_uri from authorize
   */
  redirect_uri: string;
  /**
   * Original PKCE code_challenge
   */
  code_challenge: string;
  /**
   * JSON body posted by the web-app consent page on Approve.
   * 
   * Carries the OAuth2 parameters the consent page received from
   * ``GET /oauth2/authorize``; everything is re-validated here before a code
   * is issued, so the page itself never needs to be trusted.
   */
  code_challenge_method?: string | undefined;
  /**
   * JSON body posted by the web-app consent page on Approve.
   * 
   * Carries the OAuth2 parameters the consent page received from
   * ``GET /oauth2/authorize``; everything is re-validated here before a code
   * is issued, so the page itself never needs to be trusted.
   */
  scope?: string | undefined;
  /**
   * JSON body posted by the web-app consent page on Approve.
   * 
   * Carries the OAuth2 parameters the consent page received from
   * ``GET /oauth2/authorize``; everything is re-validated here before a code
   * is issued, so the page itself never needs to be trusted.
   */
  state?: string | undefined;
}
/**
 * RFC 7591 client registration request (subset we support).
 */
export type OAuth2ClientRegistrationRequest = {
  /**
   * Human-friendly client name
   */
  client_name: string;
  /**
   * Allowed redirect URIs
   */
  redirect_uris: Array<string>;
  /**
   * RFC 7591 client registration request (subset we support).
   */
  grant_types?: Array<string> | undefined;
  /**
   * RFC 7591 client registration request (subset we support).
   */
  response_types?: Array<string> | undefined;
  /**
   * RFC 7591 client registration request (subset we support).
   */
  token_endpoint_auth_method?: ("none" | "client_secret_post") | undefined;
  /**
   * RFC 7591 client registration request (subset we support).
   */
  scope?: string | undefined;
}
/**
 * Schema for OAuth login request.
 */
export type OAuthLoginRequest = {
  /**
   * ID token from OAuth provider (Google/Apple)
   */
  id_token: string;
}
export type SystemEnvelope = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * User who received this notification
   */
  user_id: string;
  /**
   * Display title
   */
  title: (string | null);
  /**
   * Display subtitle
   */
  subtitle: (string | null);
  /**
   * Display body
   */
  body: (string | null);
  /**
   * Inbox read state
   */
  status: ("unread" | "read" | "dismissed");
  /**
   * When first marked read or dismissed
   */
  read_at: (string | null);
  /**
   * When the notification was created
   */
  created_at: string;
  /**
   * Notification type discriminator
   */
  type: string;
}
export type Page_Annotated_Union_CollectionSuggestionEnvelope__ContentRecommendationEnvelope__DailyDigestEnvelope__SystemEnvelope___FieldInfo_annotation_NoneType__required_True__discriminator__type____ = { items: Array<(CollectionSuggestionEnvelope | ContentRecommendationEnvelope | DailyDigestEnvelope | SystemEnvelope)>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_Artifact_ = { items: Array<Artifact>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_CollectionSuggestion_ = { items: Array<CollectionSuggestion>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_Collection_ = { items: Array<Collection>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_Conversation_ = { items: Array<Conversation>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_FileRevision_ = { items: Array<FileRevision>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_Message_ = { items: Array<Message>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_Note_ = { items: Array<Note>, total?: number | undefined, next_cursor: string, has_more: boolean }
/**
 * API representation of a single pinned item.
 * 
 * Exactly one of ``note`` / ``collection`` / ``artifact`` is populated,
 * selected by ``type``. The shape is intentionally flat (rather than a
 * Pydantic discriminated union) so the client renders the list with a
 * single ``switch (item.type)``.
 */
export type PinnedItemEnvelope = {
  /**
   * Type of the pinned entity
   */
  type: ("note" | "collection" | "artifact");
  /**
   * Identifier of the pinned entity
   */
  entity_id: string;
  /**
   * Position in the pinned list
   */
  index: number;
  /**
   * Embedded note payload when ``type == "note"``
   */
  note: (Note | null);
  /**
   * Embedded collection payload when ``type == "collection"``
   */
  collection: (Collection | null);
  /**
   * Embedded artifact payload when ``type == "artifact"``
   */
  artifact: (Artifact | null);
}
export type Page_PinnedItemEnvelope_ = { items: Array<PinnedItemEnvelope>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_Recommendation_ = { items: Array<Recommendation>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_Tag_ = { items: Array<Tag>, total?: number | undefined, next_cursor: string, has_more: boolean }
export type Page_UserSession_ = { items: Array<UserSession>, total?: number | undefined, next_cursor: string, has_more: boolean }
/**
 * Transmuter for PasswordResetToken model.
 */
export type PasswordResetToken = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Reference to user requesting reset
   */
  user_id: string;
  /**
   * SHA256 hash of reset token
   */
  token_hash: string;
  /**
   * Link to verification code
   */
  verification_code_id: (string | null);
  /**
   * Whether token has been used
   */
  is_used: boolean;
  /**
   * When token expires
   */
  expires_at: string;
  /**
   * When token was used
   */
  used_at: (string | null);
}
/**
 * Request body for ``POST /pinned``.
 */
export type PinItemRequest = {
  /**
   * Type of the entity to pin
   */
  type: ("note" | "collection" | "artifact");
  /**
   * Identifier of the entity to pin
   */
  entity_id: string;
}
/**
 * One entry in the ``PUT /pinned`` body.
 */
export type PinnedItemReorderEntry = {
  /**
   * Type of the pinned entity
   */
  type: ("note" | "collection" | "artifact");
  /**
   * Identifier of the pinned entity
   */
  entity_id: string;
}
/**
 * Request body for ``PUT /pinned``.
 */
export type PinnedItemsReorder = {
  /**
   * Pinned items in their new order. Every entry must already be pinned for the caller; the server rewrites each index to its position in this list (0-based).
   */
  items: Array<PinnedItemReorderEntry>;
}
/**
 * Schema for a Plan row.
 */
export type Plan = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Stable lookup key
   */
  slug: string;
  /**
   * Human-readable plan name
   */
  name: string;
  /**
   * subscription or credit_pack
   */
  kind: ("subscription" | "credit_pack");
  /**
   * Credits granted on each successful purchase / renewal (1 credit ≈ 0.1 US cent / $0.001 of usage at markup 1.0)
   */
  credit_grant: string;
  /**
   * Charge cadence — month / year for subscriptions; null for credit packs
   */
  billing_interval: (("month" | "year") | null);
  /**
   * Credit-grant cadence (monthly even when billing_interval is year); null for credit packs
   */
  credit_interval: (("month" | "year") | null);
  /**
   * Free trial length in days; 0 = no trial
   */
  trial_days: number;
  /**
   * Plan is currently buyable
   */
  is_active: boolean;
  /**
   * Marketing-page price hint (USD cents)
   */
  display_price_cents: (number | null);
  /**
   * ISO-4217 currency for display_price_cents
   */
  currency: (string | null);
}
/**
 * Request body for ``POST /me/billing/plan``.
 */
export type PlanChangeRequest = {
  /**
   * Plan to switch to
   */
  plan_slug: string;
  /**
   * Payment provider
   */
  provider: ("stripe" | "apple" | "google" | "internal");
}
/**
 * Response for ``POST /me/billing/plan``.
 */
export type PlanChangeResponse = {
  /**
   * 'same' (no change), 'checkout' (first purchase — redirect to hosted_url), or 'upgraded' (applied now). Downgrades are rejected with 400 API-BIS017 (upgrade-only while subscribed).
   */
  kind: ("same" | "checkout" | "upgraded");
  /**
   * Hosted-checkout URL to redirect to (only when kind=checkout).
   */
  hosted_url: (string | null);
  /**
   * Provider-side checkout session id (kind=checkout).
   */
  session_token: (string | null);
}
/**
 * Schema for a per-provider plan listing.
 */
export type PlanProviderListing = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Plan this listing belongs to
   */
  plan_id: string;
  /**
   * stripe / apple / google
   */
  provider: ("stripe" | "apple" | "google" | "internal");
  /**
   * Provider-side identifier
   */
  provider_product_id: string;
  /**
   * Authoritative store price
   */
  price_cents: number;
  /**
   * ISO-4217 currency for price_cents
   */
  currency: string;
  /**
   * Listing is currently buyable
   */
  is_active: boolean;
}
/**
 * Plan response that bundles its provider listings.
 */
export type PlanWithListings = {
  /**
   * Plan record
   */
  plan: Plan;
  /**
   * Per-provider listings
   */
  listings: Array<PlanProviderListing>;
}
/**
 * Response for ``GET /plans``.
 */
export type PlanListResponse = {
  /**
   * Active plans
   */
  plans: Array<PlanWithListings>;
}
/**
 * Schema for presigned download URL response.
 */
export type PresignedDownloadResponse = {
  /**
   * Presigned download URL
   */
  download_url: string;
  /**
   * URL expiration time in seconds
   */
  expires_in: number;
}
/**
 * Schema for presigned upload URL request.
 */
export type PresignedUploadRequest = {
  /**
   * Original filename
   */
  filename: string;
  /**
   * Schema for presigned upload URL request.
   */
  mimetype?: string | undefined;
  /**
   * Schema for presigned upload URL request.
   */
  expiration?: number | undefined;
}
/**
 * Schema for presigned upload URL response.
 */
export type PresignedUploadResponse = {
  /**
   * Presigned upload URL
   */
  upload_url: string;
  /**
   * S3 object key to use for upload
   */
  s3_key: string;
  /**
   * S3 bucket name
   */
  bucket: string;
  /**
   * URL expiration time in seconds
   */
  expires_in: number;
}
/**
 * Response for ``POST /me/billing/purchases``.
 */
export type PurchaseResponse = {
  /**
   * Credit balance after applying the purchase
   */
  balance: string;
}
/**
 * Request body for ``POST /me/billing/purchases``.
 * 
 * The mobile client completes Play Billing / StoreKit on-device and posts
 * the resulting purchase token (Google) / signed transaction (Apple) here
 * for server-side verification and credit grant.
 */
export type PurchaseVerifyRequest = {
  /**
   * Payment provider
   */
  provider: ("stripe" | "apple" | "google" | "internal");
  /**
   * Plan the purchase is for
   */
  plan_slug: string;
  /**
   * Play purchase token / Apple signed transaction from the client
   */
  purchase_token: string;
}
export type RecommendationAction = {
  /**
   * Action to perform on the recommendation
   */
  action: ("dismiss" | "save" | "not_interested");
  comment?: (string | null) | undefined;
}
/**
 * Request body for ``POST /me/discount-codes/redeem``.
 */
export type RedeemDiscountCodeRequest = {
  /**
   * Code to redeem
   */
  code: string;
}
/**
 * Response for ``POST /me/discount-codes/redeem``.
 */
export type RedeemDiscountCodeResponse = {
  /**
   * Redemption outcome
   */
  outcome: ("credit_grant_applied" | "plan_discount_attached");
  /**
   * Credits added to balance (credit_grant only)
   */
  credit_grant: (string | null);
  /**
   * Balance after redemption
   */
  new_balance: string;
}
/**
 * Schema for refresh token request. Device info should be provided via headers.
 */
export type RefreshTokenRequest = {
  /**
   * Refresh token
   */
  refresh_token: string;
}
/**
 * Schema for requesting verification email resend.
 */
export type ResendVerificationRequest = {
  /**
   * User email address
   */
  email: string;
}
/**
 * Schema for resetting password.
 */
export type ResetPassword = {
  /**
   * Reset token from verification
   */
  reset_token: string;
  /**
   * New password
   */
  new_password: string;
}
/**
 * Schema for requesting password reset.
 */
export type ResetPasswordRequest = {
  /**
   * User email address
   */
  email: string;
}
export type RetrievalRequest = {
  /**
   * Retrieval query text
   */
  query: string;
}
/**
 * Request body for ``POST /me/billing/stripe/portal-session``.
 * 
 * Stripe-specific by design: Apple / Google IAP have no portal-session
 * concept — their subscriptions are managed natively in the stores.
 */
export type StripePortalSessionRequest = Partial<{ return_url: (string | null) }>
/**
 * Response for ``POST /me/billing/stripe/portal-session``.
 */
export type StripePortalSessionResponse = {
  /**
   * Hosted Stripe Customer Portal URL to redirect the user to
   */
  url: string;
}
/**
 * Schema for a subscription row.
 */
export type Subscription = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Soft FK to users.id
   */
  user_id: string;
  /**
   * Plan this subscription is for
   */
  plan_id: string;
  /**
   * Customer record
   */
  customer_id: string;
  /**
   * stripe / apple / google
   */
  provider: ("stripe" | "apple" | "google" | "internal");
  /**
   * Provider-side sub id
   */
  provider_subscription_id: string;
  /**
   * Subscription status
   */
  status: ("incomplete" | "trialing" | "active" | "past_due" | "canceled" | "expired");
  /**
   * Start of current billing period
   */
  current_period_start: (string | null);
  /**
   * End of current billing period
   */
  current_period_end: (string | null);
  /**
   * Scheduled cancellation time
   */
  cancel_at: (string | null);
  /**
   * Actual cancellation time
   */
  canceled_at: (string | null);
  /**
   * Most recent renewal time
   */
  last_renewed_at: (string | null);
  /**
   * Last sync with provider state
   */
  last_synced_at: string;
}
/**
 * Response for ``GET /me/subscription``.
 */
export type SubscriptionResponse = {
  /**
   * Current subscription state
   */
  subscription: Subscription;
  /**
   * Plan the subscription is for
   */
  plan: Plan;
}
/**
 * Per-suggestion outcome of a bulk transition, keyed by suggestion id.
 * 
 * Exactly one of ``suggestion`` (success) or ``error`` (failure) is
 * populated — a failing item never aborts the rest of the batch.
 */
export type SuggestionBatchResult = {
  /**
   * Updated suggestion when the update succeeded
   */
  suggestion: (CollectionSuggestion | null);
  /**
   * Error detail when the update failed
   */
  error: (ErrorDetail | null);
}
/**
 * Request schema for updating a suggestion's status.
 * 
 * Only forward transitions from ``pending`` are meaningful — pending →
 * accepted (links the note to the collection) or pending → dismissed (soft
 * delete).  Status updates from non-pending states are no-ops (idempotent).
 */
export type SuggestionUpdate = {
  /**
   * Target status: accepted or dismissed
   */
  status: ("accepted" | "dismissed");
}
/**
 * Request schema for creating a tag.
 */
export type TagCreate = {
  /**
   * Tag name
   */
  name: string;
  /**
   * Tag palette color
   */
  color: ("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose");
}
/**
 * Request schema for updating a tag.
 */
export type TagUpdate = Partial<{ name: (string | null), color: (("neutral" | "slate" | "gray" | "zinc" | "stone" | "red" | "orange" | "amber" | "yellow" | "lime" | "green" | "emerald" | "teal" | "cyan" | "sky" | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose") | null) }>
/**
 * Text the user highlighted on a page.
 */
export type TextSelectionRequest = {
  /**
   * The text the user selected on the page
   */
  text: string;
}
/**
 * The model's answer for one toolbar action.
 */
export type TextSelectionResponse = {
  /**
   * The explanation, summary, or translation, as plain text or light markdown
   */
  content: string;
}
/**
 * A selection plus the language to translate it into.
 */
export type TextTranslationRequest = {
  /**
   * The text the user selected on the page
   */
  text: string;
  /**
   * Target language as a name or BCP-47 tag, e.g. 'zh-TW', 'Traditional Chinese', 'Spanish'
   */
  target_language: string;
}
export type TwitterArticle = Partial<({ title: (string | null), plain_text: (string | null), preview_text: (string | null), cover_media: (string | null), media_entities: (Array<string> | null) } & Record<string, any>)>
export type TwitterTweetAttachments = Partial<({ media_keys: (Array<string> | null), poll_ids: (Array<string> | null) } & Record<string, any>)>
export type TwitterNoteTweet = Partial<({ text: (string | null) } & Record<string, any>)>
export type TwitterTweetPublicMetrics = Partial<({ retweet_count: (number | null), reply_count: (number | null), like_count: (number | null), quote_count: (number | null), bookmark_count: (number | null), impression_count: (number | null) } & Record<string, any>)>
export type TwitterUserPublicMetrics = Partial<({ followers_count: (number | null), following_count: (number | null), listed_count: (number | null), tweet_count: (number | null), like_count: (number | null) } & Record<string, any>)>
export type TwitterUser = ({ id: string, name: string, username: string, affiliation?: (Record<string, unknown> | null) | undefined, connection_status?: (Array<string> | null) | undefined, created_at?: (string | null) | undefined, description?: (string | null) | undefined, entities?: (Record<string, unknown> | null) | undefined, location?: (string | null) | undefined, most_recent_tweet_id?: (string | null) | undefined, pinned_tweet_id?: (string | null) | undefined, profile_banner_url?: (string | null) | undefined, profile_image_url?: (string | null) | undefined, protected?: (boolean | null) | undefined, public_metrics?: (TwitterUserPublicMetrics | null) | undefined, receives_your_dm?: (boolean | null) | undefined, subscription_type?: (string | null) | undefined, url?: (string | null) | undefined, verified?: (boolean | null) | undefined, verified_type?: (string | null) | undefined, withheld?: (Record<string, unknown> | null) | undefined } & Record<string, any>)
export type TwitterMediaVariant = Partial<({ content_type: (string | null), url: (string | null), bit_rate: (number | null) } & Record<string, any>)>
export type TwitterMedia = ({ media_key: string, type: string, url?: (string | null) | undefined, preview_image_url?: (string | null) | undefined, variants?: (Array<TwitterMediaVariant> | null) | undefined, width?: (number | null) | undefined, height?: (number | null) | undefined, duration_ms?: (number | null) | undefined, alt_text?: (string | null) | undefined } & Record<string, any>)
export type TwitterTweet = ({ id: string, text: string, edit_history_tweet_ids?: (Array<string> | null) | undefined, article?: (TwitterArticle | null) | undefined, attachments?: (TwitterTweetAttachments | null) | undefined, author_id?: (string | null) | undefined, created_at?: (string | null) | undefined, lang?: (string | null) | undefined, note_tweet?: (TwitterNoteTweet | null) | undefined, possibly_sensitive?: (boolean | null) | undefined, public_metrics?: (TwitterTweetPublicMetrics | null) | undefined, author?: (TwitterUser | null) | undefined, media?: Array<TwitterMedia> | undefined, url: string } & Record<string, any>)
export type TwitterBookmarkPage = Partial<({ tweets: Array<TwitterTweet>, next_cursor: (string | null), result_count: number } & Record<string, any>)>
/**
 * Transmuter for UserDemographic model.
 */
export type UserDemographic = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Reference to the user
   */
  user_id: string;
  /**
   * User nickname or display name
   */
  nickname: (string | null);
}
/**
 * Transmuter for UserPreferences model.
 */
export type UserPreferences = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Reference to the user
   */
  user_id: string;
  /**
   * User region/country code
   */
  region: string;
  /**
   * User preferred language code
   */
  lang: string;
  /**
   * Global notification toggle
   */
  notification_enabled: boolean;
  /**
   * Whether anonymous analytics is enabled
   */
  privacy_analytics_enabled: boolean;
  /**
   * Whether crash reporting is enabled
   */
  privacy_crash_reporting: boolean;
  /**
   * Widget settings configuration
   */
  widget_configuration: (Record<string, unknown> | null);
  /**
   * Dashboard card order and visibility
   */
  dashboard_layout: (Array<unknown> | null);
}
/**
 * Transmuter for User model.
 */
export type User = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Full name of the user
   */
  full_name: (string | null);
  /**
   * User email address
   */
  email: string;
  /**
   * User phone number
   */
  phone: (string | null);
  /**
   * OAuth provider used
   */
  oauth_source: (string | null);
  /**
   * Unique invitation code for referrals
   */
  invitation_code: string;
  /**
   * Whether the user account is active
   */
  is_active: boolean;
  /**
   * Whether the user email has been verified
   */
  is_email_verified: boolean;
  /**
   * Whether user completed activation
   */
  activation_completed: boolean;
  /**
   * Whether user completed the welcome tutorial (one-way flag)
   */
  tutorial_completed: boolean;
  /**
   * User demographic information
   */
  demographic: (UserDemographic | null);
  /**
   * User preferences and settings
   */
  preferences: (UserPreferences | null);
}
/**
 * Schema for user demographic response.
 */
export type UserDemographicResponse = {
  /**
   * Reference to the user
   */
  user_id: string;
  /**
   * User nickname or display name
   */
  nickname: (string | null);
}
/**
 * Schema for updating user demographics.
 */
export type UserDemographicUpdate = Partial<{ nickname: (string | null) }>
/**
 * Schema for user login.
 */
export type UserLogin = {
  /**
   * User email address
   */
  email: string;
  /**
   * User password
   */
  password: string;
}
/**
 * Schema for user preferences response.
 */
export type UserPreferencesResponse = {
  /**
   * Reference to the user
   */
  user_id: string;
  /**
   * User region/country code
   */
  region: string;
  /**
   * User preferred language code
   */
  lang: string;
  /**
   * Global notification toggle
   */
  notification_enabled: boolean;
  /**
   * Widget settings configuration
   */
  widget_configuration: (Record<string, unknown> | null);
  /**
   * Dashboard card order and visibility
   */
  dashboard_layout: (Array<unknown> | null);
}
/**
 * Schema for updating user preferences.
 */
export type UserPreferencesUpdate = Partial<{ region: (string | null), lang: (string | null), notification_enabled: (boolean | null), privacy_analytics_enabled: (boolean | null), privacy_crash_reporting: (boolean | null), widget_configuration: (Record<string, unknown> | null), dashboard_layout: (Array<unknown> | null) }>
/**
 * User account information for registration.
 */
export type UserRegistrationInfo = {
  /**
   * User email address
   */
  email: string;
  /**
   * User account information for registration.
   */
  password?: (string | null) | undefined;
  /**
   * User account information for registration.
   */
  full_name?: (string | null) | undefined;
  /**
   * User account information for registration.
   */
  phone?: (string | null) | undefined;
  /**
   * User account information for registration.
   */
  oauth_source?: (("apple" | "google") | null) | undefined;
  /**
   * User account information for registration.
   */
  oauth_id?: (string | null) | undefined;
  /**
   * User account information for registration.
   */
  invitation_code?: (string | null) | undefined;
}
/**
 * User demographic information for registration.
 */
export type UserRegistrationDemographics = {
  /**
   * User nickname for email personalization
   */
  nickname: string;
}
/**
 * User preferences for registration.
 */
export type UserRegistrationPreferences = Partial<{ lang: string, region: string, timezone: string }>
/**
 * Schema for user registration with nested info, demographics, and preferences.
 */
export type UserRegistration = {
  /**
   * User account information
   */
  info: UserRegistrationInfo;
  /**
   * User demographic information
   */
  demographics: UserRegistrationDemographics;
  /**
   * User preference settings
   */
  preferences: UserRegistrationPreferences;
}
/**
 * Schema for session response with device information.
 */
export type UserSessionResponse = {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * SHA256 hash of the access token
   */
  access_token_hash: string;
  /**
   * SHA256 hash of the refresh token
   */
  refresh_token_hash: (string | null);
  /**
   * User ID
   */
  user_id: string;
  /**
   * HTTP User-Agent header
   */
  user_agent: string;
  /**
   * Device identifier
   */
  device_id: string;
  /**
   * App version
   */
  app_version: string;
  /**
   * Last known IP address
   */
  ip_address: (string | null);
  /**
   * User timezone (e.g., America/New_York)
   */
  timezone: (("Africa/Abidjan" | "Africa/Accra" | "Africa/Addis_Ababa" | "Africa/Algiers" | "Africa/Asmara" | "Africa/Asmera" | "Africa/Bamako" | "Africa/Bangui" | "Africa/Banjul" | "Africa/Bissau" | "Africa/Blantyre" | "Africa/Brazzaville" | "Africa/Bujumbura" | "Africa/Cairo" | "Africa/Casablanca" | "Africa/Ceuta" | "Africa/Conakry" | "Africa/Dakar" | "Africa/Dar_es_Salaam" | "Africa/Djibouti" | "Africa/Douala" | "Africa/El_Aaiun" | "Africa/Freetown" | "Africa/Gaborone" | "Africa/Harare" | "Africa/Johannesburg" | "Africa/Juba" | "Africa/Kampala" | "Africa/Khartoum" | "Africa/Kigali" | "Africa/Kinshasa" | "Africa/Lagos" | "Africa/Libreville" | "Africa/Lome" | "Africa/Luanda" | "Africa/Lubumbashi" | "Africa/Lusaka" | "Africa/Malabo" | "Africa/Maputo" | "Africa/Maseru" | "Africa/Mbabane" | "Africa/Mogadishu" | "Africa/Monrovia" | "Africa/Nairobi" | "Africa/Ndjamena" | "Africa/Niamey" | "Africa/Nouakchott" | "Africa/Ouagadougou" | "Africa/Porto-Novo" | "Africa/Sao_Tome" | "Africa/Timbuktu" | "Africa/Tripoli" | "Africa/Tunis" | "Africa/Windhoek" | "America/Adak" | "America/Anchorage" | "America/Anguilla" | "America/Antigua" | "America/Araguaina" | "America/Argentina/Buenos_Aires" | "America/Argentina/Catamarca" | "America/Argentina/ComodRivadavia" | "America/Argentina/Cordoba" | "America/Argentina/Jujuy" | "America/Argentina/La_Rioja" | "America/Argentina/Mendoza" | "America/Argentina/Rio_Gallegos" | "America/Argentina/Salta" | "America/Argentina/San_Juan" | "America/Argentina/San_Luis" | "America/Argentina/Tucuman" | "America/Argentina/Ushuaia" | "America/Aruba" | "America/Asuncion" | "America/Atikokan" | "America/Atka" | "America/Bahia" | "America/Bahia_Banderas" | "America/Barbados" | "America/Belem" | "America/Belize" | "America/Blanc-Sablon" | "America/Boa_Vista" | "America/Bogota" | "America/Boise" | "America/Buenos_Aires" | "America/Cambridge_Bay" | "America/Campo_Grande" | "America/Cancun" | "America/Caracas" | "America/Catamarca" | "America/Cayenne" | "America/Cayman" | "America/Chicago" | "America/Chihuahua" | "America/Ciudad_Juarez" | "America/Coral_Harbour" | "America/Cordoba" | "America/Costa_Rica" | "America/Coyhaique" | "America/Creston" | "America/Cuiaba" | "America/Curacao" | "America/Danmarkshavn" | "America/Dawson" | "America/Dawson_Creek" | "America/Denver" | "America/Detroit" | "America/Dominica" | "America/Edmonton" | "America/Eirunepe" | "America/El_Salvador" | "America/Ensenada" | "America/Fort_Nelson" | "America/Fort_Wayne" | "America/Fortaleza" | "America/Glace_Bay" | "America/Godthab" | "America/Goose_Bay" | "America/Grand_Turk" | "America/Grenada" | "America/Guadeloupe" | "America/Guatemala" | "America/Guayaquil" | "America/Guyana" | "America/Halifax" | "America/Havana" | "America/Hermosillo" | "America/Indiana/Indianapolis" | "America/Indiana/Knox" | "America/Indiana/Marengo" | "America/Indiana/Petersburg" | "America/Indiana/Tell_City" | "America/Indiana/Vevay" | "America/Indiana/Vincennes" | "America/Indiana/Winamac" | "America/Indianapolis" | "America/Inuvik" | "America/Iqaluit" | "America/Jamaica" | "America/Jujuy" | "America/Juneau" | "America/Kentucky/Louisville" | "America/Kentucky/Monticello" | "America/Knox_IN" | "America/Kralendijk" | "America/La_Paz" | "America/Lima" | "America/Los_Angeles" | "America/Louisville" | "America/Lower_Princes" | "America/Maceio" | "America/Managua" | "America/Manaus" | "America/Marigot" | "America/Martinique" | "America/Matamoros" | "America/Mazatlan" | "America/Mendoza" | "America/Menominee" | "America/Merida" | "America/Metlakatla" | "America/Mexico_City" | "America/Miquelon" | "America/Moncton" | "America/Monterrey" | "America/Montevideo" | "America/Montreal" | "America/Montserrat" | "America/Nassau" | "America/New_York" | "America/Nipigon" | "America/Nome" | "America/Noronha" | "America/North_Dakota/Beulah" | "America/North_Dakota/Center" | "America/North_Dakota/New_Salem" | "America/Nuuk" | "America/Ojinaga" | "America/Panama" | "America/Pangnirtung" | "America/Paramaribo" | "America/Phoenix" | "America/Port-au-Prince" | "America/Port_of_Spain" | "America/Porto_Acre" | "America/Porto_Velho" | "America/Puerto_Rico" | "America/Punta_Arenas" | "America/Rainy_River" | "America/Rankin_Inlet" | "America/Recife" | "America/Regina" | "America/Resolute" | "America/Rio_Branco" | "America/Rosario" | "America/Santa_Isabel" | "America/Santarem" | "America/Santiago" | "America/Santo_Domingo" | "America/Sao_Paulo" | "America/Scoresbysund" | "America/Shiprock" | "America/Sitka" | "America/St_Barthelemy" | "America/St_Johns" | "America/St_Kitts" | "America/St_Lucia" | "America/St_Thomas" | "America/St_Vincent" | "America/Swift_Current" | "America/Tegucigalpa" | "America/Thule" | "America/Thunder_Bay" | "America/Tijuana" | "America/Toronto" | "America/Tortola" | "America/Vancouver" | "America/Virgin" | "America/Whitehorse" | "America/Winnipeg" | "America/Yakutat" | "America/Yellowknife" | "Antarctica/Casey" | "Antarctica/Davis" | "Antarctica/DumontDUrville" | "Antarctica/Macquarie" | "Antarctica/Mawson" | "Antarctica/McMurdo" | "Antarctica/Palmer" | "Antarctica/Rothera" | "Antarctica/South_Pole" | "Antarctica/Syowa" | "Antarctica/Troll" | "Antarctica/Vostok" | "Arctic/Longyearbyen" | "Asia/Aden" | "Asia/Almaty" | "Asia/Amman" | "Asia/Anadyr" | "Asia/Aqtau" | "Asia/Aqtobe" | "Asia/Ashgabat" | "Asia/Ashkhabad" | "Asia/Atyrau" | "Asia/Baghdad" | "Asia/Bahrain" | "Asia/Baku" | "Asia/Bangkok" | "Asia/Barnaul" | "Asia/Beirut" | "Asia/Bishkek" | "Asia/Brunei" | "Asia/Calcutta" | "Asia/Chita" | "Asia/Choibalsan" | "Asia/Chongqing" | "Asia/Chungking" | "Asia/Colombo" | "Asia/Dacca" | "Asia/Damascus" | "Asia/Dhaka" | "Asia/Dili" | "Asia/Dubai" | "Asia/Dushanbe" | "Asia/Famagusta" | "Asia/Gaza" | "Asia/Harbin" | "Asia/Hebron" | "Asia/Ho_Chi_Minh" | "Asia/Hong_Kong" | "Asia/Hovd" | "Asia/Irkutsk" | "Asia/Istanbul" | "Asia/Jakarta" | "Asia/Jayapura" | "Asia/Jerusalem" | "Asia/Kabul" | "Asia/Kamchatka" | "Asia/Karachi" | "Asia/Kashgar" | "Asia/Kathmandu" | "Asia/Katmandu" | "Asia/Khandyga" | "Asia/Kolkata" | "Asia/Krasnoyarsk" | "Asia/Kuala_Lumpur" | "Asia/Kuching" | "Asia/Kuwait" | "Asia/Macao" | "Asia/Macau" | "Asia/Magadan" | "Asia/Makassar" | "Asia/Manila" | "Asia/Muscat" | "Asia/Nicosia" | "Asia/Novokuznetsk" | "Asia/Novosibirsk" | "Asia/Omsk" | "Asia/Oral" | "Asia/Phnom_Penh" | "Asia/Pontianak" | "Asia/Pyongyang" | "Asia/Qatar" | "Asia/Qostanay" | "Asia/Qyzylorda" | "Asia/Rangoon" | "Asia/Riyadh" | "Asia/Saigon" | "Asia/Sakhalin" | "Asia/Samarkand" | "Asia/Seoul" | "Asia/Shanghai" | "Asia/Singapore" | "Asia/Srednekolymsk" | "Asia/Taipei" | "Asia/Tashkent" | "Asia/Tbilisi" | "Asia/Tehran" | "Asia/Tel_Aviv" | "Asia/Thimbu" | "Asia/Thimphu" | "Asia/Tokyo" | "Asia/Tomsk" | "Asia/Ujung_Pandang" | "Asia/Ulaanbaatar" | "Asia/Ulan_Bator" | "Asia/Urumqi" | "Asia/Ust-Nera" | "Asia/Vientiane" | "Asia/Vladivostok" | "Asia/Yakutsk" | "Asia/Yangon" | "Asia/Yekaterinburg" | "Asia/Yerevan" | "Atlantic/Azores" | "Atlantic/Bermuda" | "Atlantic/Canary" | "Atlantic/Cape_Verde" | "Atlantic/Faeroe" | "Atlantic/Faroe" | "Atlantic/Jan_Mayen" | "Atlantic/Madeira" | "Atlantic/Reykjavik" | "Atlantic/South_Georgia" | "Atlantic/St_Helena" | "Atlantic/Stanley" | "Australia/ACT" | "Australia/Adelaide" | "Australia/Brisbane" | "Australia/Broken_Hill" | "Australia/Canberra" | "Australia/Currie" | "Australia/Darwin" | "Australia/Eucla" | "Australia/Hobart" | "Australia/LHI" | "Australia/Lindeman" | "Australia/Lord_Howe" | "Australia/Melbourne" | "Australia/NSW" | "Australia/North" | "Australia/Perth" | "Australia/Queensland" | "Australia/South" | "Australia/Sydney" | "Australia/Tasmania" | "Australia/Victoria" | "Australia/West" | "Australia/Yancowinna" | "Brazil/Acre" | "Brazil/DeNoronha" | "Brazil/East" | "Brazil/West" | "CET" | "CST6CDT" | "Canada/Atlantic" | "Canada/Central" | "Canada/Eastern" | "Canada/Mountain" | "Canada/Newfoundland" | "Canada/Pacific" | "Canada/Saskatchewan" | "Canada/Yukon" | "Chile/Continental" | "Chile/EasterIsland" | "Cuba" | "EET" | "EST" | "EST5EDT" | "Egypt" | "Eire" | "Etc/GMT" | "Etc/GMT+0" | "Etc/GMT+1" | "Etc/GMT+10" | "Etc/GMT+11" | "Etc/GMT+12" | "Etc/GMT+2" | "Etc/GMT+3" | "Etc/GMT+4" | "Etc/GMT+5" | "Etc/GMT+6" | "Etc/GMT+7" | "Etc/GMT+8" | "Etc/GMT+9" | "Etc/GMT-0" | "Etc/GMT-1" | "Etc/GMT-10" | "Etc/GMT-11" | "Etc/GMT-12" | "Etc/GMT-13" | "Etc/GMT-14" | "Etc/GMT-2" | "Etc/GMT-3" | "Etc/GMT-4" | "Etc/GMT-5" | "Etc/GMT-6" | "Etc/GMT-7" | "Etc/GMT-8" | "Etc/GMT-9" | "Etc/GMT0" | "Etc/Greenwich" | "Etc/UCT" | "Etc/UTC" | "Etc/Universal" | "Etc/Zulu" | "Europe/Amsterdam" | "Europe/Andorra" | "Europe/Astrakhan" | "Europe/Athens" | "Europe/Belfast" | "Europe/Belgrade" | "Europe/Berlin" | "Europe/Bratislava" | "Europe/Brussels" | "Europe/Bucharest" | "Europe/Budapest" | "Europe/Busingen" | "Europe/Chisinau" | "Europe/Copenhagen" | "Europe/Dublin" | "Europe/Gibraltar" | "Europe/Guernsey" | "Europe/Helsinki" | "Europe/Isle_of_Man" | "Europe/Istanbul" | "Europe/Jersey" | "Europe/Kaliningrad" | "Europe/Kiev" | "Europe/Kirov" | "Europe/Kyiv" | "Europe/Lisbon" | "Europe/Ljubljana" | "Europe/London" | "Europe/Luxembourg" | "Europe/Madrid" | "Europe/Malta" | "Europe/Mariehamn" | "Europe/Minsk" | "Europe/Monaco" | "Europe/Moscow" | "Europe/Nicosia" | "Europe/Oslo" | "Europe/Paris" | "Europe/Podgorica" | "Europe/Prague" | "Europe/Riga" | "Europe/Rome" | "Europe/Samara" | "Europe/San_Marino" | "Europe/Sarajevo" | "Europe/Saratov" | "Europe/Simferopol" | "Europe/Skopje" | "Europe/Sofia" | "Europe/Stockholm" | "Europe/Tallinn" | "Europe/Tirane" | "Europe/Tiraspol" | "Europe/Ulyanovsk" | "Europe/Uzhgorod" | "Europe/Vaduz" | "Europe/Vatican" | "Europe/Vienna" | "Europe/Vilnius" | "Europe/Volgograd" | "Europe/Warsaw" | "Europe/Zagreb" | "Europe/Zaporozhye" | "Europe/Zurich" | "Factory" | "GB" | "GB-Eire" | "GMT" | "GMT+0" | "GMT-0" | "GMT0" | "Greenwich" | "HST" | "Hongkong" | "Iceland" | "Indian/Antananarivo" | "Indian/Chagos" | "Indian/Christmas" | "Indian/Cocos" | "Indian/Comoro" | "Indian/Kerguelen" | "Indian/Mahe" | "Indian/Maldives" | "Indian/Mauritius" | "Indian/Mayotte" | "Indian/Reunion" | "Iran" | "Israel" | "Jamaica" | "Japan" | "Kwajalein" | "Libya" | "MET" | "MST" | "MST7MDT" | "Mexico/BajaNorte" | "Mexico/BajaSur" | "Mexico/General" | "NZ" | "NZ-CHAT" | "Navajo" | "PRC" | "PST8PDT" | "Pacific/Apia" | "Pacific/Auckland" | "Pacific/Bougainville" | "Pacific/Chatham" | "Pacific/Chuuk" | "Pacific/Easter" | "Pacific/Efate" | "Pacific/Enderbury" | "Pacific/Fakaofo" | "Pacific/Fiji" | "Pacific/Funafuti" | "Pacific/Galapagos" | "Pacific/Gambier" | "Pacific/Guadalcanal" | "Pacific/Guam" | "Pacific/Honolulu" | "Pacific/Johnston" | "Pacific/Kanton" | "Pacific/Kiritimati" | "Pacific/Kosrae" | "Pacific/Kwajalein" | "Pacific/Majuro" | "Pacific/Marquesas" | "Pacific/Midway" | "Pacific/Nauru" | "Pacific/Niue" | "Pacific/Norfolk" | "Pacific/Noumea" | "Pacific/Pago_Pago" | "Pacific/Palau" | "Pacific/Pitcairn" | "Pacific/Pohnpei" | "Pacific/Ponape" | "Pacific/Port_Moresby" | "Pacific/Rarotonga" | "Pacific/Saipan" | "Pacific/Samoa" | "Pacific/Tahiti" | "Pacific/Tarawa" | "Pacific/Tongatapu" | "Pacific/Truk" | "Pacific/Wake" | "Pacific/Wallis" | "Pacific/Yap" | "Poland" | "Portugal" | "ROC" | "ROK" | "Singapore" | "Turkey" | "UCT" | "US/Alaska" | "US/Aleutian" | "US/Arizona" | "US/Central" | "US/East-Indiana" | "US/Eastern" | "US/Hawaii" | "US/Indiana-Starke" | "US/Michigan" | "US/Mountain" | "US/Pacific" | "US/Samoa" | "UTC" | "Universal" | "W-SU" | "WET" | "Zulu" | "localtime") | null);
  /**
   * When access token expires (null for web sessions)
   */
  access_token_expires_at: (string | null);
  /**
   * When refresh token expires
   */
  refresh_token_expires_at: string;
  /**
   * Last activity time
   */
  last_used_at: string;
  /**
   * Session active status
   */
  is_active: boolean;
  /**
   * Device information
   */
  device: DeviceResponse;
}
/**
 * Schema for updating user information.
 */
export type UserUpdate = Partial<{ full_name: (string | null), phone: (string | null), tutorial_completed: (boolean | null) }>
/**
 * Transmuter for VerificationCode model.
 */
export type VerificationCode = {
  /**
   * Creation timestamp in Unix seconds
   */
  created_at: number;
  /**
   * Creator of the record
   */
  created_by: string;
  /**
   * Last update timestamp in Unix seconds
   */
  updated_at: number;
  /**
   * Last updater of the record
   */
  updated_by: string;
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Email address for verification
   */
  email: string;
  /**
   * SHA256 hash of verification code
   */
  code_hash: string;
  /**
   * Type of verification
   */
  type: string;
  /**
   * Reference to user
   */
  user_id: (string | null);
  /**
   * Number of verification attempts
   */
  attempts: number;
  /**
   * Maximum allowed attempts
   */
  max_attempts: number;
  /**
   * Whether the code has been used
   */
  is_used: boolean;
  /**
   * When code expires
   */
  expires_at: string;
  /**
   * When code was used
   */
  used_at: (string | null);
}
/**
 * Schema for verifying password reset code.
 */
export type VerifyResetCode = {
  /**
   * User email address
   */
  email: string;
  /**
   * 6-digit verification code
   */
  code: string;
}
/**
 * Schema for verification code response.
 */
export type VerifyResetCodeResponse = {
  /**
   * Temporary token for password reset
   */
  reset_token: string;
}
/**
 * Schema for web client login with remember_me support.
 */
export type WebLogin = {
  /**
   * User email address
   */
  email: string;
  /**
   * User password
   */
  password: string;
  /**
   * Schema for web client login with remember_me support.
   */
  remember_me?: boolean | undefined;
}
/**
 * Schema for web email verification with auto-login.
 */
export type WebVerification = {
  /**
   * User email address
   */
  email: string;
  /**
   * 6-digit verification code
   */
  code: string;
}
/**
 * Body for POST /external-connections — redeem a staged connection.
 * 
 * The completion token reaches the client out-of-band from the callback:
 * via ``postMessage`` on the web popup, or on the deep link a native app
 * intercepts. Redeeming it requires the caller's own credentials, which is
 * what stops a phished callback from granting anyone a connection.
 */
export type ClaimConnectionRequest = {
  /**
   * One-time token issued by the provider callback
   */
  completion_token: string;
}

    // </Schemas>
    }
  
  export namespace Endpoints {
  // <Endpoints>
  
  /**
 * Endpoint that serves Prometheus metrics.
 */
export type get_Metrics_metrics_get = {
      method: "GET",
      path: "/metrics",
      requestFormat: "json",
      parameters: never,
      responses: {200: unknown,
},
      
    }
export type post_Create_artifact_api_v1_artifacts__post = {
      method: "POST",
      path: "/api/v1/artifacts/",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ArtifactCreate,
          }
      responses: {201: Schemas.Artifact,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_List_artifacts_api_v1_artifacts__get = {
      method: "GET",
      path: "/api/v1/artifacts/",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_Artifact_> | null), or: (Array<Schemas.Criteria_Artifact_> | null), not: (Schemas.Criteria_Artifact_ | null), cursor: (Schemas.Cursor_Artifact_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+user_id" | "-user_id" | "+name" | "-name" | "+description" | "-description" | "+is_public" | "-is_public" | "+slug" | "-slug" | "+reaction" | "-reaction" | "+mimetype" | "-mimetype" | "+size" | "-size")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), name: (Schemas.TextCriteria_str_ | null), description: (Schemas.TextCriteria_str_ | null), is_public: (Schemas.NumericCriteria_bool_ | null), slug: (Schemas.TextCriteria_str_ | null), reaction: (Schemas.ExactCriteria_Literal__like____dislike____neutral___ | null), mimetype: (Schemas.TextCriteria_str_ | null), size: (Schemas.NumericCriteria_int_ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_Artifact_,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get artifact by share slug.
 * 
 * Slug-based lookup is the share-safe alternative to ``/artifacts/{artifact_id}``:
 * no internal id appears in the URL recipients receive. Auth is lenient so
 * recipients open the share page without (or with a stale) session — a valid
 * token still lets owners see their own artifact, while a missing or invalid
 * token degrades to anonymous (public-only) instead of a 401.
 */
export type get_Get_artifact_by_slug_api_v1_artifacts_by_slug__slug__get = {
      method: "GET",
      path: "/api/v1/artifacts/by-slug/{slug}",
      requestFormat: "json",
      parameters: {
            
        path:  {slug: string,
},
        
        
          }
      responses: {200: Schemas.Artifact,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get artifact by ID.
 * 
 * Publicly readable when the artifact is marked is_public; otherwise the
 * caller must be the owner. Anonymous callers requesting a private artifact
 * get 404.
 */
export type get_Get_artifact_api_v1_artifacts__artifact_id__get = {
      method: "GET",
      path: "/api/v1/artifacts/{artifact_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {artifact_id: string,
},
        
        
          }
      responses: {200: Schemas.Artifact,
422: Schemas.HTTPValidationError,
},
      
    }
export type patch_Update_artifact_api_v1_artifacts__artifact_id__patch = {
      method: "PATCH",
      path: "/api/v1/artifacts/{artifact_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {artifact_id: string,
},
        
        body:  Schemas.ArtifactUpdate,
          }
      responses: {200: Schemas.Artifact,
422: Schemas.HTTPValidationError,
},
      
    }
export type delete_Delete_artifact_api_v1_artifacts__artifact_id__delete = {
      method: "DELETE",
      path: "/api/v1/artifacts/{artifact_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {artifact_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Replace the artifact's file content, creating a new revision.
 */
export type put_Update_artifact_content_api_v1_artifacts__artifact_id__content_put = {
      method: "PUT",
      path: "/api/v1/artifacts/{artifact_id}/content",
      requestFormat: "form-data",
      parameters: {
            
        path:  {artifact_id: string,
},
        
        body:  Schemas.Body_update_artifact_content_api_v1_artifacts__artifact_id__content_put,
          }
      responses: {200: Schemas.FileUploadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Return the artifact's content with embedded references resolved.
 * 
 * For markdown and HTML bodies, ``streamify-file://{UUID}`` references are
 * rewritten to presigned URLs so embedded images/media render inline —
 * mirroring the note content endpoint. Only files linked to this artifact
 * are resolved; unauthorized references keep the raw marker. Other MIME
 * types are served verbatim.
 * 
 * Auth is lenient so the public share viewer (``/s/a/{slug}``) can fetch a
 * public markdown/HTML artifact's resolved body without a session — the
 * ``files.content.presigned_url`` is deliberately null for resolvable text, so
 * this endpoint is the only way an anonymous viewer reads it. A valid token
 * still lets owners read their own private artifacts; a missing or invalid
 * token degrades to anonymous (public-only), and a private artifact then
 * returns 404 rather than 401.
 */
export type get_Get_artifact_content_api_v1_artifacts__artifact_id__content_get = {
      method: "GET",
      path: "/api/v1/artifacts/{artifact_id}/content",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  /**
   * Revision number to retrieve
   */
  revision: (number | null);
}>,
        path:  {artifact_id: string,
},
        
        
          }
      responses: {200: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Mint a presigned URL for the artifact's content file.
 * 
 * A direct link to the raw content file, used to *display* image/binary
 * artifacts and for downloads — distinct from ``GET …/content``, which
 * serves resolved markdown/HTML text. References inside the body are NOT
 * resolved here; the bytes are served as stored.
 * 
 * Accessible to the artifact owner or any authenticated caller when the
 * artifact is marked public. ``w`` / ``h`` are baked into the signed URL
 * so the CloudFront image behavior's Lambda@Edge resizer serves a cached
 * variant; ignored for non-image MIMEs.
 */
export type post_Create_artifact_content_presigned_download_url_api_v1_artifacts__artifact_id__content_presigned_urls_post = {
      method: "POST",
      path: "/api/v1/artifacts/{artifact_id}/content/presigned-urls",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  expiration: number;
  /**
   * Revision number to retrieve
   */
  revision: (number | null);
  /**
   * Image resize width (ignored for non-images)
   */
  w: (number | null);
  /**
   * Image resize height (ignored for non-images)
   */
  h: (number | null);
}>,
        path:  {artifact_id: string,
},
        
        
          }
      responses: {200: Schemas.PresignedDownloadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Mint a presigned URL for the artifact's display sibling.
 * 
 * Prefers the display file (e.g. PDF preview of a PPTX) and falls back to
 * the content file if no display exists, matching the legacy semantics.
 * ``w`` / ``h`` are baked into the signed URL for the image-resize
 * Lambda@Edge; ignored for non-image MIMEs.
 */
export type post_Create_artifact_display_presigned_download_url_api_v1_artifacts__artifact_id__display_presigned_urls_post = {
      method: "POST",
      path: "/api/v1/artifacts/{artifact_id}/display/presigned-urls",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  expiration: number;
  /**
   * Revision number to retrieve
   */
  revision: (number | null);
  /**
   * Image resize width (ignored for non-images)
   */
  w: (number | null);
  /**
   * Image resize height (ignored for non-images)
   */
  h: (number | null);
}>,
        path:  {artifact_id: string,
},
        
        
          }
      responses: {200: Schemas.PresignedDownloadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Mint a presigned URL for the artifact's thumbnail sibling.
 * 
 * Prefers the thumbnail file (first page of the display PDF, or the image
 * itself for image artifacts) and falls back to the content file if no
 * thumbnail exists. ``w`` / ``h`` are baked into the signed URL for the
 * image-resize Lambda@Edge; ignored for non-image MIMEs.
 */
export type post_Create_artifact_thumbnail_presigned_download_url_api_v1_artifacts__artifact_id__thumbnail_presigned_urls_post = {
      method: "POST",
      path: "/api/v1/artifacts/{artifact_id}/thumbnail/presigned-urls",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  expiration: number;
  /**
   * Revision number to retrieve
   */
  revision: (number | null);
  /**
   * Image resize width (ignored for non-images)
   */
  w: (number | null);
  /**
   * Image resize height (ignored for non-images)
   */
  h: (number | null);
}>,
        path:  {artifact_id: string,
},
        
        
          }
      responses: {200: Schemas.PresignedDownloadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Returns the user's non-expired credit gauges — granted / used / remaining per bucket. Totals only; ledger history is not included.
 */
export type get_Get_credits_api_v1_me_billing_credits_get = {
      method: "GET",
      path: "/api/v1/me/billing/credits",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Schemas.BalanceResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Validates the code and applies its effect. For credit-grant codes the user's balance is increased immediately; for plan-discount codes the redemption is recorded so the next checkout attaches the corresponding provider coupon.
 */
export type post_Redeem_discount_code_api_v1_me_billing_discount_codes_redeem_post = {
      method: "POST",
      path: "/api/v1/me/billing/discount-codes/redeem",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.RedeemDiscountCodeRequest,
          }
      responses: {200: Schemas.RedeemDiscountCodeResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Returns the active or trialing subscription and the plan it is for. 404 when the user has no active subscription.
 */
export type get_Get_my_subscription_api_v1_me_billing_subscription_get = {
      method: "GET",
      path: "/api/v1/me/billing/subscription",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Schemas.SubscriptionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Creates a Stripe-hosted Checkout session for the requested plan. Trial days and any plan-discount promotion codes the user has redeemed are attached automatically. Returns 409 (API-BIS016) for a subscription plan while the user already holds a live paid subscription (active, trialing, or in dunning) — one paid subscription per user. Mobile clients should drive StoreKit / Play Billing natively using the provider_product_id returned by GET /plans instead of calling this endpoint.
 */
export type post_Create_checkout_session_api_v1_me_billing_checkout_session_post = {
      method: "POST",
      path: "/api/v1/me/billing/checkout-session",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.CheckoutSessionRequest,
          }
      responses: {200: Schemas.CheckoutSessionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Returns the current status of the Checkout session the user was redirected back from, so the success page can confirm that specific session completed instead of trusting the redirect. 404 when the session belongs to another user.
 */
export type get_Get_checkout_session_api_v1_me_billing_checkout_session__session_id__get = {
      method: "GET",
      path: "/api/v1/me/billing/checkout-session/{session_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {session_id: string,
},
        
        
          }
      responses: {200: Schemas.CheckoutSessionStatusResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Switches the current user to another plan. Routing is a strict price-and-credits comparison: an upgrade applies immediately (prorated, new allotment replaces the old); a downgrade is rejected with 400 (API-BIS017) and the subscription is left unchanged — it continues to renew unless canceled separately (portal / store settings); a change where price and credits move opposite ways is rejected (API-BIS012). Switching off the Free tier returns a hosted checkout URL (kind=checkout) to redirect to.
 */
export type post_Change_plan_api_v1_me_billing_plan_post = {
      method: "POST",
      path: "/api/v1/me/billing/plan",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.PlanChangeRequest,
          }
      responses: {200: Schemas.PlanChangeResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Creates a Stripe-hosted Customer Portal session for the current customer — where they update their payment method, download invoices, and cancel or resume their subscription — and returns the URL to redirect to. 404 (API-BIS010) when the user has no billing account yet (never checked out). The route is provider-namespaced: Apple / Google subscriptions are managed natively in the stores and will get their own provider-specific routes.
 */
export type post_Create_portal_session_api_v1_me_billing_stripe_portal_session_post = {
      method: "POST",
      path: "/api/v1/me/billing/stripe/portal-session",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.StripePortalSessionRequest,
          }
      responses: {200: Schemas.StripePortalSessionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Verifies a client-presented purchase token (Google Play / Apple) against the provider server API and applies the resulting credit grant for the authenticated user. Idempotent — re-posting the same token is a no-op. Returns 409 (API-BIS016) for a subscription purchase while the user already holds a live paid subscription (active, trialing, or in dunning) with another provider — one paid subscription per user. Web (Stripe) clients use /checkout-session instead.
 */
export type post_Create_purchase_api_v1_me_billing_purchases_post = {
      method: "POST",
      path: "/api/v1/me/billing/purchases",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.PurchaseVerifyRequest,
          }
      responses: {200: Schemas.PurchaseResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Returns the active subscription tiers and credit packs purchasable through the given provider, each with its listing (the provider product id to drive checkout / StoreKit / Play Billing with). Plans the provider does not sell are omitted.
 */
export type get_List_plans_api_v1_plans__provider__get = {
      method: "GET",
      path: "/api/v1/plans/{provider}",
      requestFormat: "json",
      parameters: {
            
        path:  {provider: ("stripe" | "apple" | "google" | "internal"),
},
        
        
          }
      responses: {200: Schemas.PlanListResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create a note from an entire conversation.
 */
export type post_Create_note_from_conversation_api_v1_notes_conversations_post = {
      method: "POST",
      path: "/api/v1/notes/conversations",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.NoteCreateFromConversation,
          }
      responses: {201: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create a note from a single message in a conversation.
 */
export type post_Create_note_from_message_api_v1_notes_messages_post = {
      method: "POST",
      path: "/api/v1/notes/messages",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.NoteCreateFromMessage,
          }
      responses: {201: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create note from an already-uploaded file.
 * 
 * References the file by ID and queues it for background parsing.
 */
export type post_Create_note_from_file_api_v1_notes_files_post = {
      method: "POST",
      path: "/api/v1/notes/files",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ArticleCreateFromFile,
          }
      responses: {201: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create a note from an artifact's file.
 */
export type post_Create_note_from_artifact_api_v1_notes_artifacts_post = {
      method: "POST",
      path: "/api/v1/notes/artifacts",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.NoteCreateFromArtifact,
          }
      responses: {201: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create note from text input.
 * 
 * Auto-routes to URL processing when the input is a standalone URL or a
 * recognized social share blob (xiaohongshu/xhslink, douyin). Otherwise the
 * text is saved as content.
 */
export type post_Create_note_from_text_api_v1_notes_text_post = {
      method: "POST",
      path: "/api/v1/notes/text",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ArticleCreateFromText,
          }
      responses: {201: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Alias of POST /notes/text — same auto-detecting handler.
 */
export type post_Create_note_from_url_api_v1_notes_url_post = {
      method: "POST",
      path: "/api/v1/notes/url",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ArticleCreateFromUrl,
          }
      responses: {201: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get note by share slug.
 * 
 * Slug-based lookup is the share-safe alternative to ``/notes/{note_id}``:
 * no internal id appears in the URL recipients receive. Auth is lenient so
 * recipients open the share page without (or with a stale) session — a valid
 * token still lets owners see their own note, while a missing or invalid
 * token degrades to anonymous (public-only) instead of a 401.
 */
export type get_Get_note_by_slug_api_v1_notes_by_slug__slug__get = {
      method: "GET",
      path: "/api/v1/notes/by-slug/{slug}",
      requestFormat: "json",
      parameters: {
            
        path:  {slug: string,
},
        
        
          }
      responses: {200: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get note by ID.
 * 
 * Publicly readable when the note is marked is_public; otherwise the caller
 * must be the owner. Anonymous callers requesting a private note get 404.
 */
export type get_Get_note_api_v1_notes__note_id__get = {
      method: "GET",
      path: "/api/v1/notes/{note_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {note_id: string,
},
        
        
          }
      responses: {200: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Update a note. Only the note owner can update.
 */
export type patch_Update_note_api_v1_notes__note_id__patch = {
      method: "PATCH",
      path: "/api/v1/notes/{note_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {note_id: string,
},
        
        body:  Schemas.NoteUpdate,
          }
      responses: {200: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Delete a note.
 */
export type delete_Delete_note_api_v1_notes__note_id__delete = {
      method: "DELETE",
      path: "/api/v1/notes/{note_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {note_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * List notes for the current user.
 */
export type get_List_notes_api_v1_notes__get = {
      method: "GET",
      path: "/api/v1/notes/",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.NestedCriteriaBranch_Note_> | null), or: (Array<Schemas.NestedCriteriaBranch_Note_> | null), not: (Schemas.NestedCriteriaBranch_Note_ | null), cursor: (Schemas.NestedCursor_Note_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+status" | "-status" | "+error_message" | "-error_message" | "+last_accessed_at" | "-last_accessed_at" | "+reindex_requested_at" | "-reindex_requested_at" | "+comment" | "-comment" | "+title_override" | "-title_override" | "+description_override" | "-description_override" | "+is_public" | "-is_public" | "+slug" | "-slug" | "+reaction" | "-reaction" | "+user_id" | "-user_id" | "+article_id" | "-article_id" | "+source" | "-source" | "+title" | "-title" | "+description" | "-description")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), status: (Schemas.ExactCriteria_Literal__queued____processing____ready____error___ | null), error_message: (Schemas.TextCriteria_str_ | null), last_accessed_at: (Schemas.NumericCriteria_datetime_ | null), reindex_requested_at: (Schemas.NumericCriteria_datetime_ | null), comment: (Schemas.TextCriteria_str_ | null), title_override: (Schemas.TextCriteria_str_ | null), description_override: (Schemas.TextCriteria_str_ | null), is_public: (Schemas.NumericCriteria_bool_ | null), slug: (Schemas.TextCriteria_str_ | null), reaction: (Schemas.ExactCriteria_Literal__like____dislike____neutral___ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), article_id: (Schemas.NumericCriteria_UUID_ | null), source: (Schemas.TextCriteria_str_ | null), title: (Schemas.TextCriteria_str_ | null), description: (Schemas.TextCriteria_str_ | null), file_refs: (Schemas.Criteria_FileReference_ | null), files: (Schemas.Criteria_File_ | null), key_frames: (Schemas.Criteria_KeyFrame_ | null), article: (Schemas.Criteria_Article_ | null), tags: (Schemas.Criteria_Tag_ | null), collections: (Schemas.Criteria_Collection_ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_Note_,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Retry processing a failed note.
 * 
 * Re-dispatches the note processing pipeline when the note status is 'error'.
 * Only the note owner can retry.
 * 
 * When *force* is ``True``, a brand-new article is created (copying the
 * origin files) and the full pipeline runs from scratch.  The old article
 * is left untouched.
 */
export type post_Retry_note_api_v1_notes__note_id__retry_post = {
      method: "POST",
      path: "/api/v1/notes/{note_id}/retry",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ force: boolean }>,
        path:  {note_id: string,
},
        
        
          }
      responses: {200: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Copy a public note.
 * 
 * Creates a copy of a public note for the current user.
 * If a comment is provided, triggers content generation pipeline.
 */
export type post_Copy_note_api_v1_notes__note_id__copy_post = {
      method: "POST",
      path: "/api/v1/notes/{note_id}/copy",
      requestFormat: "json",
      parameters: {
            
        path:  {note_id: string,
},
        
        body:  Schemas.NoteCopy,
          }
      responses: {201: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get file metadata through a note.
 * 
 * Accessible if the parent note is public or owned by the caller.
 */
export type get_Get_note_file_metadata_api_v1_notes__note_id__files__file_id__get = {
      method: "GET",
      path: "/api/v1/notes/{note_id}/files/{file_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {note_id: string,
file_id: string,
},
        
        
          }
      responses: {200: Schemas.FileInfo,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get the resolved text content for a note.
 * 
 * Returns the note's content file (or falls back to the article's content
 * file). For markdown and HTML, ``streamify-file://`` references are
 * resolved to real HTTP URLs. Accessible if the parent note is public or
 * owned by the caller.
 */
export type get_Get_note_content_api_v1_notes__note_id__content_get = {
      method: "GET",
      path: "/api/v1/notes/{note_id}/content",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  /**
   * Revision number to retrieve
   */
  revision: (number | null);
}>,
        path:  {note_id: string,
},
        
        
          }
      responses: {200: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Mint a presigned URL for the note's display file (e.g. PDF preview).
 * 
 * Accessible to the note owner or any caller when the note is marked
 * public. Returns 404 when the note has no display file — callers can
 * fall back to ``GET /notes/{note_id}/content`` for the markdown body.
 * ``w`` / ``h`` are baked into the signed URL for the image-resize
 * Lambda@Edge; ignored for non-image MIMEs.
 * 
 * Uses lenient auth: a valid token resolves the owner (so private notes they
 * own are reachable), while a missing or stale token degrades to anonymous
 * (public-only) instead of a 401, and CSRF is not enforced.
 */
export type post_Create_note_display_presigned_download_url_api_v1_notes__note_id__display_presigned_urls_post = {
      method: "POST",
      path: "/api/v1/notes/{note_id}/display/presigned-urls",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  expiration: number;
  /**
   * Revision number to retrieve
   */
  revision: (number | null);
  /**
   * Image resize width (ignored for non-images)
   */
  w: (number | null);
  /**
   * Image resize height (ignored for non-images)
   */
  h: (number | null);
}>,
        path:  {note_id: string,
},
        
        
          }
      responses: {200: Schemas.PresignedDownloadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create a presigned download URL for a file linked to a note.
 * 
 * Note ownership/public access gates URL minting — a caller who can read
 * the note can read its referenced files. Mirrors the access check the
 * legacy ``GET /notes/{id}/files/{id}/content`` redirect enforced.
 * ``w`` / ``h`` are baked into the signed URL for the image-resize
 * Lambda@Edge; ignored for non-image MIMEs.
 * 
 * Uses lenient auth: a valid token resolves the owner (so private notes they
 * own are reachable), while a missing or stale token degrades to anonymous
 * (public-only) instead of a 401, and CSRF is not enforced.
 */
export type post_Create_note_file_content_presigned_download_url_api_v1_notes__note_id__files__file_id__content_presigned_urls_post = {
      method: "POST",
      path: "/api/v1/notes/{note_id}/files/{file_id}/content/presigned-urls",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  expiration: number;
  /**
   * Revision number to retrieve
   */
  revision: (number | null);
  /**
   * Image resize width (ignored for non-images)
   */
  w: (number | null);
  /**
   * Image resize height (ignored for non-images)
   */
  h: (number | null);
}>,
        path:  {note_id: string,
file_id: string,
},
        
        
          }
      responses: {200: Schemas.PresignedDownloadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Update file content through a note. Only the note owner can update.
 */
export type put_Update_note_content_file_api_v1_notes__note_id__files__file_id__content_put = {
      method: "PUT",
      path: "/api/v1/notes/{note_id}/files/{file_id}/content",
      requestFormat: "form-data",
      parameters: {
            
        path:  {note_id: string,
file_id: string,
},
        
        body:  Schemas.Body_update_note_content_file_api_v1_notes__note_id__files__file_id__content_put,
          }
      responses: {200: Schemas.FileUploadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * List all revisions of a file through a note. Only the note owner can list.
 */
export type get_List_note_content_file_revisions_api_v1_notes__note_id__files__file_id__revisions_get = {
      method: "GET",
      path: "/api/v1/notes/{note_id}/files/{file_id}/revisions",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_FileRevision_> | null), or: (Array<Schemas.Criteria_FileRevision_> | null), not: (Schemas.Criteria_FileRevision_ | null), cursor: (Schemas.Cursor_FileRevision_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+file_id" | "-file_id" | "+s3_object_id" | "-s3_object_id" | "+revision_number" | "-revision_number")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), file_id: (Schemas.NumericCriteria_UUID_ | null), s3_object_id: (Schemas.NumericCriteria_UUID_ | null), revision_number: (Schemas.NumericCriteria_int_ | null) }>,
        path:  {note_id: string,
file_id: string,
},
        
        
          }
      responses: {200: Schemas.Page_FileRevision_,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Revert a file to a previous revision through a note. Only the note owner can revert.
 */
export type post_Revert_note_content_file_revision_api_v1_notes__note_id__files__file_id__revisions__revision_id__revert_post = {
      method: "POST",
      path: "/api/v1/notes/{note_id}/files/{file_id}/revisions/{revision_id}/revert",
      requestFormat: "json",
      parameters: {
            
        path:  {note_id: string,
file_id: string,
revision_id: string,
},
        
        
          }
      responses: {200: Schemas.FileUploadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Set tags on a note (replaces all existing tags).
 */
export type put_Set_note_tags_api_v1_notes__note_id__tags_put = {
      method: "PUT",
      path: "/api/v1/notes/{note_id}/tags",
      requestFormat: "json",
      parameters: {
            
        path:  {note_id: string,
},
        
        body:  Schemas.NoteTagsUpdate,
          }
      responses: {200: Schemas.Note,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * List collections the classifier suggested for this note.
 */
export type get_List_suggested_collections_for_note_api_v1_notes__note_id__suggested_collections_get = {
      method: "GET",
      path: "/api/v1/notes/{note_id}/suggested-collections",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_CollectionSuggestion_> | null), or: (Array<Schemas.Criteria_CollectionSuggestion_> | null), not: (Schemas.Criteria_CollectionSuggestion_ | null), cursor: (Schemas.Cursor_CollectionSuggestion_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+note_id" | "-note_id" | "+collection_id" | "-collection_id" | "+user_id" | "-user_id" | "+confidence" | "-confidence" | "+reason" | "-reason" | "+status" | "-status")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), note_id: (Schemas.NumericCriteria_UUID_ | null), collection_id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), confidence: (Schemas.NumericCriteria_float_ | null), reason: (Schemas.TextCriteria_str_ | null), status: (Schemas.ExactCriteria_Literal__pending____accepted____dismissed___ | null) }>,
        path:  {note_id: string,
},
        
        
          }
      responses: {200: Schemas.Page_CollectionSuggestion_,
422: Schemas.HTTPValidationError,
},
      
    }
export type post_Create_tag_api_v1_tags__post = {
      method: "POST",
      path: "/api/v1/tags/",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.TagCreate,
          }
      responses: {201: Schemas.Tag,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_List_tags_api_v1_tags__get = {
      method: "GET",
      path: "/api/v1/tags/",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_Tag_> | null), or: (Array<Schemas.Criteria_Tag_> | null), not: (Schemas.Criteria_Tag_ | null), cursor: (Schemas.Cursor_Tag_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+name" | "-name" | "+color" | "-color" | "+user_id" | "-user_id")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), name: (Schemas.TextCriteria_str_ | null), color: (Schemas.ExactCriteria_Literal__neutral____slate____gray____zinc____stone____red____orange____amber____yellow____lime____green____emerald____teal____cyan____sky____blue____indigo____violet____purple____fuchsia____pink____rose___ | null), user_id: (Schemas.NumericCriteria_UUID_ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_Tag_,
422: Schemas.HTTPValidationError,
},
      
    }
export type patch_Update_tag_api_v1_tags__tag_id__patch = {
      method: "PATCH",
      path: "/api/v1/tags/{tag_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {tag_id: string,
},
        
        body:  Schemas.TagUpdate,
          }
      responses: {200: Schemas.Tag,
422: Schemas.HTTPValidationError,
},
      
    }
export type delete_Delete_tag_api_v1_tags__tag_id__delete = {
      method: "DELETE",
      path: "/api/v1/tags/{tag_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {tag_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create a new file resource.
 * 
 * RESTful: POST /files - Create new file resource
 */
export type post_Create_file_api_v1_files__post = {
      method: "POST",
      path: "/api/v1/files/",
      requestFormat: "form-data",
      parameters: {
            
        
        
        body:  Schemas.Body_create_file_api_v1_files__post,
          }
      responses: {200: Schemas.FileUploadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get file resource metadata.
 * 
 * RESTful: GET /files/{id} - Get file resource (metadata only)
 * Returns public files to anyone, or private files to their owner.
 */
export type get_Get_file_metadata_api_v1_files__file_id__get = {
      method: "GET",
      path: "/api/v1/files/{file_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {file_id: string,
},
        
        
          }
      responses: {200: Schemas.FileInfo,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Delete a file permanently.
 * 
 * RESTful: DELETE /files/{id}
 * Only the uploading user can delete their file.
 */
export type delete_Delete_file_api_v1_files__file_id__delete = {
      method: "DELETE",
      path: "/api/v1/files/{file_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {file_id: string,
},
        
        
          }
      responses: {200: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create multiple file resources in batch.
 * 
 * RESTful: POST /files/batch - Batch create operation
 * Processes all files in parallel using asyncio.TaskGroup.
 * Each file gets its own database session to avoid transaction conflicts.
 */
export type post_Create_files_batch_api_v1_files_batch_post = {
      method: "POST",
      path: "/api/v1/files/batch",
      requestFormat: "form-data",
      parameters: {
            
        
        
        body:  Schemas.Body_create_files_batch_api_v1_files_batch_post,
          }
      responses: {200: Array<Schemas.BatchFileUploadResult>,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create presigned URL sub-resource for file.
 * 
 * Accessible to the file owner (private files) or any caller (including
 * anonymous viewers) when the file is marked public. Optional ``revision``
 * targets a specific historical revision instead of the current S3 key.
 * 
 * ``w`` / ``h`` are baked into the signed URL so the CloudFront image
 * behavior's Lambda@Edge resizer serves a cached variant.
 * 
 * Uses lenient auth: a valid token resolves the owner (so private files they
 * own are reachable), while a missing or stale token degrades to anonymous
 * (public-only) instead of a 401, and CSRF is not enforced.
 */
export type post_Create_presigned_download_url_api_v1_files__file_id__content_presigned_urls_post = {
      method: "POST",
      path: "/api/v1/files/{file_id}/content/presigned-urls",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  expiration: number;
  /**
   * Revision number to retrieve
   */
  revision: (number | null);
  /**
   * Image resize width (ignored for non-images)
   */
  w: (number | null);
  /**
   * Image resize height (ignored for non-images)
   */
  h: (number | null);
}>,
        path:  {file_id: string,
},
        
        
          }
      responses: {200: Schemas.PresignedDownloadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create presigned upload URL resource.
 * 
 * RESTful: POST /files/presigned-urls - Create presigned URL resource
 * Use POST /files/completions afterward to complete the upload.
 */
export type post_Create_presigned_upload_url_api_v1_files_presigned_urls_post = {
      method: "POST",
      path: "/api/v1/files/presigned-urls",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.PresignedUploadRequest,
          }
      responses: {200: Schemas.PresignedUploadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create upload completion resource.
 * 
 * RESTful: POST /files/completions - Create completion resource
 */
export type post_Complete_upload_api_v1_files_completions_post = {
      method: "POST",
      path: "/api/v1/files/completions",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.CompleteUploadRequest,
          }
      responses: {200: Schemas.FileUploadResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create file verification resource.
 * 
 * RESTful: POST /files/{id}/verifications - Create verification sub-resource
 */
export type post_Create_file_verification_api_v1_files__file_id__verifications_post = {
      method: "POST",
      path: "/api/v1/files/{file_id}/verifications",
      requestFormat: "json",
      parameters: {
            
        path:  {file_id: string,
},
        
        
          }
      responses: {200: Schemas.FileVerificationResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Reverse-engineer a bilingual text-to-image prompt from an image.
 */
export type post_Create_image_prompt_api_v1_image_prompts__post = {
      method: "POST",
      path: "/api/v1/image-prompts/",
      requestFormat: "form-data",
      parameters: {
            
        
        
        body:  Schemas.Body_create_image_prompt_api_v1_image_prompts__post,
          }
      responses: {200: Schemas.ImagePromptResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Explain the selected text in plain language.
 */
export type post_Create_explanation_api_v1_text_selections_explanations_post = {
      method: "POST",
      path: "/api/v1/text-selections/explanations",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.TextSelectionRequest,
          }
      responses: {200: Schemas.TextSelectionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Summarize the selected text.
 */
export type post_Create_summary_api_v1_text_selections_summaries_post = {
      method: "POST",
      path: "/api/v1/text-selections/summaries",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.TextSelectionRequest,
          }
      responses: {200: Schemas.TextSelectionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Translate the selected text into ``target_language``.
 */
export type post_Create_translation_api_v1_text_selections_translations_post = {
      method: "POST",
      path: "/api/v1/text-selections/translations",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.TextTranslationRequest,
          }
      responses: {200: Schemas.TextSelectionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create a new session by authenticating with email and password
 */
export type post_Create_session_api_v1_session_post = {
      method: "POST",
      path: "/api/v1/session",
      requestFormat: "json",
      parameters: {
            
        
        header:  {"user-agent": string,
"x-device-name": string,
"x-device-model": string,
"x-os-name": string,
"x-os-version": string,
"x-app-version": string,
},
        body:  Schemas.UserLogin,
          }
      responses: {201: Schemas.NewSessionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get information about the current session
 */
export type get_Get_current_session_api_v1_session_get = {
      method: "GET",
      path: "/api/v1/session",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Schemas.UserSessionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Refresh the session using a refresh token
 */
export type put_Refresh_session_api_v1_session_put = {
      method: "PUT",
      path: "/api/v1/session",
      requestFormat: "json",
      parameters: {
            
        
        header:  {"user-agent": string,
"x-device-name": string,
"x-device-model": string,
"x-os-name": string,
"x-os-version": string,
"x-app-version": string,
},
        body:  Schemas.RefreshTokenRequest,
          }
      responses: {200: Schemas.NewSessionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Delete the current session
 */
export type delete_Delete_session_api_v1_session_delete = {
      method: "DELETE",
      path: "/api/v1/session",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Authenticate with OAuth ID token (Google, Apple, etc.)
 */
export type post_Login_with_oauth_api_v1_session__provider__post = {
      method: "POST",
      path: "/api/v1/session/{provider}",
      requestFormat: "json",
      parameters: {
            
        path:  {provider: ("apple" | "google"),
},
        header:  {"user-agent": string,
"x-device-name": string,
"x-device-model": string,
"x-os-name": string,
"x-os-version": string,
"x-app-version": string,
},
        body:  Schemas.OAuthLoginRequest,
          }
      responses: {201: Schemas.NewSessionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get all active sessions for the current user
 */
export type get_List_sessions_api_v1_sessions_get = {
      method: "GET",
      path: "/api/v1/sessions",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_UserSession_> | null), or: (Array<Schemas.Criteria_UserSession_> | null), not: (Schemas.Criteria_UserSession_ | null), cursor: (Schemas.Cursor_UserSession_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+user_id" | "-user_id" | "+access_token_hash" | "-access_token_hash" | "+refresh_token_hash" | "-refresh_token_hash" | "+source" | "-source" | "+device_id" | "-device_id" | "+app_version" | "-app_version" | "+user_agent" | "-user_agent" | "+timezone" | "-timezone" | "+last_used_at" | "-last_used_at" | "+is_active" | "-is_active" | "+access_token_expires_at" | "-access_token_expires_at" | "+refresh_token_expires_at" | "-refresh_token_expires_at" | "+remember_me" | "-remember_me")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), access_token_hash: (Schemas.TextCriteria_str_ | null), refresh_token_hash: (Schemas.TextCriteria_str_ | null), source: (Schemas.TextCriteria_str_ | null), device_id: (Schemas.NumericCriteria_UUID_ | null), app_version: (Schemas.TextCriteria_str_ | null), user_agent: (Schemas.TextCriteria_str_ | null), timezone: (Schemas.TextCriteria_str_ | null), last_used_at: (Schemas.NumericCriteria_datetime_ | null), is_active: (Schemas.NumericCriteria_bool_ | null), access_token_expires_at: (Schemas.NumericCriteria_datetime_ | null), refresh_token_expires_at: (Schemas.NumericCriteria_datetime_ | null), remember_me: (Schemas.NumericCriteria_bool_ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_UserSession_,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Delete all sessions for the current user (logout from all devices)
 */
export type delete_Delete_all_sessions_api_v1_sessions_delete = {
      method: "DELETE",
      path: "/api/v1/sessions",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Delete a specific session by ID
 */
export type delete_Delete_specific_session_api_v1_sessions__session_id__delete = {
      method: "DELETE",
      path: "/api/v1/sessions/{session_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {session_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create a new session with cookie-based authentication for web clients
 */
export type post_Create_web_session_api_v1_web_session_post = {
      method: "POST",
      path: "/api/v1/web-session",
      requestFormat: "json",
      parameters: {
            
        
        header:  Partial<{ "x-device-name": (string | null), "x-device-model": (string | null), "x-os-name": (string | null), "x-os-version": (string | null), "x-app-version": (string | null) }>,
        body:  Schemas.WebLogin,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Refresh the session using the refresh token cookie
 */
export type put_Refresh_web_session_api_v1_web_session_put = {
      method: "PUT",
      path: "/api/v1/web-session",
      requestFormat: "json",
      parameters: {
            
        
        header:  Partial<{ "x-device-name": (string | null), "x-device-model": (string | null), "x-os-name": (string | null), "x-os-version": (string | null), "x-app-version": (string | null) }>,
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Delete the current session and clear authentication cookies
 */
export type delete_Delete_web_session_api_v1_web_session_delete = {
      method: "DELETE",
      path: "/api/v1/web-session",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get information about the current session
 */
export type get_Get_current_web_session_api_v1_web_session_get = {
      method: "GET",
      path: "/api/v1/web-session",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Schemas.UserSessionResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Authenticate with OAuth ID token and set cookie-based session
 */
export type post_Login_with_oauth_web_api_v1_web_session__provider__post = {
      method: "POST",
      path: "/api/v1/web-session/{provider}",
      requestFormat: "json",
      parameters: {
            
        path:  {provider: ("apple" | "google"),
},
        header:  Partial<{ "x-device-name": (string | null), "x-device-model": (string | null), "x-os-name": (string | null), "x-os-version": (string | null), "x-app-version": (string | null) }>,
        body:  Schemas.OAuthLoginRequest,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Verify email with code and create a cookie-authenticated session in one step
 */
export type post_Verify_email_and_create_web_session_api_v1_web_verification_post = {
      method: "POST",
      path: "/api/v1/web-verification",
      requestFormat: "json",
      parameters: {
            
        
        header:  Partial<{ "x-device-name": (string | null), "x-device-model": (string | null), "x-os-name": (string | null), "x-os-version": (string | null), "x-app-version": (string | null) }>,
        body:  Schemas.WebVerification,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Register a new user with email, password/OAuth, and required preferences
 */
export type post_Create_user_api_v1_users_post = {
      method: "POST",
      path: "/api/v1/users",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.UserRegistration,
          }
      responses: {201: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Resend verification code to unverified email (public endpoint)
 */
export type post_Resend_verification_api_v1_users_verification_requests_post = {
      method: "POST",
      path: "/api/v1/users/verification-requests",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ResendVerificationRequest,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Verify email with 6-digit code
 */
export type put_Confirm_verification_api_v1_users_verification_put = {
      method: "PUT",
      path: "/api/v1/users/verification",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.Body_confirm_verification_api_v1_users_verification_put,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Step 1: Create a password reset request (sends 6-digit code via email)
 */
export type post_Create_password_reset_request_api_v1_users_password_reset_requests_post = {
      method: "POST",
      path: "/api/v1/users/password-reset-requests",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ResetPasswordRequest,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Step 2: Create a reset token by providing the 6-digit verification code
 */
export type post_Create_password_reset_token_api_v1_users_password_reset_tokens_post = {
      method: "POST",
      path: "/api/v1/users/password-reset-tokens",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.VerifyResetCode,
          }
      responses: {201: Schemas.VerifyResetCodeResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Step 3: Complete password reset using reset token (revokes all sessions, no authentication required)
 */
export type put_Reset_password_api_v1_users_password_put = {
      method: "PUT",
      path: "/api/v1/users/password",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ResetPassword,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Change password for authenticated user (requires current password)
 */
export type put_Change_password_api_v1_users_me_password_put = {
      method: "PUT",
      path: "/api/v1/users/me/password",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ChangePassword,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get current authenticated user's information
 */
export type get_Get_current_user_api_v1_users_me_get = {
      method: "GET",
      path: "/api/v1/users/me",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Schemas.User,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Update current user's information
 */
export type put_Update_current_user_api_v1_users_me_put = {
      method: "PUT",
      path: "/api/v1/users/me",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.UserUpdate,
          }
      responses: {200: Schemas.User,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Delete current user's account
 */
export type delete_Delete_current_user_api_v1_users_me_delete = {
      method: "DELETE",
      path: "/api/v1/users/me",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Consume an activation code and complete account activation.
 */
export type post_Submit_activation_code_api_v1_users_me_activation_code_post = {
      method: "POST",
      path: "/api/v1/users/me/activation-code",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ActivationCodeSubmission,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Generate a new invitation code for the current user
 */
export type put_Regenerate_invitation_code_api_v1_users_me_invitation_code_put = {
      method: "PUT",
      path: "/api/v1/users/me/invitation-code",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get sample feature flag value for current user
 */
export type get_Get_user_feature_flags_api_v1_users_me_feature_flags_get = {
      method: "GET",
      path: "/api/v1/users/me/feature_flags",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Array<(Schemas.ConversationFeatureFlag | Schemas.InsightFeatureFlag)>,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create a personal access token. The plaintext key is returned only once in this response.
 */
export type post_Create_api_key_api_v1_users_me_api_keys_post = {
      method: "POST",
      path: "/api/v1/users/me/api-keys",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ApiKeyCreateRequest,
          }
      responses: {201: Schemas.ApiKeyCreateResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * List the authenticated user's API keys (secrets never returned).
 */
export type get_List_api_keys_api_v1_users_me_api_keys_get = {
      method: "GET",
      path: "/api/v1/users/me/api-keys",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Array<Schemas.ApiKeyResponse>,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Revoke (soft-delete) an API key owned by the authenticated user.
 */
export type delete_Revoke_api_key_api_v1_users_me_api_keys__api_key_id__delete = {
      method: "DELETE",
      path: "/api/v1/users/me/api-keys/{api_key_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {api_key_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get demographic information for current user
 */
export type get_Get_demographic_api_v1_users_me_demographic_get = {
      method: "GET",
      path: "/api/v1/users/me/demographic",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Schemas.UserDemographicResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Update demographic information for current user
 */
export type put_Update_demographic_api_v1_users_me_demographic_put = {
      method: "PUT",
      path: "/api/v1/users/me/demographic",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.UserDemographicUpdate,
          }
      responses: {200: Schemas.UserDemographicResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get preferences for current user
 */
export type get_Get_preferences_api_v1_users_me_preferences_get = {
      method: "GET",
      path: "/api/v1/users/me/preferences",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Schemas.UserPreferencesResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Update preferences for current user
 */
export type put_Update_preferences_api_v1_users_me_preferences_put = {
      method: "PUT",
      path: "/api/v1/users/me/preferences",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.UserPreferencesUpdate,
          }
      responses: {200: Schemas.UserPreferencesResponse,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Create a new conversation with user message and return an async run receipt.
 */
export type post_Create_conversation_and_chat_api_v1_conversations_post = {
      method: "POST",
      path: "/api/v1/conversations",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ChatRequestSchema,
          }
      responses: {202: Schemas.ConversationRunReceipt,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * List all conversations for the authenticated user with cursor-based pagination
 */
export type get_List_conversations_api_v1_conversations_get = {
      method: "GET",
      path: "/api/v1/conversations",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_Conversation_> | null), or: (Array<Schemas.Criteria_Conversation_> | null), not: (Schemas.Criteria_Conversation_ | null), cursor: (Schemas.Cursor_Conversation_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+user_id" | "-user_id" | "+name" | "-name" | "+pinned" | "-pinned")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), name: (Schemas.TextCriteria_str_ | null), pinned: (Schemas.NumericCriteria_bool_ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_Conversation_,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Replay and tail the active Redis-backed conversation SSE stream.
 * 
 * 
 * Streams AI response using Server-Sent Events (SSE).
 * 
 * ## SSE Format
 * Replay stream events are sent as `event: <type>\ndata: <json>\n\n`
 * with a final `data: [DONE]\n\n`. Ping frames use `event: ping` and `data: {}`.
 * 
 * ## Event Types
 * Determined by the `type` field:
 * - **trace**: Agent execution trace. The `delta` field is a `ConversationStreamEvent` object with `{run_id, root_run_id, parent_run_id, agent_name, payload}`. `payload` is the raw pydantic-ai event discriminated by `payload.event_kind`.
 * - **narration**: User-visible mid-run narration from the main agent. `delta` is a text chunk.
 * - **content**: Assistant response content. `delta` is a text chunk.
 * - **review_rejected**: Pro-mode reviewer rejected the draft. `delta` is reviewer feedback text.
 * - **clarification_requested**: The main agent invoked the ask-user tool to request human input. `delta` is empty; `clarification` contains the typed question card.
 * - **clarification_resolved**: User answered, skipped, or cancelled the clarification. `delta` is empty; `clarification` contains the resolved state.
 * - **resource_updated**: A mutating agent tool updated a note or artifact. `delta` is empty; `resource_updates` contains changed resources.
 * - **citations**: Citation payload emitted after web search.
 * - **done**: Stream completed successfully. `delta` is an empty string.
 * - **error**: An error occurred. `delta` is an empty string; see `error` for details.
 * 
 * For live assistant text carried by trace events, append only root-run text chunks:
 * - `parent_run_id == null`
 * - `payload.event_kind == "part_start"` and `payload.part.part_kind == "text"`: append `payload.part.content`
 * - `payload.event_kind == "part_delta"` and `payload.delta.part_delta_kind == "text"`: append `payload.delta.content_delta`
 * 
 * ## Event Schema
 * | Field | Type | Description |
 * |-------|------|-------------|
 * | conversation_id | UUID | ID of the conversation |
 * | message_id | UUID | ID of the public assistant message being generated |
 * | delta | string \| object | Depends on `type`: text for `content`/`narration`/`review_rejected`, `ConversationStreamEvent` object for `trace`, empty string for `citations`/`resource_updated`/`clarification_requested`/`clarification_resolved`/`done`/`error` |
 * | type | string | 'trace', 'narration', 'content', 'review_rejected', 'clarification_requested', 'clarification_resolved', 'resource_updated', 'citations', 'done', or 'error' |
 * | finish_reason | string \| null | 'stop' on success, 'error' on failure, null during streaming |
 * | created_at | number | Unix timestamp in seconds |
 * | error | object \| null | Error details if type is 'error' |
 * | citations | object \| null | Citation details if type is 'citations' |
 * | resource_updates | object \| null | Changed resources if type is 'resource_updated' |
 * | clarification | object \| null | Clarification payload when type is `clarification_requested` or `clarification_resolved` |
 * 
 * Raw Pydantic-AI model messages are persisted separately for agent internals; the SSE contract remains the public text/trace stream.
 */
export type get_Stream_conversation_run_api_v1_conversations__conversation_id__stream_get = {
      method: "GET",
      path: "/api/v1/conversations/{conversation_id}/stream",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  /**
   * Redis Stream event ID to resume after
   */
  after: (string | null);
}>,
        path:  {conversation_id: string,
},
        
        
          }
      responses: {200: unknown,
422: Schemas.HTTPValidationError,
},
      responseHeaders: {200: { "Cache-Control": string, Connection: string, "X-Accel-Buffering": string },
},
    }
/**
 * Text-only projection of the `/stream` replay: the root agent's assistant text
 * is emitted as plain `content` deltas, while tool-call, sub-agent, thinking, and
 * every other trace event are dropped, so consumers (MCP servers, other AI agents)
 * can render the reply without decoding pydantic-ai trace payloads.
 * 
 * ## Event Types
 * - **content**: Assistant response text. `delta` is a text chunk.
 * - **review_rejected**: Pro-mode reviewer rejected the draft; a fresh draft
 *   streams next. Consumers should discard text accumulated so far.
 * - **clarification_requested / clarification_resolved**: The run paused for /
 *   resumed after human input; see `clarification`.
 * - **resource_updated / citations / done / error**: Same as `/stream`.
 * 
 * Frames are `event: <type>\ndata: <ConversationStreamResponse JSON>\n\n`
 * with a final `data: [DONE]\n\n`. Ping frames use `event: ping` and
 * `data: {}`. The stream is live-tail only: when no run is active it ends
 * immediately; the completed reply is available as the assistant message's
 * `content`.
 */
export type get_Stream_conversation_run_text_api_v1_conversations__conversation_id__stream_text_get = {
      method: "GET",
      path: "/api/v1/conversations/{conversation_id}/stream-text",
      requestFormat: "json",
      parameters: {
            query:  Partial<{
  /**
   * Redis Stream event ID to resume after
   */
  after: (string | null);
}>,
        path:  {conversation_id: string,
},
        
        
          }
      responses: {200: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Request interruption of the in-flight AI run for a conversation. The run is stopped asynchronously — the server aborts the LLM connection — and the interruption surfaces on the SSE stream as a `done` event with `finish_reason=cancelled`. Returns 409 when no run is active for the conversation.
 */
export type post_Interrupt_conversation_run_api_v1_conversations__conversation_id__interruption_post = {
      method: "POST",
      path: "/api/v1/conversations/{conversation_id}/interruption",
      requestFormat: "json",
      parameters: {
            
        path:  {conversation_id: string,
},
        
        
          }
      responses: {202: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Get a specific conversation by ID. Use GET /{conversation_id}/messages to retrieve messages.
 */
export type get_Get_conversation_api_v1_conversations__conversation_id__get = {
      method: "GET",
      path: "/api/v1/conversations/{conversation_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {conversation_id: string,
},
        
        
          }
      responses: {200: Schemas.ConversationSchema,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Update a conversation name or other properties
 */
export type patch_Update_conversation_api_v1_conversations__conversation_id__patch = {
      method: "PATCH",
      path: "/api/v1/conversations/{conversation_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {conversation_id: string,
},
        
        body:  Schemas.ConversationUpdateRequest,
          }
      responses: {200: Schemas.ConversationSchema,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Delete a conversation and all its messages
 */
export type delete_Delete_conversation_api_v1_conversations__conversation_id__delete = {
      method: "DELETE",
      path: "/api/v1/conversations/{conversation_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {conversation_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Send a message to an existing conversation and return an async run receipt.
 */
export type post_Continue_conversation_api_v1_conversations__conversation_id__post = {
      method: "POST",
      path: "/api/v1/conversations/{conversation_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {conversation_id: string,
},
        
        body:  Schemas.ChatRequestSchema,
          }
      responses: {202: Schemas.ConversationRunReceipt,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * List all messages in a conversation with cursor-based pagination
 */
export type get_List_messages_api_v1_conversations__conversation_id__messages_get = {
      method: "GET",
      path: "/api/v1/conversations/{conversation_id}/messages",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_Message_> | null), or: (Array<Schemas.Criteria_Message_> | null), not: (Schemas.Criteria_Message_ | null), cursor: (Schemas.Cursor_Message_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+conversation_id" | "-conversation_id" | "+user_id" | "-user_id" | "+role" | "-role" | "+content" | "-content" | "+enable_kb_search" | "-enable_kb_search" | "+enable_web_search" | "-enable_web_search" | "+reaction" | "-reaction" | "+agent_run_id" | "-agent_run_id" | "+clarification_request_id" | "-clarification_request_id")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), conversation_id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), role: (Schemas.ExactCriteria_Literal__user____assistant___ | null), content: (Schemas.TextCriteria_str_ | null), enable_kb_search: (Schemas.NumericCriteria_bool_ | null), enable_web_search: (Schemas.NumericCriteria_bool_ | null), reaction: (Schemas.ExactCriteria_Literal__like____dislike____neutral___ | null), agent_run_id: (Schemas.NumericCriteria_UUID_ | null), clarification_request_id: (Schemas.NumericCriteria_UUID_ | null) }>,
        path:  {conversation_id: string,
},
        
        
          }
      responses: {200: Schemas.Page_Message_,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Fetch a single message in a conversation owned by the authenticated user. Returns 404 if the message does not exist or is not accessible.
 */
export type get_Get_message_api_v1_conversations__conversation_id__messages__message_id__get = {
      method: "GET",
      path: "/api/v1/conversations/{conversation_id}/messages/{message_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {conversation_id: string,
message_id: string,
},
        
        
          }
      responses: {200: Schemas.Message,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Update a message. Currently only the `reaction` field is supported — send `null` to clear the reaction.
 */
export type patch_Update_message_api_v1_conversations__conversation_id__messages__message_id__patch = {
      method: "PATCH",
      path: "/api/v1/conversations/{conversation_id}/messages/{message_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {conversation_id: string,
message_id: string,
},
        
        body:  Schemas.MessageUpdateRequest,
          }
      responses: {200: Schemas.Message,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Register or update the FCM/APNs token for the caller's current device
 */
export type put_Set_notification_token_api_v1_devices_current_notification_token_put = {
      method: "PUT",
      path: "/api/v1/devices/current/notification-token",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.NotificationTokenUpdate,
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * List the current user's notifications, newest first.
 * 
 * Filter (``?status={"eq":"unread"}``, ``?type={"eq":"system"}``), order
 * (``?order_by=-id``), and paginate (``?limit=&offset=`` or an opaque
 * ``?cursor=``) via the shared ``PagedCriteria``. The unread badge is
 * ``?status={"eq":"unread"}`` → ``total``.
 */
export type get_List_notifications_api_v1_notifications__get = {
      method: "GET",
      path: "/api/v1/notifications/",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_Notification_> | null), or: (Array<Schemas.Criteria_Notification_> | null), not: (Schemas.Criteria_Notification_ | null), cursor: (Schemas.Cursor_Notification_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+user_id" | "-user_id" | "+type" | "-type" | "+title" | "-title" | "+subtitle" | "-subtitle" | "+body" | "-body" | "+status" | "-status" | "+read_at" | "-read_at")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), type: (Schemas.ExactCriteria_Literal__collection_suggestion____content_recommendation____daily_digest____system___ | null), title: (Schemas.TextCriteria_str_ | null), subtitle: (Schemas.TextCriteria_str_ | null), body: (Schemas.TextCriteria_str_ | null), status: (Schemas.ExactCriteria_Literal__unread____read____dismissed___ | null), read_at: (Schemas.NumericCriteria_datetime_ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_Annotated_Union_CollectionSuggestionEnvelope__ContentRecommendationEnvelope__DailyDigestEnvelope__SystemEnvelope___FieldInfo_annotation_NoneType__required_True__discriminator__type____,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Mark a notification as read or dismissed.
 * 
 * This moves only the inbox row's lifecycle (unread/read/dismissed). It does
 * NOT touch the carried content's domain status — accepting a suggestion or
 * saving/opening a recommendation is a separate action against that
 * resource's own API (``PATCH /suggestions/{id}``, ``PUT
 * /recommendations/{id}``). The notification service never writes across that
 * border; the two status axes are independent by design.
 */
export type patch_Update_notification_status_api_v1_notifications__notification_id__patch = {
      method: "PATCH",
      path: "/api/v1/notifications/{notification_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {notification_id: string,
},
        
        body:  Schemas.NotificationStatusUpdate,
          }
      responses: {200: (Schemas.CollectionSuggestionEnvelope | Schemas.ContentRecommendationEnvelope | Schemas.DailyDigestEnvelope | Schemas.SystemEnvelope),
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Perform a hybrid RAG retrieval across the user's notes and return the
 * best-matching notes (duplicate saves of the same content collapse to one
 * result).
 */
export type post_Retrieve_notes_api_v1_retrievals_post = {
      method: "POST",
      path: "/api/v1/retrievals",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.RetrievalRequest,
          }
      responses: {200: Array<Schemas.NoteRetrievalResult>,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Perform a hybrid RAG retrieval and return all ranked chunk results.
 */
export type post_Retrieve_chunks_api_v1_retrievals_chunks_post = {
      method: "POST",
      path: "/api/v1/retrievals/chunks",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.RetrievalRequest,
          }
      responses: {200: Array<Schemas.Chunk>,
422: Schemas.HTTPValidationError,
},
      
    }
export type post_Create_collection_api_v1_collections__post = {
      method: "POST",
      path: "/api/v1/collections/",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.CollectionCreate,
          }
      responses: {201: Schemas.Collection,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_List_collections_api_v1_collections__get = {
      method: "GET",
      path: "/api/v1/collections/",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_Collection_> | null), or: (Array<Schemas.Criteria_Collection_> | null), not: (Schemas.Criteria_Collection_ | null), cursor: (Schemas.Cursor_Collection_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+name" | "-name" | "+description" | "-description" | "+color" | "-color" | "+user_id" | "-user_id" | "+status" | "-status")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), name: (Schemas.TextCriteria_str_ | null), description: (Schemas.TextCriteria_str_ | null), color: (Schemas.ExactCriteria_Literal__neutral____slate____gray____zinc____stone____red____orange____amber____yellow____lime____green____emerald____teal____cyan____sky____blue____indigo____violet____purple____fuchsia____pink____rose___ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), status: (Schemas.ExactCriteria_Literal__active____archived___ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_Collection_,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_Get_collection_api_v1_collections__collection_id__get = {
      method: "GET",
      path: "/api/v1/collections/{collection_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {collection_id: string,
},
        
        
          }
      responses: {200: Schemas.Collection,
422: Schemas.HTTPValidationError,
},
      
    }
export type patch_Update_collection_api_v1_collections__collection_id__patch = {
      method: "PATCH",
      path: "/api/v1/collections/{collection_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {collection_id: string,
},
        
        body:  Schemas.CollectionUpdate,
          }
      responses: {200: Schemas.Collection,
422: Schemas.HTTPValidationError,
},
      
    }
export type delete_Delete_collection_api_v1_collections__collection_id__delete = {
      method: "DELETE",
      path: "/api/v1/collections/{collection_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {collection_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
export type post_Add_collection_note_api_v1_collections__collection_id__notes_post = {
      method: "POST",
      path: "/api/v1/collections/{collection_id}/notes",
      requestFormat: "json",
      parameters: {
            
        path:  {collection_id: string,
},
        
        body:  Schemas.CollectionNoteAppend,
          }
      responses: {200: Schemas.Collection,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_List_collection_notes_api_v1_collections__collection_id__notes_get = {
      method: "GET",
      path: "/api/v1/collections/{collection_id}/notes",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_Note_> | null), or: (Array<Schemas.Criteria_Note_> | null), not: (Schemas.Criteria_Note_ | null), cursor: (Schemas.Cursor_Note_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+status" | "-status" | "+error_message" | "-error_message" | "+last_accessed_at" | "-last_accessed_at" | "+reindex_requested_at" | "-reindex_requested_at" | "+comment" | "-comment" | "+title_override" | "-title_override" | "+description_override" | "-description_override" | "+is_public" | "-is_public" | "+slug" | "-slug" | "+reaction" | "-reaction" | "+user_id" | "-user_id" | "+article_id" | "-article_id" | "+source" | "-source" | "+title" | "-title" | "+description" | "-description")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), status: (Schemas.ExactCriteria_Literal__queued____processing____ready____error___ | null), error_message: (Schemas.TextCriteria_str_ | null), last_accessed_at: (Schemas.NumericCriteria_datetime_ | null), reindex_requested_at: (Schemas.NumericCriteria_datetime_ | null), comment: (Schemas.TextCriteria_str_ | null), title_override: (Schemas.TextCriteria_str_ | null), description_override: (Schemas.TextCriteria_str_ | null), is_public: (Schemas.NumericCriteria_bool_ | null), slug: (Schemas.TextCriteria_str_ | null), reaction: (Schemas.ExactCriteria_Literal__like____dislike____neutral___ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), article_id: (Schemas.NumericCriteria_UUID_ | null), source: (Schemas.TextCriteria_str_ | null), title: (Schemas.TextCriteria_str_ | null), description: (Schemas.TextCriteria_str_ | null) }>,
        path:  {collection_id: string,
},
        
        
          }
      responses: {200: Schemas.Page_Note_,
422: Schemas.HTTPValidationError,
},
      
    }
export type put_Set_collection_notes_api_v1_collections__collection_id__notes_put = {
      method: "PUT",
      path: "/api/v1/collections/{collection_id}/notes",
      requestFormat: "json",
      parameters: {
            
        path:  {collection_id: string,
},
        
        body:  Schemas.CollectionNotesUpdate,
          }
      responses: {200: Schemas.Collection,
422: Schemas.HTTPValidationError,
},
      
    }
export type delete_Remove_collection_note_api_v1_collections__collection_id__notes__note_id__delete = {
      method: "DELETE",
      path: "/api/v1/collections/{collection_id}/notes/{note_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {collection_id: string,
note_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
export type post_Add_collection_artifact_api_v1_collections__collection_id__artifacts_post = {
      method: "POST",
      path: "/api/v1/collections/{collection_id}/artifacts",
      requestFormat: "json",
      parameters: {
            
        path:  {collection_id: string,
},
        
        body:  Schemas.CollectionArtifactAppend,
          }
      responses: {200: Schemas.Collection,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_List_collection_artifacts_api_v1_collections__collection_id__artifacts_get = {
      method: "GET",
      path: "/api/v1/collections/{collection_id}/artifacts",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_Artifact_> | null), or: (Array<Schemas.Criteria_Artifact_> | null), not: (Schemas.Criteria_Artifact_ | null), cursor: (Schemas.Cursor_Artifact_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+user_id" | "-user_id" | "+name" | "-name" | "+description" | "-description" | "+is_public" | "-is_public" | "+slug" | "-slug" | "+reaction" | "-reaction" | "+mimetype" | "-mimetype" | "+size" | "-size")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), name: (Schemas.TextCriteria_str_ | null), description: (Schemas.TextCriteria_str_ | null), is_public: (Schemas.NumericCriteria_bool_ | null), slug: (Schemas.TextCriteria_str_ | null), reaction: (Schemas.ExactCriteria_Literal__like____dislike____neutral___ | null), mimetype: (Schemas.TextCriteria_str_ | null), size: (Schemas.NumericCriteria_int_ | null) }>,
        path:  {collection_id: string,
},
        
        
          }
      responses: {200: Schemas.Page_Artifact_,
422: Schemas.HTTPValidationError,
},
      
    }
export type put_Set_collection_artifacts_api_v1_collections__collection_id__artifacts_put = {
      method: "PUT",
      path: "/api/v1/collections/{collection_id}/artifacts",
      requestFormat: "json",
      parameters: {
            
        path:  {collection_id: string,
},
        
        body:  Schemas.CollectionArtifactsUpdate,
          }
      responses: {200: Schemas.Collection,
422: Schemas.HTTPValidationError,
},
      
    }
export type delete_Remove_collection_artifact_api_v1_collections__collection_id__artifacts__artifact_id__delete = {
      method: "DELETE",
      path: "/api/v1/collections/{collection_id}/artifacts/{artifact_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {collection_id: string,
artifact_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * List notes the classifier suggested for this collection.
 */
export type get_List_suggested_notes_for_collection_api_v1_collections__collection_id__suggested_notes_get = {
      method: "GET",
      path: "/api/v1/collections/{collection_id}/suggested-notes",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_CollectionSuggestion_> | null), or: (Array<Schemas.Criteria_CollectionSuggestion_> | null), not: (Schemas.Criteria_CollectionSuggestion_ | null), cursor: (Schemas.Cursor_CollectionSuggestion_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+note_id" | "-note_id" | "+collection_id" | "-collection_id" | "+user_id" | "-user_id" | "+confidence" | "-confidence" | "+reason" | "-reason" | "+status" | "-status")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), note_id: (Schemas.NumericCriteria_UUID_ | null), collection_id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), confidence: (Schemas.NumericCriteria_float_ | null), reason: (Schemas.TextCriteria_str_ | null), status: (Schemas.ExactCriteria_Literal__pending____accepted____dismissed___ | null) }>,
        path:  {collection_id: string,
},
        
        
          }
      responses: {200: Schemas.Page_CollectionSuggestion_,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Return one page of the caller pinned list ordered by index ascending.
 */
export type get_List_pinned_items_api_v1_pinned__get = {
      method: "GET",
      path: "/api/v1/pinned/",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_PinnedItem_> | null), or: (Array<Schemas.Criteria_PinnedItem_> | null), not: (Schemas.Criteria_PinnedItem_ | null), cursor: (Schemas.Cursor_PinnedItem_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+user_id" | "-user_id" | "+entity_id" | "-entity_id" | "+type" | "-type" | "+index" | "-index")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), entity_id: (Schemas.NumericCriteria_UUID_ | null), type: (Schemas.ExactCriteria_Literal__note____collection____artifact___ | null), index: (Schemas.NumericCriteria_int_ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_PinnedItemEnvelope_,
422: Schemas.HTTPValidationError,
},
      
    }
export type post_Pin_item_api_v1_pinned__post = {
      method: "POST",
      path: "/api/v1/pinned/",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.PinItemRequest,
          }
      responses: {201: Schemas.PinnedItemEnvelope,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Replace the pinned-list ordering with the supplied sequence.
 * 
 * The body must list every currently-pinned item exactly once. Indices
 * are rewritten to ``0..N-1`` from the request order.
 */
export type put_Reorder_pinned_items_api_v1_pinned__put = {
      method: "PUT",
      path: "/api/v1/pinned/",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.PinnedItemsReorder,
          }
      responses: {200: Schemas.Page_PinnedItemEnvelope_,
422: Schemas.HTTPValidationError,
},
      
    }
export type delete_Unpin_item_api_v1_pinned__entity_id__delete = {
      method: "DELETE",
      path: "/api/v1/pinned/{entity_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {entity_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * List the user's collection suggestions across all notes.
 */
export type get_List_suggestions_api_v1_suggestions__get = {
      method: "GET",
      path: "/api/v1/suggestions/",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_CollectionSuggestion_> | null), or: (Array<Schemas.Criteria_CollectionSuggestion_> | null), not: (Schemas.Criteria_CollectionSuggestion_ | null), cursor: (Schemas.Cursor_CollectionSuggestion_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+note_id" | "-note_id" | "+collection_id" | "-collection_id" | "+user_id" | "-user_id" | "+confidence" | "-confidence" | "+reason" | "-reason" | "+status" | "-status")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), note_id: (Schemas.NumericCriteria_UUID_ | null), collection_id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), confidence: (Schemas.NumericCriteria_float_ | null), reason: (Schemas.TextCriteria_str_ | null), status: (Schemas.ExactCriteria_Literal__pending____accepted____dismissed___ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_CollectionSuggestion_,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Accept many suggestions in one call, linking their notes to collections.
 * 
 * Reported per id, and a failing id never aborts the rest: an unknown id
 * gets a not-found ``error``, re-accepting an already-accepted suggestion
 * succeeds idempotently, and a dismissed one gets a status-conflict
 * ``error``.
 */
export type post_Accept_suggestions_api_v1_suggestions_acceptances_post = {
      method: "POST",
      path: "/api/v1/suggestions/acceptances",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Array<string>,
          }
      responses: {200: Record<string, Schemas.SuggestionBatchResult>,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Dismiss many suggestions in one call.
 * 
 * Reported per id, and a failing id never aborts the rest: an unknown id
 * gets a not-found ``error``, re-dismissing an already-dismissed suggestion
 * succeeds idempotently, and an accepted one gets a status-conflict
 * ``error``.
 */
export type post_Dismiss_suggestions_api_v1_suggestions_dismissals_post = {
      method: "POST",
      path: "/api/v1/suggestions/dismissals",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Array<string>,
          }
      responses: {200: Record<string, Schemas.SuggestionBatchResult>,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Update a suggestion's status to ``accepted`` or ``dismissed``.
 * 
 * This resource owns the suggestion's domain status. When a suggestion reaches
 * the user through the notification center, accepting/dismissing it from the
 * inbox calls this endpoint directly — the notification service only owns the
 * inbox row's read state, never this status.
 * 
 * Idempotent — calling on an already-accepted/dismissed suggestion returns
 * the current row without raising.  When transitioning to ``accepted``, the
 * note is also linked to the collection (ON CONFLICT DO NOTHING).
 */
export type patch_Update_suggestion_api_v1_suggestions__suggestion_id__patch = {
      method: "PATCH",
      path: "/api/v1/suggestions/{suggestion_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {suggestion_id: string,
},
        
        body:  Schemas.SuggestionUpdate,
          }
      responses: {200: Schemas.CollectionSuggestion,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_List_recommendations_api_v1_recommendations__get = {
      method: "GET",
      path: "/api/v1/recommendations/",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ and: (Array<Schemas.Criteria_Recommendation_> | null), or: (Array<Schemas.Criteria_Recommendation_> | null), not: (Schemas.Criteria_Recommendation_ | null), cursor: (Schemas.Cursor_Recommendation_ | null), limit: (number | null), offset: (number | null), order_by: (Array<("+created_at" | "-created_at" | "+created_by" | "-created_by" | "+updated_at" | "-updated_at" | "+updated_by" | "-updated_by" | "+id" | "-id" | "+user_id" | "-user_id" | "+collection_id" | "-collection_id" | "+url" | "-url" | "+title" | "-title" | "+snippet" | "-snippet" | "+site_name" | "-site_name" | "+search_query" | "-search_query" | "+status" | "-status" | "+note_id" | "-note_id")> | null), created_at: (Schemas.NumericCriteria_datetime_ | null), created_by: (Schemas.TextCriteria_str_ | null), updated_at: (Schemas.NumericCriteria_datetime_ | null), updated_by: (Schemas.TextCriteria_str_ | null), id: (Schemas.NumericCriteria_UUID_ | null), user_id: (Schemas.NumericCriteria_UUID_ | null), collection_id: (Schemas.NumericCriteria_UUID_ | null), url: (Schemas.TextCriteria_str_ | null), title: (Schemas.TextCriteria_str_ | null), snippet: (Schemas.TextCriteria_str_ | null), site_name: (Schemas.TextCriteria_str_ | null), search_query: (Schemas.TextCriteria_str_ | null), status: (Schemas.ExactCriteria_Literal__active____dismissed____saved____not_interested___ | null), note_id: (Schemas.NumericCriteria_UUID_ | null) }>,
        
        
        
          }
      responses: {200: Schemas.Page_Recommendation_,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Apply a user action (save / dismiss / not_interested) to a recommendation.
 * 
 * This resource owns the recommendation's domain status. When a recommendation
 * reaches the user through the notification center, acting on it from the
 * inbox calls this endpoint directly — the notification service only owns the
 * inbox row's read state, never this status.
 */
export type put_Update_recommendation_api_v1_recommendations__recommendation_id__put = {
      method: "PUT",
      path: "/api/v1/recommendations/{recommendation_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {recommendation_id: string,
},
        
        body:  Schemas.RecommendationAction,
          }
      responses: {200: Schemas.Recommendation,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Start an OAuth authorize flow for ``provider`` on behalf of the current user.
 */
export type post_Begin_authorization_api_v1_external_connections__provider__authorization_post = {
      method: "POST",
      path: "/api/v1/external-connections/{provider}/authorization",
      requestFormat: "json",
      parameters: {
            
        path:  {provider: string,
},
        
        body:  Schemas.BeginConnectRequest,
          }
      responses: {201: Schemas.BeginConnectResponse,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_List_connections_api_v1_external_connections_get = {
      method: "GET",
      path: "/api/v1/external-connections",
      requestFormat: "json",
      parameters: {
            
        
        
        
          }
      responses: {200: Array<Schemas.ConnectionSummary>,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Redeem the callback's completion token into a durable connection.
 * 
 * The second half of the connect handshake. The callback is unauthenticated by
 * necessity, so it only stages credentials; this endpoint is where the caller
 * proves who they are, and the token is only honoured for the user who started
 * the flow. See ``ExternalConnectionService.complete_connect``.
 */
export type post_Claim_connection_api_v1_external_connections_post = {
      method: "POST",
      path: "/api/v1/external-connections",
      requestFormat: "json",
      parameters: {
            
        
        
        body:  Schemas.ClaimConnectionRequest,
          }
      responses: {201: Schemas.ConnectionSummary,
422: Schemas.HTTPValidationError,
},
      
    }
export type delete_Disconnect_api_v1_external_connections__connection_id__delete = {
      method: "DELETE",
      path: "/api/v1/external-connections/{connection_id}",
      requestFormat: "json",
      parameters: {
            
        path:  {connection_id: string,
},
        
        
          }
      responses: {204: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
/**
 * Provider redirect target. Exchanges the code and stages the credentials.
 * 
 * Grants nothing. Success here means a ``pending_external_connections`` row
 * exists and its one-time ``completion_token`` has been handed to the browser;
 * the connection itself is created only when the authenticated owner redeems
 * that token at ``POST /external-connections``. Callers must not treat a 302
 * or a bridge page as a completed connect.
 * 
 * Public — the redirected browser has no app session to present, least of all
 * on mobile. The staged row is owned by the user named on the ``state`` row,
 * which is unguessable, single-use, and short-lived, but that ownership alone
 * is not what authorises the connection; see the module docstring for why the
 * second, authenticated step is the security boundary.
 * 
 * The path ``{provider}`` is cross-checked against the provider bound to the
 * state row *before* the state is consumed or the code exchanged — so a client
 * invoking ``/callbacks/foo?state=<bar-state>`` cannot burn the state.
 * 
 * Failures navigate home the same way successes do, when the state names a
 * destination. The HTML bridge only helps a popup, which a native app does not
 * have: ``ASWebAuthenticationSession`` and Custom Tabs give the page no
 * ``window.opener``, so a denied consent would otherwise leave the auth browser
 * parked on this endpoint with the app still waiting.
 */
export type get_Oauth_callback_api_v1_callbacks__provider__get = {
      method: "GET",
      path: "/api/v1/callbacks/{provider}",
      requestFormat: "json",
      parameters: {
            query:  {state: string,
code?: (string | null) | undefined,
error?: (string | null) | undefined,
},
        path:  {provider: string,
},
        
        
          }
      responses: {200: unknown,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_List_twitter_bookmarks_api_v1_twitter_bookmarks_get = {
      method: "GET",
      path: "/api/v1/twitter/bookmarks",
      requestFormat: "json",
      parameters: {
            query:  Partial<{ limit: number, cursor: (string | null), connection_id: (string | null) }>,
        
        
        
          }
      responses: {200: Schemas.TwitterBookmarkPage,
422: Schemas.HTTPValidationError,
},
      
    }
export type get_Health_health_get = {
      method: "GET",
      path: "/health",
      requestFormat: "json",
      parameters: never,
      responses: {200: unknown,
},
      
    }

  // </Endpoints>
  }
  
  
  
     // <EndpointByMethod>
     export type EndpointByMethod = {
     get: {
           "/metrics": Endpoints.get_Metrics_metrics_get,
"/api/v1/artifacts/": Endpoints.get_List_artifacts_api_v1_artifacts__get,
"/api/v1/artifacts/by-slug/{slug}": Endpoints.get_Get_artifact_by_slug_api_v1_artifacts_by_slug__slug__get,
"/api/v1/artifacts/{artifact_id}": Endpoints.get_Get_artifact_api_v1_artifacts__artifact_id__get,
"/api/v1/artifacts/{artifact_id}/content": Endpoints.get_Get_artifact_content_api_v1_artifacts__artifact_id__content_get,
"/api/v1/me/billing/credits": Endpoints.get_Get_credits_api_v1_me_billing_credits_get,
"/api/v1/me/billing/subscription": Endpoints.get_Get_my_subscription_api_v1_me_billing_subscription_get,
"/api/v1/me/billing/checkout-session/{session_id}": Endpoints.get_Get_checkout_session_api_v1_me_billing_checkout_session__session_id__get,
"/api/v1/plans/{provider}": Endpoints.get_List_plans_api_v1_plans__provider__get,
"/api/v1/notes/by-slug/{slug}": Endpoints.get_Get_note_by_slug_api_v1_notes_by_slug__slug__get,
"/api/v1/notes/{note_id}": Endpoints.get_Get_note_api_v1_notes__note_id__get,
"/api/v1/notes/": Endpoints.get_List_notes_api_v1_notes__get,
"/api/v1/notes/{note_id}/files/{file_id}": Endpoints.get_Get_note_file_metadata_api_v1_notes__note_id__files__file_id__get,
"/api/v1/notes/{note_id}/content": Endpoints.get_Get_note_content_api_v1_notes__note_id__content_get,
"/api/v1/notes/{note_id}/files/{file_id}/revisions": Endpoints.get_List_note_content_file_revisions_api_v1_notes__note_id__files__file_id__revisions_get,
"/api/v1/notes/{note_id}/suggested-collections": Endpoints.get_List_suggested_collections_for_note_api_v1_notes__note_id__suggested_collections_get,
"/api/v1/tags/": Endpoints.get_List_tags_api_v1_tags__get,
"/api/v1/files/{file_id}": Endpoints.get_Get_file_metadata_api_v1_files__file_id__get,
"/api/v1/session": Endpoints.get_Get_current_session_api_v1_session_get,
"/api/v1/sessions": Endpoints.get_List_sessions_api_v1_sessions_get,
"/api/v1/web-session": Endpoints.get_Get_current_web_session_api_v1_web_session_get,
"/api/v1/users/me": Endpoints.get_Get_current_user_api_v1_users_me_get,
"/api/v1/users/me/feature_flags": Endpoints.get_Get_user_feature_flags_api_v1_users_me_feature_flags_get,
"/api/v1/users/me/api-keys": Endpoints.get_List_api_keys_api_v1_users_me_api_keys_get,
"/api/v1/users/me/demographic": Endpoints.get_Get_demographic_api_v1_users_me_demographic_get,
"/api/v1/users/me/preferences": Endpoints.get_Get_preferences_api_v1_users_me_preferences_get,
"/api/v1/conversations": Endpoints.get_List_conversations_api_v1_conversations_get,
"/api/v1/conversations/{conversation_id}/stream": Endpoints.get_Stream_conversation_run_api_v1_conversations__conversation_id__stream_get,
"/api/v1/conversations/{conversation_id}/stream-text": Endpoints.get_Stream_conversation_run_text_api_v1_conversations__conversation_id__stream_text_get,
"/api/v1/conversations/{conversation_id}": Endpoints.get_Get_conversation_api_v1_conversations__conversation_id__get,
"/api/v1/conversations/{conversation_id}/messages": Endpoints.get_List_messages_api_v1_conversations__conversation_id__messages_get,
"/api/v1/conversations/{conversation_id}/messages/{message_id}": Endpoints.get_Get_message_api_v1_conversations__conversation_id__messages__message_id__get,
"/api/v1/notifications/": Endpoints.get_List_notifications_api_v1_notifications__get,
"/api/v1/collections/": Endpoints.get_List_collections_api_v1_collections__get,
"/api/v1/collections/{collection_id}": Endpoints.get_Get_collection_api_v1_collections__collection_id__get,
"/api/v1/collections/{collection_id}/notes": Endpoints.get_List_collection_notes_api_v1_collections__collection_id__notes_get,
"/api/v1/collections/{collection_id}/artifacts": Endpoints.get_List_collection_artifacts_api_v1_collections__collection_id__artifacts_get,
"/api/v1/collections/{collection_id}/suggested-notes": Endpoints.get_List_suggested_notes_for_collection_api_v1_collections__collection_id__suggested_notes_get,
"/api/v1/pinned/": Endpoints.get_List_pinned_items_api_v1_pinned__get,
"/api/v1/suggestions/": Endpoints.get_List_suggestions_api_v1_suggestions__get,
"/api/v1/recommendations/": Endpoints.get_List_recommendations_api_v1_recommendations__get,
"/api/v1/external-connections": Endpoints.get_List_connections_api_v1_external_connections_get,
"/api/v1/callbacks/{provider}": Endpoints.get_Oauth_callback_api_v1_callbacks__provider__get,
"/api/v1/twitter/bookmarks": Endpoints.get_List_twitter_bookmarks_api_v1_twitter_bookmarks_get,
"/health": Endpoints.get_Health_health_get
         },
post: {
           "/api/v1/artifacts/": Endpoints.post_Create_artifact_api_v1_artifacts__post,
"/api/v1/artifacts/{artifact_id}/content/presigned-urls": Endpoints.post_Create_artifact_content_presigned_download_url_api_v1_artifacts__artifact_id__content_presigned_urls_post,
"/api/v1/artifacts/{artifact_id}/display/presigned-urls": Endpoints.post_Create_artifact_display_presigned_download_url_api_v1_artifacts__artifact_id__display_presigned_urls_post,
"/api/v1/artifacts/{artifact_id}/thumbnail/presigned-urls": Endpoints.post_Create_artifact_thumbnail_presigned_download_url_api_v1_artifacts__artifact_id__thumbnail_presigned_urls_post,
"/api/v1/me/billing/discount-codes/redeem": Endpoints.post_Redeem_discount_code_api_v1_me_billing_discount_codes_redeem_post,
"/api/v1/me/billing/checkout-session": Endpoints.post_Create_checkout_session_api_v1_me_billing_checkout_session_post,
"/api/v1/me/billing/plan": Endpoints.post_Change_plan_api_v1_me_billing_plan_post,
"/api/v1/me/billing/stripe/portal-session": Endpoints.post_Create_portal_session_api_v1_me_billing_stripe_portal_session_post,
"/api/v1/me/billing/purchases": Endpoints.post_Create_purchase_api_v1_me_billing_purchases_post,
"/api/v1/notes/conversations": Endpoints.post_Create_note_from_conversation_api_v1_notes_conversations_post,
"/api/v1/notes/messages": Endpoints.post_Create_note_from_message_api_v1_notes_messages_post,
"/api/v1/notes/files": Endpoints.post_Create_note_from_file_api_v1_notes_files_post,
"/api/v1/notes/artifacts": Endpoints.post_Create_note_from_artifact_api_v1_notes_artifacts_post,
"/api/v1/notes/text": Endpoints.post_Create_note_from_text_api_v1_notes_text_post,
"/api/v1/notes/url": Endpoints.post_Create_note_from_url_api_v1_notes_url_post,
"/api/v1/notes/{note_id}/retry": Endpoints.post_Retry_note_api_v1_notes__note_id__retry_post,
"/api/v1/notes/{note_id}/copy": Endpoints.post_Copy_note_api_v1_notes__note_id__copy_post,
"/api/v1/notes/{note_id}/display/presigned-urls": Endpoints.post_Create_note_display_presigned_download_url_api_v1_notes__note_id__display_presigned_urls_post,
"/api/v1/notes/{note_id}/files/{file_id}/content/presigned-urls": Endpoints.post_Create_note_file_content_presigned_download_url_api_v1_notes__note_id__files__file_id__content_presigned_urls_post,
"/api/v1/notes/{note_id}/files/{file_id}/revisions/{revision_id}/revert": Endpoints.post_Revert_note_content_file_revision_api_v1_notes__note_id__files__file_id__revisions__revision_id__revert_post,
"/api/v1/tags/": Endpoints.post_Create_tag_api_v1_tags__post,
"/api/v1/files/": Endpoints.post_Create_file_api_v1_files__post,
"/api/v1/files/batch": Endpoints.post_Create_files_batch_api_v1_files_batch_post,
"/api/v1/files/{file_id}/content/presigned-urls": Endpoints.post_Create_presigned_download_url_api_v1_files__file_id__content_presigned_urls_post,
"/api/v1/files/presigned-urls": Endpoints.post_Create_presigned_upload_url_api_v1_files_presigned_urls_post,
"/api/v1/files/completions": Endpoints.post_Complete_upload_api_v1_files_completions_post,
"/api/v1/files/{file_id}/verifications": Endpoints.post_Create_file_verification_api_v1_files__file_id__verifications_post,
"/api/v1/image-prompts/": Endpoints.post_Create_image_prompt_api_v1_image_prompts__post,
"/api/v1/text-selections/explanations": Endpoints.post_Create_explanation_api_v1_text_selections_explanations_post,
"/api/v1/text-selections/summaries": Endpoints.post_Create_summary_api_v1_text_selections_summaries_post,
"/api/v1/text-selections/translations": Endpoints.post_Create_translation_api_v1_text_selections_translations_post,
"/api/v1/session": Endpoints.post_Create_session_api_v1_session_post,
"/api/v1/session/{provider}": Endpoints.post_Login_with_oauth_api_v1_session__provider__post,
"/api/v1/web-session": Endpoints.post_Create_web_session_api_v1_web_session_post,
"/api/v1/web-session/{provider}": Endpoints.post_Login_with_oauth_web_api_v1_web_session__provider__post,
"/api/v1/web-verification": Endpoints.post_Verify_email_and_create_web_session_api_v1_web_verification_post,
"/api/v1/users": Endpoints.post_Create_user_api_v1_users_post,
"/api/v1/users/verification-requests": Endpoints.post_Resend_verification_api_v1_users_verification_requests_post,
"/api/v1/users/password-reset-requests": Endpoints.post_Create_password_reset_request_api_v1_users_password_reset_requests_post,
"/api/v1/users/password-reset-tokens": Endpoints.post_Create_password_reset_token_api_v1_users_password_reset_tokens_post,
"/api/v1/users/me/activation-code": Endpoints.post_Submit_activation_code_api_v1_users_me_activation_code_post,
"/api/v1/users/me/api-keys": Endpoints.post_Create_api_key_api_v1_users_me_api_keys_post,
"/api/v1/conversations": Endpoints.post_Create_conversation_and_chat_api_v1_conversations_post,
"/api/v1/conversations/{conversation_id}/interruption": Endpoints.post_Interrupt_conversation_run_api_v1_conversations__conversation_id__interruption_post,
"/api/v1/conversations/{conversation_id}": Endpoints.post_Continue_conversation_api_v1_conversations__conversation_id__post,
"/api/v1/retrievals": Endpoints.post_Retrieve_notes_api_v1_retrievals_post,
"/api/v1/retrievals/chunks": Endpoints.post_Retrieve_chunks_api_v1_retrievals_chunks_post,
"/api/v1/collections/": Endpoints.post_Create_collection_api_v1_collections__post,
"/api/v1/collections/{collection_id}/notes": Endpoints.post_Add_collection_note_api_v1_collections__collection_id__notes_post,
"/api/v1/collections/{collection_id}/artifacts": Endpoints.post_Add_collection_artifact_api_v1_collections__collection_id__artifacts_post,
"/api/v1/pinned/": Endpoints.post_Pin_item_api_v1_pinned__post,
"/api/v1/suggestions/acceptances": Endpoints.post_Accept_suggestions_api_v1_suggestions_acceptances_post,
"/api/v1/suggestions/dismissals": Endpoints.post_Dismiss_suggestions_api_v1_suggestions_dismissals_post,
"/api/v1/external-connections/{provider}/authorization": Endpoints.post_Begin_authorization_api_v1_external_connections__provider__authorization_post,
"/api/v1/external-connections": Endpoints.post_Claim_connection_api_v1_external_connections_post
         },
patch: {
           "/api/v1/artifacts/{artifact_id}": Endpoints.patch_Update_artifact_api_v1_artifacts__artifact_id__patch,
"/api/v1/notes/{note_id}": Endpoints.patch_Update_note_api_v1_notes__note_id__patch,
"/api/v1/tags/{tag_id}": Endpoints.patch_Update_tag_api_v1_tags__tag_id__patch,
"/api/v1/conversations/{conversation_id}": Endpoints.patch_Update_conversation_api_v1_conversations__conversation_id__patch,
"/api/v1/conversations/{conversation_id}/messages/{message_id}": Endpoints.patch_Update_message_api_v1_conversations__conversation_id__messages__message_id__patch,
"/api/v1/notifications/{notification_id}": Endpoints.patch_Update_notification_status_api_v1_notifications__notification_id__patch,
"/api/v1/collections/{collection_id}": Endpoints.patch_Update_collection_api_v1_collections__collection_id__patch,
"/api/v1/suggestions/{suggestion_id}": Endpoints.patch_Update_suggestion_api_v1_suggestions__suggestion_id__patch
         },
delete: {
           "/api/v1/artifacts/{artifact_id}": Endpoints.delete_Delete_artifact_api_v1_artifacts__artifact_id__delete,
"/api/v1/notes/{note_id}": Endpoints.delete_Delete_note_api_v1_notes__note_id__delete,
"/api/v1/tags/{tag_id}": Endpoints.delete_Delete_tag_api_v1_tags__tag_id__delete,
"/api/v1/files/{file_id}": Endpoints.delete_Delete_file_api_v1_files__file_id__delete,
"/api/v1/session": Endpoints.delete_Delete_session_api_v1_session_delete,
"/api/v1/sessions": Endpoints.delete_Delete_all_sessions_api_v1_sessions_delete,
"/api/v1/sessions/{session_id}": Endpoints.delete_Delete_specific_session_api_v1_sessions__session_id__delete,
"/api/v1/web-session": Endpoints.delete_Delete_web_session_api_v1_web_session_delete,
"/api/v1/users/me": Endpoints.delete_Delete_current_user_api_v1_users_me_delete,
"/api/v1/users/me/api-keys/{api_key_id}": Endpoints.delete_Revoke_api_key_api_v1_users_me_api_keys__api_key_id__delete,
"/api/v1/conversations/{conversation_id}": Endpoints.delete_Delete_conversation_api_v1_conversations__conversation_id__delete,
"/api/v1/collections/{collection_id}": Endpoints.delete_Delete_collection_api_v1_collections__collection_id__delete,
"/api/v1/collections/{collection_id}/notes/{note_id}": Endpoints.delete_Remove_collection_note_api_v1_collections__collection_id__notes__note_id__delete,
"/api/v1/collections/{collection_id}/artifacts/{artifact_id}": Endpoints.delete_Remove_collection_artifact_api_v1_collections__collection_id__artifacts__artifact_id__delete,
"/api/v1/pinned/{entity_id}": Endpoints.delete_Unpin_item_api_v1_pinned__entity_id__delete,
"/api/v1/external-connections/{connection_id}": Endpoints.delete_Disconnect_api_v1_external_connections__connection_id__delete
         },
put: {
           "/api/v1/artifacts/{artifact_id}/content": Endpoints.put_Update_artifact_content_api_v1_artifacts__artifact_id__content_put,
"/api/v1/notes/{note_id}/files/{file_id}/content": Endpoints.put_Update_note_content_file_api_v1_notes__note_id__files__file_id__content_put,
"/api/v1/notes/{note_id}/tags": Endpoints.put_Set_note_tags_api_v1_notes__note_id__tags_put,
"/api/v1/session": Endpoints.put_Refresh_session_api_v1_session_put,
"/api/v1/web-session": Endpoints.put_Refresh_web_session_api_v1_web_session_put,
"/api/v1/users/verification": Endpoints.put_Confirm_verification_api_v1_users_verification_put,
"/api/v1/users/password": Endpoints.put_Reset_password_api_v1_users_password_put,
"/api/v1/users/me/password": Endpoints.put_Change_password_api_v1_users_me_password_put,
"/api/v1/users/me": Endpoints.put_Update_current_user_api_v1_users_me_put,
"/api/v1/users/me/invitation-code": Endpoints.put_Regenerate_invitation_code_api_v1_users_me_invitation_code_put,
"/api/v1/users/me/demographic": Endpoints.put_Update_demographic_api_v1_users_me_demographic_put,
"/api/v1/users/me/preferences": Endpoints.put_Update_preferences_api_v1_users_me_preferences_put,
"/api/v1/devices/current/notification-token": Endpoints.put_Set_notification_token_api_v1_devices_current_notification_token_put,
"/api/v1/collections/{collection_id}/notes": Endpoints.put_Set_collection_notes_api_v1_collections__collection_id__notes_put,
"/api/v1/collections/{collection_id}/artifacts": Endpoints.put_Set_collection_artifacts_api_v1_collections__collection_id__artifacts_put,
"/api/v1/pinned/": Endpoints.put_Reorder_pinned_items_api_v1_pinned__put,
"/api/v1/recommendations/{recommendation_id}": Endpoints.put_Update_recommendation_api_v1_recommendations__recommendation_id__put
         }
     }
     
     // </EndpointByMethod>
     

    // <EndpointByMethod.Shorthands>
    export type GetEndpoints = EndpointByMethod["get"]
export type PostEndpoints = EndpointByMethod["post"]
export type PatchEndpoints = EndpointByMethod["patch"]
export type DeleteEndpoints = EndpointByMethod["delete"]
export type PutEndpoints = EndpointByMethod["put"]
    // </EndpointByMethod.Shorthands>
    
  
// <ApiClientTypes>
export type EndpointParameters = {
  body?: unknown;
  query?: Record<string, unknown>;
  header?: Record<string, unknown>;
  path?: Record<string, unknown>;
};

export type MutationMethod = "post" | "put" | "patch" | "delete";
export type Method = "get" | "head" | "options" | MutationMethod;

type RequestFormat = "json" | "form-data" | "form-url" | "binary" | "text";

export type DefaultEndpoint = {
  parameters?: EndpointParameters | undefined;
  responses?: Record<string, unknown>;
  responseHeaders?: Record<string, unknown>;
};

export type Endpoint<TConfig extends DefaultEndpoint = DefaultEndpoint> = {
  operationId: string;
  method: Method;
  path: string;
  requestFormat: RequestFormat;
  parameters?: TConfig["parameters"];
  meta: {
    alias: string;
    hasParameters: boolean;
    areParametersRequired: boolean;
  };
  responses?: TConfig["responses"];
  responseHeaders?: TConfig["responseHeaders"]
};

export interface Fetcher {
    decodePathParams?: (path: string, pathParams: Record<string, string>) => string
  encodeSearchParams?: (searchParams: Record<string, unknown> | undefined) => URLSearchParams
    //
    fetch: (input: {
      method: Method;
      url: URL;
      urlSearchParams?: URLSearchParams | undefined;
      parameters?: EndpointParameters | undefined;
      path: string;
      overrides?: RequestInit;
      throwOnStatusError?: boolean
    }) => Promise<Response>;
    parseResponseData?: (response: Response) => Promise<unknown>
}

export const successStatusCodes = [200,201,202,203,204,205,206,207,208,226,300,301,302,303,304,305,306,307,308] as const;
export type SuccessStatusCode = typeof successStatusCodes[number];

export const errorStatusCodes = [400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,421,422,423,424,425,426,428,429,431,451,500,501,502,503,504,505,506,507,508,510,511] as const;
export type ErrorStatusCode = typeof errorStatusCodes[number];

// Taken from https://github.com/unjs/fetchdts/blob/ec4eaeab5d287116171fc1efd61f4a1ad34e4609/src/fetch.ts#L3
export interface TypedHeaders<TypedHeaderValues extends Record<string, string> | unknown> extends Omit<Headers, 'append' | 'delete' | 'get' | 'getSetCookie' | 'has' | 'set' | 'forEach'> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/append) */
  append: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name, value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/delete) */
  delete: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name) => void
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/get) */
  get: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name) => (Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) | null
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/getSetCookie) */
  getSetCookie: () => string[]
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/has) */
  has: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name) => boolean
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Headers/set) */
  set: <Name extends Extract<keyof TypedHeaderValues, string> | string & {}> (name: Name, value: Lowercase<Name> extends keyof TypedHeaderValues ? TypedHeaderValues[Lowercase<Name>] : string) => void
  forEach: (callbackfn: (value: TypedHeaderValues[keyof TypedHeaderValues] | string & {}, key: Extract<keyof TypedHeaderValues, string> | string & {}, parent: TypedHeaders<TypedHeaderValues>) => void, thisArg?: any) => void
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/Response */
export interface TypedSuccessResponse<TSuccess, TStatusCode, THeaders> extends Omit<Response, "ok" | "status" | "json" | "headers"> {
  ok: true;
  status: TStatusCode;
  headers: never extends THeaders ? Headers :  TypedHeaders<THeaders>;
  data: TSuccess;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) */
  json: () => Promise<TSuccess>;
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/Response */
export interface TypedErrorResponse<TData, TStatusCode, THeaders> extends Omit<Response, "ok" | "status" | "json" | "headers"> {
  ok: false;
  status: TStatusCode;
  headers: never extends THeaders ? Headers :  TypedHeaders<THeaders>;
  data: TData;
  /** [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Response/json) */
  json: () => Promise<TData>;
}

export type TypedApiResponse<TAllResponses extends Record<string | number, unknown> = {}, THeaders = {}> =
  ({
    [K in keyof TAllResponses]: K extends string
      ? K extends `${infer TStatusCode extends number}`
        ? TStatusCode extends SuccessStatusCode
          ? TypedSuccessResponse<TAllResponses[K], TStatusCode, K extends keyof THeaders ? THeaders[K] : never>
          : TypedErrorResponse<TAllResponses[K], TStatusCode, K extends keyof THeaders ? THeaders[K] : never>
        : never
      : K extends number
        ? K extends SuccessStatusCode
          ? TypedSuccessResponse<TAllResponses[K], K, K extends keyof THeaders ? THeaders[K] : never>
          : TypedErrorResponse<TAllResponses[K], K, K extends keyof THeaders ? THeaders[K] : never>
        : never;
  }[keyof TAllResponses]);

export type SafeApiResponse<TEndpoint> = TEndpoint extends { responses: infer TResponses }
  ? TResponses extends Record<string, unknown>
    ? TypedApiResponse<TResponses, TEndpoint extends { responseHeaders: infer THeaders } ? THeaders : never>
    : never
  : never

export type InferResponseByStatus<TEndpoint, TStatusCode> = Extract<SafeApiResponse<TEndpoint>, { status: TStatusCode }>

type RequiredKeys<T> = {
  [P in keyof T]-?: undefined extends T[P] ? never : P;
}[keyof T];

type MaybeOptionalArg<T> = RequiredKeys<T> extends never ? [config?: T] : [config: T];
type NotNever<T> = [T] extends [never] ? false : true;

// </ApiClientTypes>

// <TypedStatusError>
export class TypedStatusError<TData = unknown> extends Error {
  response: TypedErrorResponse<TData, ErrorStatusCode, unknown>;
  status: number;
  constructor(response: TypedErrorResponse<TData, ErrorStatusCode, unknown>) {
    super(`HTTP ${response.status}: ${response.statusText}`);
    this.name = 'TypedStatusError';
    this.response = response;
    this.status = response.status;
  }
}
// </TypedStatusError>

// <ApiClient>
export class ApiClient {
  baseUrl: string = "";
  successStatusCodes = successStatusCodes;
  errorStatusCodes = errorStatusCodes;

  constructor(public fetcher: Fetcher) {}

  setBaseUrl(baseUrl: string) {
    this.baseUrl = baseUrl;
    return this;
  }

  /**
   * Replace path parameters in URL
   * Supports both OpenAPI format {param} and Express format :param
   */
  defaultDecodePathParams = (url: string, params: Record<string, string>): string => {
    return url
      .replace(/{(\w+)}/g, (_, key: string) => params[key] || `{${key}}`)
      .replace(/:([a-zA-Z0-9_]+)/g, (_, key: string) => params[key] || `:${key}`);
  }

  /** Uses URLSearchParams, skips null/undefined values */
  defaultEncodeSearchParams = (queryParams: Record<string, unknown> | undefined): URLSearchParams | undefined => {
    if (!queryParams) return;

    const searchParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value != null) {
        // Skip null/undefined values
        if (Array.isArray(value)) {
          value.forEach((val) => val != null && searchParams.append(key, String(val)));
        } else {
          searchParams.append(key, String(value));
        }
      }
    });

    return searchParams;
  }

  defaultParseResponseData = async (response: Response): Promise<unknown> => {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.startsWith("text/")) {
      return (await response.text())
    }

    if (contentType === "application/octet-stream") {
      return (await response.arrayBuffer())
    }

    if (
      contentType.includes("application/json") ||
      (contentType.includes("application/") && contentType.includes("json")) ||
      contentType === "*/*"
      ) {
      try {
        return await response.json();
      } catch {
        return undefined
      }
    }

    return
  }

  // <ApiClient.get>
    get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean })
      >
    ): Promise<Extract<InferResponseByStatus<TEndpoint, SuccessStatusCode>, { data: {} }>["data"]>;

    get<Path extends keyof GetEndpoints, TEndpoint extends GetEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    get<Path extends keyof GetEndpoints, _TEndpoint extends GetEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("get", path, ...params);
    }
    // </ApiClient.get>
    
// <ApiClient.post>
    post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean })
      >
    ): Promise<Extract<InferResponseByStatus<TEndpoint, SuccessStatusCode>, { data: {} }>["data"]>;

    post<Path extends keyof PostEndpoints, TEndpoint extends PostEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    post<Path extends keyof PostEndpoints, _TEndpoint extends PostEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("post", path, ...params);
    }
    // </ApiClient.post>
    
// <ApiClient.patch>
    patch<Path extends keyof PatchEndpoints, TEndpoint extends PatchEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean })
      >
    ): Promise<Extract<InferResponseByStatus<TEndpoint, SuccessStatusCode>, { data: {} }>["data"]>;

    patch<Path extends keyof PatchEndpoints, TEndpoint extends PatchEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    patch<Path extends keyof PatchEndpoints, _TEndpoint extends PatchEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("patch", path, ...params);
    }
    // </ApiClient.patch>
    
// <ApiClient.delete>
    delete<Path extends keyof DeleteEndpoints, TEndpoint extends DeleteEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean })
      >
    ): Promise<Extract<InferResponseByStatus<TEndpoint, SuccessStatusCode>, { data: {} }>["data"]>;

    delete<Path extends keyof DeleteEndpoints, TEndpoint extends DeleteEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    delete<Path extends keyof DeleteEndpoints, _TEndpoint extends DeleteEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("delete", path, ...params);
    }
    // </ApiClient.delete>
    
// <ApiClient.put>
    put<Path extends keyof PutEndpoints, TEndpoint extends PutEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean })
      >
    ): Promise<Extract<InferResponseByStatus<TEndpoint, SuccessStatusCode>, { data: {} }>["data"]>;

    put<Path extends keyof PutEndpoints, TEndpoint extends PutEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    put<Path extends keyof PutEndpoints, _TEndpoint extends PutEndpoints[Path]>(
      path: Path,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
        return this.request("put", path, ...params);
    }
    // </ApiClient.put>
    

    // <ApiClient.request>
    /**
     * Generic request method with full type-safety for any endpoint
     */
    request<
      TMethod extends keyof EndpointByMethod,
      TPath extends keyof EndpointByMethod[TMethod],
      TEndpoint extends EndpointByMethod[TMethod][TPath]
    >(
      method: TMethod,
      path: TPath,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: false; throwOnStatusError?: boolean })
      >
    ): Promise<Extract<InferResponseByStatus<TEndpoint, SuccessStatusCode>, { data: {} }>["data"]>

    request<
      TMethod extends keyof EndpointByMethod,
      TPath extends keyof EndpointByMethod[TMethod],
      TEndpoint extends EndpointByMethod[TMethod][TPath]
    >(
      method: TMethod,
      path: TPath,
      ...params: MaybeOptionalArg<
        (TEndpoint extends { parameters: infer UParams }
          ? NotNever<UParams> extends true ? UParams & { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean } : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean }
          : { overrides?: RequestInit; withResponse?: true; throwOnStatusError?: boolean })
      >
    ): Promise<SafeApiResponse<TEndpoint>>;

    request<
      TMethod extends keyof EndpointByMethod,
      TPath extends keyof EndpointByMethod[TMethod],
      TEndpoint extends EndpointByMethod[TMethod][TPath]
    >(
      method: TMethod,
      path: TPath,
      ...params: MaybeOptionalArg<any>
    ): Promise<any> {
      const requestParams = params[0];
      const withResponse = requestParams?.withResponse;
      const { withResponse: _, throwOnStatusError = withResponse ? false : true, overrides, ...fetchParams } = requestParams || {};

      const parametersToSend: EndpointParameters = {};
      if (requestParams?.body !== undefined) (parametersToSend as any).body = requestParams.body;
      if (requestParams?.query !== undefined) (parametersToSend as any).query = requestParams.query;
      if (requestParams?.header !== undefined) (parametersToSend as any).header = requestParams.header;
      if (requestParams?.path !== undefined) (parametersToSend as any).path = requestParams.path;

      const resolvedPath = (this.fetcher.decodePathParams ?? this.defaultDecodePathParams)(this.baseUrl + (path as string), (parametersToSend.path ?? {}) as Record<string, string>);
      const url = new URL(resolvedPath);
      const urlSearchParams = (this.fetcher.encodeSearchParams ?? this.defaultEncodeSearchParams)(parametersToSend.query);

      const promise = this.fetcher.fetch({
        method: method,
        path: (path as string),
        url,
        urlSearchParams,
        parameters: Object.keys(fetchParams).length ? fetchParams : undefined,
        overrides,
        throwOnStatusError
      })
        .then(async (response) => {
          const data = await (this.fetcher.parseResponseData ?? this.defaultParseResponseData)(response);
          const typedResponse = Object.assign(response, {
            data: data,
            json: () => Promise.resolve(data)
          }) as SafeApiResponse<TEndpoint>;

          if (throwOnStatusError && errorStatusCodes.includes(response.status as never)) {
            throw new TypedStatusError(typedResponse as never);
          }

          return withResponse ? typedResponse : data;
        });

        return promise as Extract<InferResponseByStatus<TEndpoint, SuccessStatusCode>, { data: {} }>["data"]
    }
    // </ApiClient.request>
}

export function createApiClient(fetcher: Fetcher, baseUrl?: string) {
  return new ApiClient(fetcher).setBaseUrl(baseUrl ?? "");
}


/**
 Example usage:
 const api = createApiClient((method, url, params) =>
   fetch(url, { method, body: JSON.stringify(params) }).then((res) => res.json()),
 );
 api.get("/users").then((users) => console.log(users));
 api.post("/users", { body: { name: "John" } }).then((user) => console.log(user));
 api.put("/users/:id", { path: { id: 1 }, body: { name: "John" } }).then((user) => console.log(user));

 // With error handling
 const result = await api.get("/users/{id}", { path: { id: "123" }, withResponse: true });
 if (result.ok) {
   // Access data directly
   const user = result.data;
   console.log(user);

   // Or use the json() method for compatibility
   const userFromJson = await result.json();
   console.log(userFromJson);
 } else {
   const error = result.data;
   console.error(`Error ${result.status}:`, error);
 }
*/

// </ApiClient>

  