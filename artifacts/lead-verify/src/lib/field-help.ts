/** Plain-language help text for labels, columns, and page sections. */
export const HELP = {
  // Pages
  dashboard: "Your home base — see how many leads you've uploaded, called, and verified at a glance.",
  dashboardDailyCalls: "Shows how many AI calls were placed each day over the last 30 days. Purple = total calls, green = verified, amber = other outcomes.",
  dashboardStatusBreakdown: "A pie chart of call outcomes — verified, voicemail, wrong contact, and more.",
  dashboardFunnel: "Shows how leads progress from upload to verified contact — spot where drop-off is highest.",
  dashboardLiveOps: "Live dialer status — active calls, queued leads, and each campaign's current state.",
  dashboardCampaignStats: "Side-by-side campaign metrics so you can see which outreach is performing best.",
  dashboardCalled: "Leads that have been dialed at least once (no longer pending).",

  campaigns: "Campaigns control when and how the AI calls your leads. Create one, assign leads, then hit Start.",
  leads: "All contacts you've uploaded. The AI calls them to verify name, company, and phone number match.",
  results: "Outcomes from completed AI calls — who was verified, who went to voicemail, and why.",
  callLogs: "A detailed log of every call placed, including duration, whether a real person answered, and how it ended.",
  settings: "Update your profile details and change your password.",

  // Dashboard stat cards
  totalLeads: "Total contacts uploaded across all campaigns.",
  pendingCalls: "Leads waiting to be called — not yet dialed or still in queue.",
  verifiedContacts: "Leads the AI confirmed as the correct person at the correct company.",
  realPersons: "Calls where a live human answered (not voicemail or an automated system).",
  voicemail: "Calls that reached voicemail instead of a live person.",
  wrongContacts: "The person who answered is not the lead you were trying to reach.",
  companyMismatch: "The person answered but works at a different company than listed.",
  invalidNumbers: "Phone numbers that couldn't be reached — disconnected, wrong format, or invalid.",
  successRate: "Percentage of calls that resulted in a verified contact.",
  activeCampaigns: "Campaigns currently set to Active and eligible to dial leads.",

  // Campaign fields
  campaignName: "A short name so you can tell campaigns apart, e.g. 'Q2 CRM Outreach'.",
  timezone: "The timezone for your calling hours. Calls only go out during Start–End time in this zone.",
  startTime: "When the AI may begin placing calls each day. No calls before this time.",
  endTime: "When calling stops for the day. The campaign pauses until the next day's start time.",
  callsPerMinute: "Max new calls started per minute. Lower this if you want a slower, gentler pace.",
  concurrentLimit: "How many calls can be active at the same time (max 10). Prevents overloading your phone lines.",
  retries: "Summary of your retry strategy — max attempts and delay pattern between follow-up calls.",
  retryDelay: "Seconds to wait between retry attempts (legacy field, synced from strategy).",
  retryStrategy: "Design how and when the AI re-dials leads that didn't connect. Use presets or build a custom follow-up pattern.",
  retryType: "Fixed Delay repeats the same interval. Custom Schedule lets you define each retry individually. Smart Schedule rotates call times automatically.",
  maxAttempts: "Total dial attempts per lead including the first call. Retries = max attempts minus one.",
  retrySchedule: "Set how long to wait after each call. Days retry at the same time on the next working day. Use ± hrs to shift the retry time earlier or later.",
  retryFrequency: "How often retries should be spaced — same day, alternate days, weekly, or a custom cron expression.",
  retryTimePreference: "When during the day retries should occur relative to the original call or campaign window.",
  retryDays: "Only retry on selected days of the week. Uncheck Sat/Sun for business-only outreach.",
  retryStopConditions: "Conditions that immediately stop further retries for a lead.",
  campaignStatus: "Draft = ready but not calling. Active = dialing leads now. Paused = temporarily stopped. Completed = all leads processed.",
  callingWindow: "The daily hours when this campaign is allowed to place calls.",
  rate: "Dialing speed — calls per minute and how many can run at the same time.",
  progress: "How many leads have been called compared to the total assigned to this campaign.",
  created: "When this record was first created in the system.",
  updated: "When this record was last changed.",

  // Lead fields
  lead: "The contact's first and last name from your uploaded file.",
  firstName: "The lead's given name, as it appears in your CSV file.",
  lastName: "The lead's family name, as it appears in your CSV file.",
  company: "The company the lead is supposed to work at. The AI confirms this on the call.",
  phone: "The phone number the AI will dial to reach this lead.",
  status: "Where this lead is in the verification process — pending, calling, verified, etc.",
  campaign: "Which calling campaign this lead belongs to. Campaigns control when calls go out.",
  actions: "View details, trigger a manual call, or delete this lead.",
  searchLeads: "Filter leads by name, company, or phone number.",
  statusFilter: "Show only leads with a specific verification status.",
  uploadCampaign: "Assign imported leads to a campaign so they get called when you start it.",
  sampleFile: "Download a CSV template with the correct column headers for uploading leads.",

  // Lead statuses
  statusPending: "Uploaded but not called yet. Will be dialed when the campaign is active.",
  statusCalling: "An AI call is in progress right now.",
  statusVerified: "Confirmed — the right person answered at the right company.",
  statusVoicemail: "The call reached voicemail, not a live person.",
  statusWrongContact: "Someone answered, but it's not the person you're looking for.",
  statusCompanyMismatch: "The person answered but works at a different company.",
  statusInvalidNumber: "The phone number couldn't be reached or is invalid.",

  // Results fields
  confidence: "How sure the AI is about the verification result, from 0% (uncertain) to 100% (very confident).",
  calledAt: "Date and time when the AI placed this call.",
  exportCsv: "Download all matching results as a spreadsheet for your CRM or reporting.",
  searchResults: "Filter results by lead name, company, or phone number.",

  // Call log fields
  realPerson: "Did a live human answer? 'Yes' means someone picked up; 'No' means voicemail or no answer.",
  duration: "How long the call lasted, from dial to hang-up.",
  endReason: "Why the call ended — e.g. completed, no answer, busy, or voicemail detected.",

  // Detail page fields
  fullName: "The lead's complete name as uploaded in your file.",
  added: "When this lead was imported into the system.",
  callSummary: "What happened during the AI verification call — duration, outcome, and transcript.",
  classification: "The AI's final verdict — verified, voicemail, wrong contact, etc.",
  recording: "Whether an audio recording of the call is available.",
  transcript: "A text transcript of what was said during the call.",

  // Settings
  fullNameSetting: "Your display name shown in the app header and profile.",
  username: "Your login username — used to sign in to CallReady AI.",
  email: "Your account email address.",
  jwtAuth: "Your session is secured with token-based authentication. No action needed.",
  currentPassword: "Enter your existing password to confirm your identity.",
  newPassword: "Choose a new password — at least 6 characters.",
  confirmPassword: "Re-enter your new password to make sure it matches.",
  notifications: "Email and in-app alerts for campaign events — coming soon.",

  // Login
  loginUsername: "The username provided by your admin to access CallReady AI.",
  loginPassword: "Your account password. Contact your admin if you've forgotten it.",
  rememberMe: "Stay signed in on this device so you don't have to log in every visit.",
} as const;
