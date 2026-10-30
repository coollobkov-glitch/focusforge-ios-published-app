# FocusForge — Product Strategy Document

> "Before you waste time, remember who you are trying to become."

---

## 1. Product Definition

**FocusForge** is a self-improvement operating system disguised as a distraction blocker. It intercepts moments of weakness (opening Instagram, TikTok, YouTube, etc.) and transforms them into moments of clarity — showing users their goals, unfinished tasks, habit progress, and daily discipline score.

**Category:** Productivity / Self-Improvement / Digital Wellness
**Tagline:** "Turn distractions into discipline."
**Core Emotion:** Empowerment through awareness, not punishment through restriction.

### What it is:
- A **distraction interceptor** that blocks or delays access to chosen apps
- A **task manager** for daily goals and to-dos
- A **habit tracker** with streaks, reflections, and reminders
- A **focus coach** with scheduled focus sessions and timers
- A **self-improvement dashboard** that turns distraction data into growth insights

### What it is NOT:
- Not a parental control app
- Not a punishment tool
- Not a basic app timer
- Not another to-do list

---

## 2. App Name Candidates

| Name | Vibe | Available? |
|------|------|------------|
| **FocusForge** | Premium, disciplined, building yourself | ✅ Strong pick |
| **Recoil** | Snapping back to focus | ✅ Edgy, memorable |
| **Intentional** | Clean, mindful, premium | ✅ Lifestyle brand |
| **Clarity** | Minimal, focused | ⚠️ Common |
| **Refocus** | Action-oriented | ⚠️ Exists in some form |
| **Fortify** | Strength, discipline, resilience | ✅ Strong |
| **Reclaim** | Taking back your time | ⚠️ Exists (ReclaimAI) |
| **Verto** | Latin for "to turn/redirect" | ✅ Unique |
| **Praxis** | Greek for "practice/action" | ✅ Intellectual |
| **Locked In** | Gen-Z energy, viral potential | ✅ Bold |

**Recommended:** **FocusForge** — It communicates both focus and the act of building/forging yourself. Premium feel, memorable, domain-friendly.

**Runner-up:** **Recoil** — Edgy, implies snapping back from distraction. Great for younger audiences.

---

## 3. Main User Flow

```
┌─────────────────────────────────────────────────────────┐
│                    ONBOARDING                            │
│  1. Welcome → Set intention ("Who are you becoming?")   │
│  2. Select apps to block (Instagram, TikTok, etc.)      │
│  3. Create 3 daily habits                                │
│  4. Create 3 daily tasks                                 │
│  5. Set first focus schedule                             │
│  6. Grant permissions (accessibility/screen time API)    │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   DAILY DASHBOARD                        │
│  - Today's discipline score (0-100%)                    │
│  - Tasks: 2/5 completed                                 │
│  - Habits: 3/7 completed                                │
│  - Focus streak: 5 days                                 │
│  - Distraction attempts today: 4                        │
│  - Active focus session indicator                       │
│  - Quick action buttons                                 │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│              DISTRACTION INTERCEPTION                    │
│  (User tries to open Instagram)                         │
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │  "Before you scroll, remember your goals."  │        │
│  │                                              │        │
│  │  ✅ Morning workout     ⬜ Read 20 pages    │        │
│  │  ✅ Journaling          ⬜ Study 2 hours    │        │
│  │  ✅ Prayer              ⬜ No social media   │        │
│  │                                              │        │
│  │  Tasks: 2/5 done | Habits: 3/6 done         │        │
│  │  ████████░░░░░░░░ 47% daily progress        │        │
│  │                                              │        │
│  │  ⚠️ You've tried to open distracting apps   │        │
│  │     7 times today                            │        │
│  │  📱 Instagram (4x) | TikTok (2x) | X (1x)  │        │
│  │                                              │        │
│  │  [🔙 Go Back to Focus]                      │        │
│  │  [⏱️ Wait 30s to continue]                  │        │
│  │  [✅ Mark a task complete]                   │        │
│  │  [🎯 Start focus timer]                     │        │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    ANALYTICS                             │
│  Daily / Weekly / Monthly views                         │
│  - Distraction attempts over time                       │
│  - Most distracting apps chart                          │
│  - Tasks completed trend                                │
│  - Habits completed trend                               │
│  - Focus time logged                                    │
│  - Time saved estimate                                  │
│  - Discipline score trend                               │
│  - Focus streak calendar                                │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Screen Inventory (MVP)

1. **Onboarding Flow** (4-5 screens)
2. **Dashboard** — Daily command center
3. **Tasks Screen** — Create, complete, manage daily tasks
4. **Habits Screen** — Track daily habits with streaks
5. **Focus Screen** — Active focus sessions and schedules
6. **Block Screen / Interception Screen** — The core differentiator
7. **Analytics Screen** — Daily/weekly insights
8. **Settings** — Blocked apps, schedules, preferences
9. **Profile** — Streaks, personal goal, reflection journal

---

## 5. MVP vs Future Features

### MVP (Version 1.0) — Ship in 8-12 weeks

| Feature | Priority |
|---------|----------|
| App selection for blocking | P0 |
| Block/interception screen with task + habit data | P0 |
| Daily task creation and completion | P0 |
| Daily habit tracking | P0 |
| Basic focus timer | P0 |
| Daily discipline score | P0 |
| Distraction attempt counter | P0 |
| Basic analytics (daily view) | P1 |
| Focus schedules (work, study, custom) | P1 |
| Onboarding flow | P1 |
| Push notifications / reminders | P1 |
| Streak tracking (habits + focus) | P1 |

### Version 1.5 — Post-Launch (4-8 weeks after MVP)

| Feature | Priority |
|---------|----------|
| Weekly/monthly analytics | P2 |
| Daily reflection journal | P2 |
| Most-opened distracting apps breakdown | P2 |
| Widgets (iOS/Android) | P2 |
| Custom focus session names | P2 |
| Bedtime mode | P2 |
| Morning routine mode | P2 |
| Time saved calculator | P2 |

### Version 2.0 — Growth Features

| Feature | Priority |
|---------|----------|
| Social accountability (share streaks) | P3 |
| AI coach / personalized nudges | P3 |
| Challenges & achievements | P3 |
| Integration with Apple Health / Google Fit | P3 |
| Focus music / ambient sounds | P3 |
| App usage reports (Screen Time API) | P3 |
| Export data / PDF reports | P3 |
| Team / group challenges | P3 |
| Pomodoro mode with tasks | P3 |
| Apple Watch / Wear OS companion | P3 |

---

## 6. Feature Priority Matrix

```
          HIGH IMPACT
              │
    P0 ───────┼──────── P1
    Block      │        Schedules
    Screen     │        Analytics
    Tasks      │        Streaks
    Habits     │        Notifications
    Timer      │        Onboarding
    Score      │
              │
  LOW ────────┼──────── HIGH EFFORT
  EFFORT      │
              │
    P2 ───────┼──────── P3
    Journal    │        AI Coach
    Widgets    │        Social
    Bedtime    │        Challenges
    Time Saved │        Integrations
```

---

## 7. How App Blocking Works

### iOS (iPhone/iPad)

**Screen Time API (Managed Settings / Family Controls / Device Activity)**
- Apple introduced the **Screen Time API** (2022) with three frameworks:
  - **ManagedSettings** — Apply restrictions (block apps, filter web content)
  - **FamilyControls** — Request authorization to monitor/control apps
  - **DeviceActivity** — Schedule monitoring and respond to app launches
- Your app requests **FamilyControls authorization** → user grants it
- You use **DeviceActivity Monitor** to detect when a blocked app is opened
- When detected, you show a **shield overlay** (customizable since iOS 16.4+)
- The shield can show custom UI with your focus/task data
- **Limitation:** Apple controls the shield UI format. You can customize text, icon, and a few elements, but not full custom screens (as of iOS 17). Workaround: Use a "managed settings" approach to fully block the app and show a notification that deep-links to your app's interception screen.
- **Requires:** iOS 16+, Screen Time entitlement from Apple (must apply)

### Android

**Accessibility Service + Usage Stats API**
- **UsageStatsManager** — Detect which app is in the foreground
- **Accessibility Service** — Monitor app launches in real-time and overlay your screen
- When a blocked app is detected in the foreground:
  1. Show a full-screen overlay (your custom interception screen)
  2. Or launch your app's interception activity on top
- **Draw Over Other Apps** permission required
- **Accessibility Service** permission required
- Android gives much more flexibility than iOS for custom block screens
- **Limitation:** Google Play policy restricts accessibility service usage. Must justify the use case clearly in the Play Store listing.

### Summary

| Capability | iOS | Android |
|-----------|-----|---------|
| Detect app launch | DeviceActivity Monitor | Accessibility Service / UsageStats |
| Block app | ManagedSettings shield | Full-screen overlay |
| Custom block screen | Limited (shield UI) | Full custom UI |
| Permissions needed | FamilyControls auth | Accessibility + Overlay + UsageStats |
| Store approval | Need entitlement | Need policy justification |

---

## 8. Recommended Tech Stack

### Mobile App
| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **React Native (Expo)** | Cross-platform, fast iteration, large ecosystem |
| Alternative | **Flutter** | Better native performance, great UI toolkit |
| Native modules | Swift (iOS) / Kotlin (Android) | Required for Screen Time API / Accessibility Service |
| State management | Zustand or Redux Toolkit | Lightweight, scalable |
| Navigation | React Navigation 7 | Industry standard for RN |

### Backend
| Layer | Technology | Why |
|-------|-----------|-----|
| Runtime | **Node.js + Express** or **Fastify** | Fast, JavaScript everywhere |
| Alternative | **Supabase** (BaaS) | Faster MVP, built-in auth + DB + realtime |
| Database | **PostgreSQL** (via Supabase or self-hosted) | Relational, powerful, scales well |
| Auth | Supabase Auth or Firebase Auth | Social login + email/password |
| Push notifications | Firebase Cloud Messaging (FCM) + APNs | Industry standard |
| Analytics pipeline | PostHog or Mixpanel | Product analytics |

### Infrastructure
| Layer | Technology | Why |
|-------|-----------|-----|
| Hosting | **Supabase** (managed) or **Railway** | Easy deploy, auto-scaling |
| Storage | Supabase Storage or S3 | Profile images, exports |
| CI/CD | GitHub Actions + EAS Build (Expo) | Automated builds and deploys |
| Monitoring | Sentry | Crash reporting |

### Recommended MVP Stack
**React Native (Expo) + Supabase (Auth + PostgreSQL + Realtime) + Native modules for blocking**

This gives you the fastest path to MVP while keeping the architecture scalable.

---

## 9. Database Schema

```sql
-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  intention TEXT, -- "Who are you trying to become?"
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TASKS (Daily Goals)
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium', -- low, medium, high
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_date ON tasks(user_id, date);

-- ============================================
-- HABITS
-- ============================================
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  icon TEXT, -- emoji or icon name
  color TEXT, -- hex color
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HABIT COMPLETIONS (Daily log)
-- ============================================
CREATE TABLE habit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, date)
);

CREATE INDEX idx_habit_completions_user_date ON habit_completions(user_id, date);

-- ============================================
-- BLOCKED APPS
-- ============================================
CREATE TABLE blocked_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL, -- "Instagram"
  package_name TEXT, -- "com.instagram.android"
  bundle_id TEXT, -- "com.burbn.instagram"
  icon_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISTRACTION ATTEMPTS (App open attempts)
-- ============================================
CREATE TABLE distraction_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_app_id UUID REFERENCES blocked_apps(id) ON DELETE SET NULL,
  app_name TEXT NOT NULL,
  outcome TEXT DEFAULT 'blocked', -- blocked, delayed, allowed
  delay_seconds INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attempts_user_date ON distraction_attempts(user_id, timestamp);

-- ============================================
-- FOCUS SESSIONS
-- ============================================
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL, -- work, study, morning_routine, bedtime, custom
  custom_name TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  planned_duration_minutes INTEGER,
  actual_duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FOCUS SCHEDULES (Recurring)
-- ============================================
CREATE TABLE focus_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Work Hours", "Study Time"
  schedule_type TEXT NOT NULL, -- work, study, morning, bedtime, custom
  days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}', -- 0=Sun, 6=Sat
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  strict_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STREAKS
-- ============================================
CREATE TABLE streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  streak_type TEXT NOT NULL, -- focus, habit, task_completion
  reference_id UUID, -- habit_id for habit streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completed_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY ANALYTICS (Pre-computed daily summary)
-- ============================================
CREATE TABLE daily_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_total INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  habits_total INTEGER DEFAULT 0,
  habits_completed INTEGER DEFAULT 0,
  distraction_attempts INTEGER DEFAULT 0,
  focus_minutes INTEGER DEFAULT 0,
  discipline_score INTEGER DEFAULT 0, -- 0-100
  top_distraction_app TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_analytics_user_date ON daily_analytics(user_id, date);

-- ============================================
-- REFLECTIONS (Daily journal)
-- ============================================
CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  content TEXT,
  mood TEXT, -- great, good, okay, bad
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

---

## 10. Monetization Strategy

### Freemium Model (Recommended)

**Free Tier:**
- Block up to 3 apps
- 5 daily tasks
- 3 daily habits
- Basic focus timer
- Daily analytics
- Basic block screen

**Pro Tier ($4.99/month or $39.99/year):**
- Unlimited blocked apps
- Unlimited tasks & habits
- Advanced analytics (weekly, monthly, trends)
- Custom focus schedules
- Strict blocking mode
- Daily reflection journal
- Widgets
- Export reports
- Priority support

**Premium Tier ($9.99/month or $79.99/year):**
- Everything in Pro
- AI-powered insights & coaching
- Social accountability features
- Team/group challenges
- Custom themes
- Early access to new features

### Additional Revenue:
- **Lifetime deal** ($99-149) for early adopters
- **Corporate/team plans** for productivity-focused companies
- **Affiliate partnerships** with self-improvement brands

---

## 11. Competitive Differentiation

| App | What it does | What it lacks |
|-----|-------------|---------------|
| **Opal** | Screen time + app blocking | No tasks, no habits, no interception screen with goals |
| **Freedom** | Cross-device blocking | No self-improvement features, feels restrictive |
| **one sec** | Breathing pause before app | No task/habit integration, single-purpose |
| **ScreenZen** | Usage awareness + delays | No habit tracking, no focus sessions |
| **Habitica** | Gamified habits | No app blocking, childish design |
| **Todoist** | Task management | No blocking, no habits, no focus |
| **Streaks** | Habit tracking | No blocking, no tasks |

### FocusForge's Unique Position:

1. **Interception + Action** — Not just blocking, but showing your goals AT the moment of distraction
2. **Unified system** — Tasks + Habits + Blocking + Focus in ONE app (no switching between 4 apps)
3. **Discipline score** — A single daily metric that gamifies your entire day
4. **Distraction-to-action pipeline** — Quick actions from the block screen (mark task done, start timer)
5. **Emotional design** — "Remember who you're becoming" vs "You're blocked"
6. **Context-aware blocking** — Different rules for work hours, study time, bedtime
7. **Analytics that tell a story** — Not just screen time data, but discipline trends

### The Moat:
"Other apps block distractions OR track habits OR manage tasks. FocusForge is the only app that turns every distraction moment into a self-improvement checkpoint."

---

## 12. Growth Strategy

### Launch:
1. **Reddit** — r/productivity, r/getdisciplined, r/selfimprovement, r/nosurf
2. **Twitter/X** — Build in public, share development journey
3. **TikTok** — "I built an app that shows your goals when you try to open Instagram"
4. **Product Hunt** — Launch with premium visuals and clear positioning
5. **YouTube** — Partner with productivity YouTubers

### Retention:
1. Morning push notification: "Your 3 tasks for today"
2. Evening push: "Reflect on your day"
3. Streak notifications: "Don't break your 14-day focus streak!"
4. Weekly email digest: Your discipline report
5. Share-worthy streak cards for social media

---

## 13. Design Principles

1. **Dark mode first** — Premium, focused, less stimulating
2. **Minimal chrome** — Every pixel earns its place
3. **Typography-driven** — Bold headlines, clean body text
4. **Muted accent colors** — Soft blues, greens for progress, warm amber for warnings
5. **Micro-animations** — Satisfying completion animations, smooth transitions
6. **No clutter** — Progressive disclosure, show what matters now
7. **Emotional copy** — Every piece of text should inspire, not lecture

---

*Document created for FocusForge — Turn distractions into discipline.*
