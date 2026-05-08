type Option = { value: string; label: string };
type Question = {
  type: "mcq" | "open";
  section: "knowledge" | "attitude";
  prompt: string;
  options: Option[];
  correct: string;
  optional: boolean;
};

function mcq(
  section: "knowledge" | "attitude",
  prompt: string,
  options: [string, string, string, string],
  correct: "a" | "b" | "c" | "d"
): Question {
  return {
    type: "mcq",
    section,
    prompt,
    options: [
      { value: "a", label: options[0] },
      { value: "b", label: options[1] },
      { value: "c", label: options[2] },
      { value: "d", label: options[3] },
    ],
    correct,
    optional: false,
  };
}

function open(section: "knowledge" | "attitude", prompt: string): Question {
  return { type: "open", section, prompt, options: [], correct: "", optional: false };
}

// ─── Role-specific question banks ────────────────────────────────────────────

const banks: Record<string, Question[]> = {
  software: [
    mcq("knowledge", "Which of the following best describes the purpose of version control systems like Git?",
      ["To compile and run code automatically", "To track changes and collaborate on code over time", "To test code for bugs automatically", "To deploy applications to production"],
      "b"),
    mcq("knowledge", "What does REST stand for in the context of web APIs?",
      ["Rapid Execution of Server Tasks", "Representational State Transfer", "Remote Endpoint Service Tool", "Recursive Event Stream Transfer"],
      "b"),
    mcq("knowledge", "Which data structure uses LIFO (Last In, First Out) order?",
      ["Queue", "Linked List", "Stack", "Binary Tree"],
      "c"),
    mcq("knowledge", "What is the primary purpose of unit testing?",
      ["To test the entire application end-to-end", "To verify individual components work as expected in isolation", "To measure application performance", "To test the user interface"],
      "b"),
    open("attitude", "Describe a situation where you had to learn a new technology quickly. How did you approach it?"),
    open("attitude", "How do you handle disagreements about technical decisions within a team?"),
  ],

  design: [
    mcq("knowledge", "What does UX stand for?",
      ["Universal Experience", "User Experience", "Unified Expression", "Usability Exchange"],
      "b"),
    mcq("knowledge", "Which principle ensures that a design is accessible to users with disabilities?",
      ["Minimalism", "WCAG compliance", "Grid alignment", "Color harmony"],
      "b"),
    mcq("knowledge", "What is the purpose of a wireframe in the design process?",
      ["To finalize the visual style of a product", "To create a low-fidelity layout showing structure and flow", "To write front-end code", "To conduct user interviews"],
      "b"),
    mcq("knowledge", "Which design tool is most commonly used for creating interactive prototypes?",
      ["Adobe Photoshop", "Microsoft Word", "Figma", "AutoCAD"],
      "c"),
    open("attitude", "Walk us through your design process from brief to final delivery."),
    open("attitude", "How do you incorporate user feedback into your designs while balancing business requirements?"),
  ],

  marketing: [
    mcq("knowledge", "What does CTR stand for in digital marketing?",
      ["Customer Trend Rate", "Click-Through Rate", "Content Transfer Ratio", "Campaign Targeting Result"],
      "b"),
    mcq("knowledge", "Which metric measures the revenue generated per dollar spent on advertising?",
      ["CPC", "CPM", "ROAS", "CPA"],
      "c"),
    mcq("knowledge", "What is A/B testing used for in marketing?",
      ["Comparing two audience segments' demographics", "Testing two variations to see which performs better", "Auditing brand consistency", "Scheduling social media posts"],
      "b"),
    mcq("knowledge", "SEO stands for:",
      ["Social Engagement Optimization", "Search Engine Optimization", "Site Engagement Overview", "Sponsored Entry Operation"],
      "b"),
    open("attitude", "Describe a campaign you ran that didn't achieve its goals. What did you learn?"),
    open("attitude", "How do you stay current with rapidly changing marketing trends and platforms?"),
  ],

  sales: [
    mcq("knowledge", "What does CRM stand for?",
      ["Customer Revenue Management", "Customer Relationship Management", "Central Records Module", "Client Retention Metric"],
      "b"),
    mcq("knowledge", "Which sales methodology focuses on understanding the customer's Situation, Problem, Implication, and Need-payoff?",
      ["MEDDIC", "Challenger Sale", "SPIN Selling", "Sandler Selling"],
      "c"),
    mcq("knowledge", "What is the primary goal of a discovery call?",
      ["To close the deal immediately", "To understand the prospect's needs and challenges", "To demonstrate all product features", "To negotiate pricing"],
      "b"),
    mcq("knowledge", "What does 'pipeline' refer to in sales?",
      ["A data transfer protocol", "A list of all closed deals", "The stages a prospect moves through toward a purchase", "The company's product roadmap"],
      "c"),
    open("attitude", "Tell us about the most challenging deal you closed. What made it difficult and how did you succeed?"),
    open("attitude", "How do you handle rejection or a string of losses while maintaining motivation?"),
  ],

  finance: [
    mcq("knowledge", "What does P&L stand for?",
      ["Performance and Liability", "Profit and Loss", "Planning and Logistics", "Product and Launch"],
      "b"),
    mcq("knowledge", "Which financial statement shows a company's assets, liabilities, and equity at a point in time?",
      ["Income Statement", "Cash Flow Statement", "Balance Sheet", "Budget Report"],
      "c"),
    mcq("knowledge", "What is EBITDA?",
      ["Earnings Before Interest, Taxes, Depreciation, and Amortization", "Equity Before Income Tax and Dividend Allocation", "Estimated Budget Including Total Debt Amount", "Earnings Based on Internal Tax and Depreciation Analysis"],
      "a"),
    mcq("knowledge", "What does accounts receivable represent?",
      ["Money the company owes to suppliers", "Money owed to the company by its customers", "Employee salary expenses", "Long-term debt obligations"],
      "b"),
    open("attitude", "How do you ensure accuracy when working with large volumes of financial data under tight deadlines?"),
    open("attitude", "Describe a time you identified a financial risk and how you communicated it to stakeholders."),
  ],

  hr: [
    mcq("knowledge", "What is the primary purpose of an employee onboarding program?",
      ["To evaluate existing employees", "To integrate new hires into the company culture and role", "To conduct performance reviews", "To manage payroll processing"],
      "b"),
    mcq("knowledge", "Which employment law concept requires equal pay for equal work regardless of gender?",
      ["FMLA", "Equal Pay Act", "OSHA", "FLSA"],
      "b"),
    mcq("knowledge", "What does KPI stand for in HR performance management?",
      ["Key Personnel Information", "Key Performance Indicator", "Knowledge and Productivity Index", "Key Position Inventory"],
      "b"),
    mcq("knowledge", "What is talent acquisition primarily focused on?",
      ["Training existing employees", "Managing employee benefits", "Attracting and hiring qualified candidates", "Handling employee grievances"],
      "c"),
    open("attitude", "How do you handle a situation where a manager and an employee have a conflict you need to mediate?"),
    open("attitude", "Describe how you have built or improved company culture in a previous role."),
  ],

  manager: [
    mcq("knowledge", "Which leadership style involves the leader making decisions with minimal team input?",
      ["Democratic", "Transformational", "Autocratic", "Laissez-faire"],
      "c"),
    mcq("knowledge", "What is the primary purpose of a performance improvement plan (PIP)?",
      ["To document grounds for immediate termination", "To provide a structured path for an underperforming employee to improve", "To reward high-performing employees", "To redistribute team workload"],
      "b"),
    mcq("knowledge", "Which project management framework uses sprints and daily standups?",
      ["Waterfall", "PRINCE2", "Agile / Scrum", "Six Sigma"],
      "c"),
    mcq("knowledge", "What does delegation primarily help a manager achieve?",
      ["Avoiding responsibility", "Reducing team size", "Empowering team members while freeing time for strategic work", "Cutting operational costs"],
      "c"),
    open("attitude", "Tell us about a time you had to give difficult feedback to a team member. How did you approach it?"),
    open("attitude", "How do you prioritize competing demands from multiple stakeholders?"),
  ],
};

// ─── Generic fallback bank ────────────────────────────────────────────────────

const genericKnowledge: Question[] = [
  mcq("knowledge", "Which of the following best describes a key responsibility in this role?",
    ["Managing unrelated departments", "Delivering high-quality work aligned with team goals", "Avoiding collaboration with colleagues", "Delegating all tasks without oversight"],
    "b"),
  mcq("knowledge", "What is the most effective approach when facing an unfamiliar problem at work?",
    ["Ignore it until it escalates", "Research, consult colleagues, and propose a solution", "Pass it on to another team immediately", "Wait for a manager to notice"],
    "b"),
  mcq("knowledge", "Which tool is most associated with professional project tracking?",
    ["Microsoft Paint", "Jira / Trello / Asana", "Notepad", "Calculator"],
    "b"),
  mcq("knowledge", "What does 'stakeholder management' involve?",
    ["Managing company stock", "Identifying and communicating with people affected by or invested in a project", "Handling customer complaints only", "Preparing financial forecasts"],
    "b"),
];

const genericAttitude: Question[] = [
  open("attitude", "Describe a situation where you had to adapt quickly to a significant change at work. What did you do?"),
  open("attitude", "How do you manage your workload when multiple urgent tasks arise at the same time?"),
  open("attitude", "Tell us about a time you worked in a team that faced conflict. What was your role in resolving it?"),
  open("attitude", "What motivates you to perform at your best, and how do you maintain that motivation during challenging periods?"),
];

// ─── Role detector ────────────────────────────────────────────────────────────

function detectRole(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  if (/\b(software|engineer|developer|backend|frontend|full.?stack|devops|sre|data|ml|ai|cloud|mobile|ios|android|qa|test)\b/.test(text)) return "software";
  if (/\b(design|ux|ui|product design|graphic|visual|brand|figma|prototype)\b/.test(text)) return "design";
  if (/\b(marketing|seo|content|social media|growth|brand|campaign|digital|pr|communications)\b/.test(text)) return "marketing";
  if (/\b(sales|account executive|business development|bdm|bdr|sdr|revenue|closing)\b/.test(text)) return "sales";
  if (/\b(finance|accounting|financial|analyst|cfo|budget|audit|tax|treasury|bookkeep)\b/.test(text)) return "finance";
  if (/\b(hr|human resources|talent|recruit|people ops|payroll|compensation|l&d|learning)\b/.test(text)) return "hr";
  if (/\b(manager|director|lead|head of|vp|chief|coo|cto|team lead|supervisor)\b/.test(text)) return "manager";
  return "generic";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateQuestions(roleTitle: string, roleDescription: string): Question[] {
  const roleType = detectRole(roleTitle, roleDescription);

  let pool: Question[];
  if (roleType === "generic") {
    pool = [...genericKnowledge, ...genericAttitude];
  } else {
    pool = banks[roleType];
  }

  // Shuffle then pick 4 knowledge + 2 attitude (or best available mix)
  const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

  const knowledge = shuffle(pool.filter((q) => q.section === "knowledge")).slice(0, 3);
  const attitude = shuffle(pool.filter((q) => q.section === "attitude")).slice(0, 3);

  return [...knowledge, ...attitude];
}
