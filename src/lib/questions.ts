export type Question =
  | {
      id: string;
      section: "knowledge" | "attitude";
      type: "mcq";
      prompt: string;
      options: { value: string; label: string }[];
      correct?: string;
      optional?: boolean;
    }
  | {
      id: string;
      section: "knowledge" | "attitude";
      type: "text";
      prompt: string;
      placeholder?: string;
      optional?: boolean;
    };

export const QUESTIONS: Question[] = [
  // Knowledge — Laravel / PHP
  {
    id: "k_laravel_eloquent",
    section: "knowledge",
    type: "mcq",
    prompt:
      "In Laravel Eloquent, which relationship do you use when one Post has many Comments?",
    options: [
      { value: "a", label: "hasOne" },
      { value: "b", label: "hasMany" },
      { value: "c", label: "belongsTo" },
      { value: "d", label: "belongsToMany" },
    ],
    correct: "b",
  },
  {
    id: "k_php_strict",
    section: "knowledge",
    type: "mcq",
    prompt: "In PHP, what does `declare(strict_types=1);` at the top of a file do?",
    options: [
      { value: "a", label: "Disables all type coercion for scalar arguments and returns" },
      { value: "b", label: "Forces PHP to run in strict syntax mode" },
      { value: "c", label: "Enables JIT compilation" },
      { value: "d", label: "Throws on any undefined variable" },
    ],
    correct: "a",
  },
  {
    id: "k_laravel_middleware",
    section: "knowledge",
    type: "mcq",
    prompt: "What is Laravel middleware primarily used for?",
    options: [
      { value: "a", label: "Defining database relationships between models" },
      { value: "b", label: "Intercepting HTTP requests to filter or transform them before they reach a controller" },
      { value: "c", label: "Compiling Blade templates to PHP" },
      { value: "d", label: "Managing scheduled background jobs" },
    ],
    correct: "b",
  },
  {
    id: "k_laravel_n1",
    section: "knowledge",
    type: "mcq",
    prompt:
      "A Laravel endpoint runs 1 query for Posts then 1 query per Post to fetch its Author. What is this problem called, and what is the correct fix?",
    options: [
      { value: "a", label: "Race condition — fix with database locks" },
      { value: "b", label: "Memory leak — fix with chunked processing" },
      { value: "c", label: "N+1 query problem — fix with eager loading using `with('author')`" },
      { value: "d", label: "Deadlock — fix with query caching" },
    ],
    correct: "c",
  },

  // Knowledge — MySQL
  {
    id: "k_mysql_index",
    section: "knowledge",
    type: "mcq",
    prompt:
      "A query `WHERE email = ? AND status = ?` is slow on a large table. What is the best first step?",
    options: [
      { value: "a", label: "Switch to `SELECT *` instead of listing columns" },
      { value: "b", label: "Add a composite index on (email, status)" },
      { value: "c", label: "Cache the whole table in Redis" },
      { value: "d", label: "Rewrite the query as a subquery" },
    ],
    correct: "b",
  },
  {
    id: "k_mysql_transaction",
    section: "knowledge",
    type: "mcq",
    prompt: "When should you wrap multiple MySQL statements in a transaction?",
    options: [
      { value: "a", label: "Whenever you run more than one SELECT at a time" },
      { value: "b", label: "Only when inserting into tables with foreign keys" },
      { value: "c", label: "When a set of writes must all succeed or all be rolled back — e.g. transferring funds between two accounts" },
      { value: "d", label: "When you need to improve query performance" },
    ],
    correct: "c",
  },

  // Knowledge — CI/CD
  {
    id: "k_cicd_concepts",
    section: "knowledge",
    type: "mcq",
    prompt: "Which best describes Continuous Deployment vs Continuous Delivery?",
    options: [
      {
        value: "a",
        label:
          "Continuous Deployment auto-ships every passing build to production; Continuous Delivery stops one step short — ready to deploy, but requires a manual approval",
      },
      { value: "b", label: "They are the same thing with different names" },
      { value: "c", label: "Continuous Delivery only covers frontend; Deployment only covers backend" },
      { value: "d", label: "Continuous Deployment is for staging only" },
    ],
    correct: "a",
  },
  {
    id: "k_cicd_pipeline",
    section: "knowledge",
    type: "mcq",
    prompt: "What is the correct order of stages in a typical CI pipeline for a Laravel + MySQL project?",
    options: [
      { value: "a", label: "Deploy → Test → Build → Install" },
      { value: "b", label: "Install dependencies → Static analysis / lint → Run tests → Build artifact → Deploy" },
      { value: "c", label: "Test → Install → Deploy → Lint" },
      { value: "d", label: "Build → Deploy → Test → Monitor" },
    ],
    correct: "b",
  },

  // Knowledge — AI
  {
    id: "k_ai_usage",
    section: "knowledge",
    type: "mcq",
    prompt: "Which of the following is the most appropriate use of an AI coding assistant in a backend project?",
    options: [
      { value: "a", label: "Let it write and commit production code without review" },
      { value: "b", label: "Use it to generate boilerplate, explore unfamiliar APIs, and draft tests — then review carefully before merging" },
      { value: "c", label: "Only use it for naming variables" },
      { value: "d", label: "Avoid it entirely — AI-generated code is always insecure" },
    ],
    correct: "b",
  },
  {
    id: "k_ai_risk",
    section: "knowledge",
    type: "mcq",
    prompt:
      "You're adding an LLM feature that summarizes user-uploaded documents. What is the MOST important security risk to address first?",
    options: [
      { value: "a", label: "The summary font not matching the brand guidelines" },
      { value: "b", label: "Prompt injection — malicious content in the uploaded document could hijack the LLM's instructions" },
      { value: "c", label: "The feature not supporting dark mode" },
      { value: "d", label: "Summaries being too long" },
    ],
    correct: "b",
  },

  // Attitude — behavioral judgment MCQs
  // Correct answers are set so admin review highlights the recommended choice.
  // Wrong options reflect common-but-flawed reasoning, not bad character.

  {
    id: "a_security_vs_delivery",
    section: "attitude",
    type: "mcq",
    prompt:
      "You're mid-sprint on an urgent feature when you spot a security vulnerability in existing code that no one else has noticed. Fixing it properly will take 2 days. Your feature deadline is in 3 days.",
    options: [
      { value: "a", label: "Fix the security issue now and deliver the feature late" },
      {
        value: "b",
        label:
          "Document the vulnerability in detail, flag it to your lead today, and keep working on the feature",
      },
      { value: "c", label: "Do a quick 1-hour patch on the vulnerability and push on with the feature" },
      { value: "d", label: "Finish the feature first, then open a ticket for the security fix" },
    ],
    correct: "b",
  },
  {
    id: "a_api_quality_vs_deadline",
    section: "attitude",
    type: "mcq",
    prompt:
      "You're building an API that 3 other teams depend on. You can ship a working but minimal version in 2 days, or a properly validated version with logging and docs in 5 days. The PM says 2 days is the deadline.",
    options: [
      { value: "a", label: "Ship in 2 days and add proper error handling in the next sprint" },
      {
        value: "b",
        label:
          "Spend 10 minutes with the PM to understand what can flex — then make the call with full context",
      },
      { value: "c", label: "Build it properly in 5 days and miss the deadline without discussing it" },
      {
        value: "d",
        label:
          "Ship in 2 days but write a clear internal doc of what's missing and what could break",
      },
    ],
    correct: "b",
  },
  {
    id: "a_scope_gap",
    section: "attitude",
    type: "mcq",
    prompt:
      "Mid-sprint you realise a requirement was misunderstood — what you agreed to build will take 3× longer than estimated. You have 2 days left. Other stories depend on yours.",
    options: [
      { value: "a", label: "Deliver whatever you can in 2 days and explain the gap at the sprint review" },
      {
        value: "b",
        label:
          "Tell your lead immediately, explain the gap, and ask which part to prioritise in the remaining time",
      },
      { value: "c", label: "Work overnight tonight to close as much of the gap as possible without flagging it" },
      { value: "d", label: "Push back on the requirement — argue that the original scope needs to be reduced" },
    ],
    correct: "b",
  },
  {
    id: "a_pr_feedback",
    section: "attitude",
    type: "mcq",
    prompt:
      "Your PR gets rejected with detailed feedback. Most is fair, but one suggestion calls for a pattern you've benchmarked and confirmed is 40% slower. The feature is needed tomorrow.",
    options: [
      { value: "a", label: "Apply all the feedback without comment to unblock the merge" },
      {
        value: "b",
        label:
          "Apply the changes you agree with, leave a data-backed reply on the performance point, and ask how to proceed",
      },
      { value: "c", label: "Merge your original version and leave a comment explaining your reasoning" },
      { value: "d", label: "Request a call to resolve the disagreement before making any changes" },
    ],
    correct: "b",
  },
  {
    id: "a_refactor_coverage",
    section: "attitude",
    type: "mcq",
    prompt:
      "Halfway through refactoring a critical service you discover test coverage is only 20%. You can finish the refactor as-is, stop and write tests first (adds 3 days), or roll back and open a separate ticket.",
    options: [
      { value: "a", label: "Finish the refactor — you're confident in the changes you made" },
      { value: "b", label: "Stop and write comprehensive tests before continuing, even if it delays delivery" },
      { value: "c", label: "Roll back all your changes and open a test coverage ticket to address first" },
      {
        value: "d",
        label:
          "Finish the refactor, deploy to staging for extended observation, and write tests in parallel",
      },
    ],
    correct: "d",
  },
  {
    id: "a_incident_ownership",
    section: "attitude",
    type: "mcq",
    prompt:
      "A production incident is traced to a config change you made 3 days ago. No one has connected it to you yet. Your lead asks the team in Slack: \"Does anyone know what caused this?\"",
    options: [
      { value: "a", label: "Wait until you've fully confirmed it's your change before saying anything" },
      {
        value: "b",
        label:
          "Say immediately: \"I made a change Tuesday that might be related — let me check and revert if needed\"",
      },
      { value: "c", label: "Say you're not sure but offer to help investigate" },
      { value: "d", label: "Revert your change silently first, then tell the team once it's fixed" },
    ],
    correct: "b",
  },
  {
    id: "a_ambiguous_spec",
    section: "attitude",
    type: "mcq",
    prompt:
      "A spec has two valid interpretations that lead to completely different implementations. The simpler one might be wrong. The PM is in back-to-back meetings for 4 hours. Deadline is end of day.",
    options: [
      { value: "a", label: "Pick the simpler interpretation and ship it — easier to pivot than build nothing" },
      { value: "b", label: "Block the ticket until you can get clarification from the PM" },
      {
        value: "c",
        label:
          "Build the simpler version, document both interpretations and your assumption, and ping the PM to confirm before the production push",
      },
      { value: "d", label: "Build both versions so the PM can choose when they're free" },
    ],
    correct: "c",
  },
  {
    id: "a_arch_disagreement",
    section: "attitude",
    type: "mcq",
    prompt:
      "Your team has committed to a microservices architecture. You're convinced it's the wrong call for your team's current size and have seen it go wrong before. Work has already started. You have a 1:1 with your lead this week.",
    options: [
      {
        value: "a",
        label:
          "Raise it in the 1:1 with specific technical risks and a concrete alternative, and accept their final decision",
      },
      { value: "b", label: "Raise it in the next team meeting to get peer support for your position" },
      {
        value: "c",
        label:
          "Write a detailed technical doc, post it in the team channel, and let the discussion play out",
      },
      { value: "d", label: "Say nothing — the decision is made and energy is better spent on execution" },
    ],
    correct: "a",
  },
  {
    id: "a_overloaded",
    section: "attitude",
    type: "mcq",
    prompt:
      "Your manager assigns you a large new task. You're already at full capacity — another feature is 80% done and needs focused time to close. Your manager doesn't seem aware of your current load.",
    options: [
      { value: "a", label: "Accept both tasks, work overtime as needed, and figure it out" },
      {
        value: "b",
        label:
          "Ask your manager for 5 minutes to walk through your current commitments and get their help prioritising",
      },
      { value: "c", label: "Quietly deprioritise the new task and finish your current feature first" },
      { value: "d", label: "Push back immediately, saying you can't take on anything new until the current task ships" },
    ],
    correct: "b",
  },
  {
    id: "a_quick_fix",
    section: "attitude",
    type: "mcq",
    prompt:
      "A bug in production affects a small percentage of users. You can apply a 30-minute hack that stops the complaints but leaves the root cause, or the proper fix that takes 2 days and requires a code freeze.",
    options: [
      {
        value: "a",
        label: "Apply the hack, open a ticket for the proper fix, and set a reminder to follow up",
      },
      { value: "b", label: "Apply the hack and consider the issue resolved — the proper fix is too expensive" },
      { value: "c", label: "Skip the hack and apply only the proper fix, accepting 2 more days of complaints" },
      {
        value: "d",
        label:
          "Apply the hack, immediately block the 2-day window in the team calendar, and treat the root fix as committed work",
      },
    ],
    correct: "d",
  },

  // Attitude — optional written questions
  {
    id: "a_written_incident",
    section: "attitude",
    type: "text",
    optional: true,
    prompt:
      "Optional: Describe a real bug or incident you caused in production. What happened, how did you fix it, and what changed in your process afterwards?",
    placeholder: "Share as much or as little as you're comfortable with",
  },
  {
    id: "a_written_extra",
    section: "attitude",
    type: "text",
    optional: true,
    prompt:
      "Optional: Is there anything else you'd like us to know about you, your experience, or your goals?",
    placeholder: "Anything you'd like to add",
  },
];

export const TIME_LIMIT_MINUTES = 25;
