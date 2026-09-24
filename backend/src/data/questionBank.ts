export interface SeedQuestion {
  id: string;
  field: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TopicDef {
  topic: string;
  triggerSkills: string[];
}

export const FIELD_TOPICS: Record<string, TopicDef[]> = {
  "Software Engineering": [
    {
      topic: "System Design",
      triggerSkills: [
        "system design",
        "microservices",
        "distributed systems",
        "architecture",
        "scalability",
      ],
    },
    {
      topic: "SQL & Databases",
      triggerSkills: ["sql", "postgres", "postgresql", "mysql", "database", "nosql"],
    },
    {
      topic: "Web Development",
      triggerSkills: [
        "react",
        "javascript",
        "typescript",
        "frontend",
        "node.js",
        "rest apis",
      ],
    },
  ],
  "Data Science": [
    {
      topic: "Machine Learning",
      triggerSkills: [
        "machine learning",
        "scikit-learn",
        "tensorflow",
        "pytorch",
        "deep learning",
      ],
    },
    {
      topic: "Statistics & Analysis",
      triggerSkills: ["statistics", "a/b testing", "regression", "classification"],
    },
    {
      topic: "Data Tools",
      triggerSkills: ["python", "pandas", "numpy", "sql", "data visualization"],
    },
  ],
  "DevOps / Site Reliability": [
    {
      topic: "Containers & Orchestration",
      triggerSkills: ["docker", "kubernetes", "helm"],
    },
    {
      topic: "CI/CD & Infrastructure",
      triggerSkills: [
        "ci/cd",
        "terraform",
        "jenkins",
        "ansible",
        "infrastructure as code",
        "aws",
        "azure",
        "gcp",
      ],
    },
    {
      topic: "Monitoring & Reliability",
      triggerSkills: [
        "monitoring",
        "prometheus",
        "grafana",
        "incident response",
        "site reliability",
      ],
    },
  ],
  "Product Management": [
    {
      topic: "Product Strategy",
      triggerSkills: ["product strategy", "product roadmap", "go-to-market"],
    },
    {
      topic: "Metrics & Analytics",
      triggerSkills: ["kpis", "product analytics", "a/b testing", "market analysis"],
    },
    {
      topic: "Agile & Execution",
      triggerSkills: ["agile", "scrum", "backlog prioritization", "stakeholder management"],
    },
  ],
  Marketing: [
    {
      topic: "SEO & Content",
      triggerSkills: ["seo", "content marketing", "copywriting"],
    },
    {
      topic: "Analytics & Campaigns",
      triggerSkills: ["google analytics", "campaign management", "ppc", "conversion optimization"],
    },
    {
      topic: "Brand & Growth",
      triggerSkills: ["brand strategy", "growth marketing", "social media", "email marketing"],
    },
  ],
  "UX/UI Design": [
    {
      topic: "Design Process & Research",
      triggerSkills: ["user research", "usability testing", "user personas"],
    },
    {
      topic: "Prototyping & Tools",
      triggerSkills: ["figma", "sketch", "prototyping", "wireframing", "adobe xd"],
    },
    {
      topic: "Systems & Accessibility",
      triggerSkills: ["design systems", "accessibility", "interaction design"],
    },
  ],
};

export const QUESTION_BANK: SeedQuestion[] = [
  // ---- Software Engineering: System Design ----
  {
    id: "se-sd-1",
    field: "Software Engineering",
    topic: "System Design",
    question: "What's the main tradeoff of adding a read replica to a Postgres database?",
    options: [
      "Eventual consistency between primary and replica",
      "Increased write latency on the primary",
      "Loss of ACID guarantees entirely",
      "No indexing support on replicas",
    ],
    correctIndex: 0,
  },
  {
    id: "se-sd-2",
    field: "Software Engineering",
    topic: "System Design",
    question: "Which caching strategy writes to the cache and the database at the same time?",
    options: ["Write-behind", "Write-through", "Cache-aside", "Read-through"],
    correctIndex: 1,
  },
  {
    id: "se-sd-3",
    field: "Software Engineering",
    topic: "System Design",
    question: "In a microservices architecture, what does a circuit breaker primarily protect against?",
    options: [
      "SQL injection attacks",
      "Cascading failures from a failing downstream service",
      "Slow database migrations",
      "Frontend bundle size bloat",
    ],
    correctIndex: 1,
  },
  {
    id: "se-sd-4",
    field: "Software Engineering",
    topic: "System Design",
    question: "What is the primary purpose of a message queue (e.g. Kafka, RabbitMQ) between two services?",
    options: [
      "To decouple producers and consumers and buffer load",
      "To replace a relational database entirely",
      "To enforce strict type checking between services",
      "To compress network traffic",
    ],
    correctIndex: 0,
  },
  // ---- Software Engineering: SQL & Databases ----
  {
    id: "se-sql-1",
    field: "Software Engineering",
    topic: "SQL & Databases",
    question: "Which SQL join returns only rows with matching values in both tables?",
    options: ["LEFT JOIN", "INNER JOIN", "FULL OUTER JOIN", "CROSS JOIN"],
    correctIndex: 1,
  },
  {
    id: "se-sql-2",
    field: "Software Engineering",
    topic: "SQL & Databases",
    question: "What's the main benefit of adding an index to a frequently-queried column?",
    options: [
      "It reduces disk usage",
      "It speeds up read queries at the cost of slower writes",
      "It enforces uniqueness automatically",
      "It removes the need for a primary key",
    ],
    correctIndex: 1,
  },
  {
    id: "se-sql-3",
    field: "Software Engineering",
    topic: "SQL & Databases",
    question: "Which of these best describes database normalization?",
    options: [
      "Compressing tables to save disk space",
      "Organizing data to reduce redundancy and improve integrity",
      "Converting SQL to NoSQL",
      "Encrypting sensitive columns",
    ],
    correctIndex: 1,
  },
  {
    id: "se-sql-4",
    field: "Software Engineering",
    topic: "SQL & Databases",
    question: "What isolation level prevents dirty reads but still allows non-repeatable reads?",
    options: ["Read Uncommitted", "Read Committed", "Serializable", "Snapshot"],
    correctIndex: 1,
  },
  // ---- Software Engineering: Web Development ----
  {
    id: "se-web-1",
    field: "Software Engineering",
    topic: "Web Development",
    question: "In React, what triggers a component to re-render?",
    options: [
      "Only prop changes",
      "A change in state or props (or context it consumes)",
      "Only calling forceUpdate",
      "Only a page reload",
    ],
    correctIndex: 1,
  },
  {
    id: "se-web-2",
    field: "Software Engineering",
    topic: "Web Development",
    question: "What's the main purpose of the `useEffect` hook in React?",
    options: [
      "To define component styles",
      "To perform side effects after render (data fetching, subscriptions, etc.)",
      "To create new components dynamically",
      "To manage routing between pages",
    ],
    correctIndex: 1,
  },
  {
    id: "se-web-3",
    field: "Software Engineering",
    topic: "Web Development",
    question: "Which HTTP status code indicates a successful resource creation via a REST API?",
    options: ["200 OK", "201 Created", "204 No Content", "301 Moved Permanently"],
    correctIndex: 1,
  },
  {
    id: "se-web-4",
    field: "Software Engineering",
    topic: "Web Development",
    question: "What does CORS primarily control?",
    options: [
      "Which browsers can render a page",
      "Which origins a server allows to make cross-origin requests to it",
      "How JavaScript is minified",
      "Database connection pooling",
    ],
    correctIndex: 1,
  },

  // ---- Data Science: Machine Learning ----
  {
    id: "ds-ml-1",
    field: "Data Science",
    topic: "Machine Learning",
    question: "What does overfitting mean in a machine learning model?",
    options: [
      "The model performs well on training data but poorly on unseen data",
      "The model trains too slowly",
      "The model uses too few features",
      "The model can't converge at all",
    ],
    correctIndex: 0,
  },
  {
    id: "ds-ml-2",
    field: "Data Science",
    topic: "Machine Learning",
    question: "Which technique is commonly used to reduce overfitting in neural networks?",
    options: ["Increasing learning rate", "Dropout", "Removing all hidden layers", "Using a smaller dataset"],
    correctIndex: 1,
  },
  {
    id: "ds-ml-3",
    field: "Data Science",
    topic: "Machine Learning",
    question: "What is the purpose of a validation set during model training?",
    options: [
      "To train the final production model",
      "To tune hyperparameters and check generalization without touching the test set",
      "To store raw unprocessed data",
      "To replace the need for a test set",
    ],
    correctIndex: 1,
  },
  {
    id: "ds-ml-4",
    field: "Data Science",
    topic: "Machine Learning",
    question: "In a classification problem with imbalanced classes, which metric is usually more informative than accuracy?",
    options: ["Mean squared error", "F1 score", "R-squared", "Learning rate"],
    correctIndex: 1,
  },
  // ---- Data Science: Statistics & Analysis ----
  {
    id: "ds-stat-1",
    field: "Data Science",
    topic: "Statistics & Analysis",
    question: "What does a p-value of 0.03 typically suggest in a hypothesis test at alpha = 0.05?",
    options: [
      "The null hypothesis is definitely true",
      "The result is statistically significant at the 0.05 threshold",
      "The sample size was too small",
      "The effect size is exactly 3%",
    ],
    correctIndex: 1,
  },
  {
    id: "ds-stat-2",
    field: "Data Science",
    topic: "Statistics & Analysis",
    question: "In an A/B test, what is a Type I error?",
    options: [
      "Failing to detect a real effect",
      "Concluding there's an effect when there isn't one",
      "Using too large a sample size",
      "Running the test for too long",
    ],
    correctIndex: 1,
  },
  {
    id: "ds-stat-3",
    field: "Data Science",
    topic: "Statistics & Analysis",
    question: "Which measure of central tendency is most robust to outliers?",
    options: ["Mean", "Median", "Range", "Standard deviation"],
    correctIndex: 1,
  },
  {
    id: "ds-stat-4",
    field: "Data Science",
    topic: "Statistics & Analysis",
    question: "What does correlation between two variables NOT imply?",
    options: ["Association", "A linear relationship", "Causation", "That both vary together"],
    correctIndex: 2,
  },
  // ---- Data Science: Data Tools ----
  {
    id: "ds-tool-1",
    field: "Data Science",
    topic: "Data Tools",
    question: "In pandas, which method would you use to handle missing values by filling them with a specific value?",
    options: ["dropna()", "fillna()", "isna()", "concat()"],
    correctIndex: 1,
  },
  {
    id: "ds-tool-2",
    field: "Data Science",
    topic: "Data Tools",
    question: "What is the primary advantage of using NumPy arrays over Python lists for numerical data?",
    options: [
      "They support mixed data types more easily",
      "Vectorized operations are much faster and more memory-efficient",
      "They automatically visualize data",
      "They can't be indexed",
    ],
    correctIndex: 1,
  },
  {
    id: "ds-tool-3",
    field: "Data Science",
    topic: "Data Tools",
    question: "Which chart type is best suited for showing the distribution of a single continuous variable?",
    options: ["Pie chart", "Histogram", "Scatter plot", "Bar chart of categories"],
    correctIndex: 1,
  },

  // ---- DevOps: Containers & Orchestration ----
  {
    id: "do-cont-1",
    field: "DevOps / Site Reliability",
    topic: "Containers & Orchestration",
    question: "What is the main difference between a Docker image and a Docker container?",
    options: [
      "An image is a running instance; a container is the blueprint",
      "A container is a running instance of an image",
      "They are the same thing",
      "Images only work on Linux, containers only on Windows",
    ],
    correctIndex: 1,
  },
  {
    id: "do-cont-2",
    field: "DevOps / Site Reliability",
    topic: "Containers & Orchestration",
    question: "In Kubernetes, what is the smallest deployable unit?",
    options: ["A Node", "A Pod", "A Deployment", "A Service"],
    correctIndex: 1,
  },
  {
    id: "do-cont-3",
    field: "DevOps / Site Reliability",
    topic: "Containers & Orchestration",
    question: "What does a Kubernetes Horizontal Pod Autoscaler do?",
    options: [
      "Automatically scales the number of pod replicas based on metrics like CPU usage",
      "Increases the memory limit of a single pod",
      "Automatically patches container vulnerabilities",
      "Balances traffic between clusters",
    ],
    correctIndex: 0,
  },
  // ---- DevOps: CI/CD & Infrastructure ----
  {
    id: "do-cicd-1",
    field: "DevOps / Site Reliability",
    topic: "CI/CD & Infrastructure",
    question: "What is the main benefit of Infrastructure as Code (e.g. Terraform)?",
    options: [
      "It eliminates the need for cloud providers",
      "Infrastructure changes become versioned, repeatable, and reviewable",
      "It automatically writes application code",
      "It only works for on-premise servers",
    ],
    correctIndex: 1,
  },
  {
    id: "do-cicd-2",
    field: "DevOps / Site Reliability",
    topic: "CI/CD & Infrastructure",
    question: "In a CI/CD pipeline, what is the purpose of a staging environment?",
    options: [
      "To serve production traffic",
      "To test changes in a production-like setting before release",
      "To store source code backups",
      "To replace the need for testing entirely",
    ],
    correctIndex: 1,
  },
  {
    id: "do-cicd-3",
    field: "DevOps / Site Reliability",
    topic: "CI/CD & Infrastructure",
    question: "What is a blue-green deployment strategy primarily used for?",
    options: [
      "Color-coding logs by severity",
      "Reducing downtime and risk by switching traffic between two identical environments",
      "Compressing container images",
      "Load testing a single server",
    ],
    correctIndex: 1,
  },
  // ---- DevOps: Monitoring & Reliability ----
  {
    id: "do-mon-1",
    field: "DevOps / Site Reliability",
    topic: "Monitoring & Reliability",
    question: "What does an SLA typically define?",
    options: [
      "The internal architecture of a service",
      "A formal commitment to a level of service (e.g. uptime, response time)",
      "The programming language used",
      "The team's on-call rotation schedule",
    ],
    correctIndex: 1,
  },
  {
    id: "do-mon-2",
    field: "DevOps / Site Reliability",
    topic: "Monitoring & Reliability",
    question: "What is the purpose of a postmortem after a production incident?",
    options: [
      "To assign individual blame",
      "To understand root cause and prevent recurrence without blame",
      "To delete logs related to the incident",
      "To immediately roll back all recent deployments",
    ],
    correctIndex: 1,
  },
  {
    id: "do-mon-3",
    field: "DevOps / Site Reliability",
    topic: "Monitoring & Reliability",
    question: "In observability, what distinguishes a metric from a log?",
    options: [
      "Metrics are numeric time-series data; logs are discrete event records",
      "Logs are always faster to query than metrics",
      "Metrics can only be viewed in real time",
      "There is no meaningful difference",
    ],
    correctIndex: 0,
  },

  // ---- Product Management: Product Strategy ----
  {
    id: "pm-strat-1",
    field: "Product Management",
    topic: "Product Strategy",
    question: "What is the primary purpose of a product roadmap?",
    options: [
      "To list every engineering ticket in detail",
      "To communicate the direction and priorities of a product over time",
      "To replace the need for user research",
      "To document API specifications",
    ],
    correctIndex: 1,
  },
  {
    id: "pm-strat-2",
    field: "Product Management",
    topic: "Product Strategy",
    question: "What does a 'minimum viable product' (MVP) primarily aim to test?",
    options: [
      "The maximum feature set possible",
      "Core assumptions with the least effort before investing further",
      "The final production-quality UI",
      "Whether the engineering team can meet deadlines",
    ],
    correctIndex: 1,
  },
  {
    id: "pm-strat-3",
    field: "Product Management",
    topic: "Product Strategy",
    question: "What is a common purpose of a competitive analysis in product strategy?",
    options: [
      "To copy competitor features exactly",
      "To identify market gaps and differentiate positioning",
      "To set engineering sprint velocity",
      "To determine server infrastructure needs",
    ],
    correctIndex: 1,
  },
  // ---- Product Management: Metrics & Analytics ----
  {
    id: "pm-metric-1",
    field: "Product Management",
    topic: "Metrics & Analytics",
    question: "What does a 'North Star metric' typically represent for a product?",
    options: [
      "A vanity metric with no real meaning",
      "The single metric that best captures the core value delivered to customers",
      "The company's total revenue only",
      "The number of engineers on the team",
    ],
    correctIndex: 1,
  },
  {
    id: "pm-metric-2",
    field: "Product Management",
    topic: "Metrics & Analytics",
    question: "What is 'churn rate' a measure of?",
    options: [
      "The percentage of customers who stop using a product over a given period",
      "The speed of feature releases",
      "The number of new sign-ups per day",
      "Server uptime percentage",
    ],
    correctIndex: 0,
  },
  {
    id: "pm-metric-3",
    field: "Product Management",
    topic: "Metrics & Analytics",
    question: "In an A/B test for a new feature, what's the risk of stopping the test too early?",
    options: [
      "None, early results are always reliable",
      "You may draw conclusions from statistically insignificant or noisy results",
      "The test becomes too expensive to run",
      "Users will be permanently affected",
    ],
    correctIndex: 1,
  },
  // ---- Product Management: Agile & Execution ----
  {
    id: "pm-agile-1",
    field: "Product Management",
    topic: "Agile & Execution",
    question: "In Scrum, what is the primary purpose of a sprint retrospective?",
    options: [
      "To plan the next sprint's backlog",
      "To reflect on what went well and what to improve as a team",
      "To demo completed work to stakeholders",
      "To estimate story points",
    ],
    correctIndex: 1,
  },
  {
    id: "pm-agile-2",
    field: "Product Management",
    topic: "Agile & Execution",
    question: "What does 'backlog grooming' (refinement) typically involve?",
    options: [
      "Deleting all low-priority items permanently",
      "Reviewing, clarifying, and prioritizing upcoming backlog items",
      "Writing production code",
      "Running the daily standup",
    ],
    correctIndex: 1,
  },
  {
    id: "pm-agile-3",
    field: "Product Management",
    topic: "Agile & Execution",
    question: "What is a key difference between Kanban and Scrum?",
    options: [
      "Kanban uses continuous flow without fixed sprints; Scrum uses fixed-length sprints",
      "Scrum has no roles at all",
      "Kanban requires daily standups by definition",
      "They are identical frameworks",
    ],
    correctIndex: 0,
  },

  // ---- Marketing: SEO & Content ----
  {
    id: "mk-seo-1",
    field: "Marketing",
    topic: "SEO & Content",
    question: "What does 'domain authority' generally attempt to predict?",
    options: [
      "A website's exact monthly revenue",
      "How well a domain is likely to rank in search engine results",
      "The number of employees at a company",
      "Server response time",
    ],
    correctIndex: 1,
  },
  {
    id: "mk-seo-2",
    field: "Marketing",
    topic: "SEO & Content",
    question: "What is the primary purpose of a meta description tag?",
    options: [
      "To improve page load speed",
      "To summarize page content for search results and improve click-through rate",
      "To store analytics tracking codes",
      "To define the page's color scheme",
    ],
    correctIndex: 1,
  },
  {
    id: "mk-seo-3",
    field: "Marketing",
    topic: "SEO & Content",
    question: "What distinguishes a backlink from an internal link?",
    options: [
      "A backlink comes from an external site; an internal link connects pages on the same site",
      "Backlinks are always paid placements",
      "Internal links only work on mobile",
      "There is no difference",
    ],
    correctIndex: 0,
  },
  // ---- Marketing: Analytics & Campaigns ----
  {
    id: "mk-an-1",
    field: "Marketing",
    topic: "Analytics & Campaigns",
    question: "What does 'conversion rate' measure in a marketing campaign?",
    options: [
      "The total number of website visitors",
      "The percentage of visitors who complete a desired action",
      "The cost of running ads per day",
      "The number of social media followers",
    ],
    correctIndex: 1,
  },
  {
    id: "mk-an-2",
    field: "Marketing",
    topic: "Analytics & Campaigns",
    question: "In PPC advertising, what does CPC stand for?",
    options: ["Cost Per Click", "Content Publishing Cycle", "Customer Purchase Confirmation", "Campaign Performance Chart"],
    correctIndex: 0,
  },
  {
    id: "mk-an-3",
    field: "Marketing",
    topic: "Analytics & Campaigns",
    question: "What is the purpose of UTM parameters in a marketing URL?",
    options: [
      "To encrypt the destination page",
      "To track the source, medium, and campaign driving traffic",
      "To shorten the URL length",
      "To block bot traffic",
    ],
    correctIndex: 1,
  },
  // ---- Marketing: Brand & Growth ----
  {
    id: "mk-brand-1",
    field: "Marketing",
    topic: "Brand & Growth",
    question: "What does 'brand positioning' primarily define?",
    options: [
      "The physical location of company offices",
      "How a brand is perceived relative to competitors in customers' minds",
      "The company's legal structure",
      "The engineering tech stack",
    ],
    correctIndex: 1,
  },
  {
    id: "mk-brand-2",
    field: "Marketing",
    topic: "Brand & Growth",
    question: "What is a common goal of a growth marketing loop (e.g. referral program)?",
    options: [
      "To create a one-time viral spike with no lasting effect",
      "To create a repeatable, self-reinforcing acquisition channel",
      "To reduce product quality for faster shipping",
      "To eliminate the need for paid advertising entirely",
    ],
    correctIndex: 1,
  },
  {
    id: "mk-brand-3",
    field: "Marketing",
    topic: "Brand & Growth",
    question: "What does 'segmentation' mean in email marketing?",
    options: [
      "Sending the exact same email to every subscriber",
      "Dividing an audience into groups based on shared traits to target messaging",
      "Deleting inactive subscribers automatically",
      "Encrypting email content",
    ],
    correctIndex: 1,
  },

  // ---- UX/UI Design: Design Process & Research ----
  {
    id: "ux-res-1",
    field: "UX/UI Design",
    topic: "Design Process & Research",
    question: "What is the main purpose of a usability test?",
    options: [
      "To check server performance",
      "To observe real users completing tasks and identify friction points",
      "To finalize brand colors",
      "To write marketing copy",
    ],
    correctIndex: 1,
  },
  {
    id: "ux-res-2",
    field: "UX/UI Design",
    topic: "Design Process & Research",
    question: "What is a 'persona' in UX design?",
    options: [
      "A real named customer contract",
      "A fictional archetype representing a segment of target users",
      "A type of wireframe tool",
      "A legal disclaimer on a website",
    ],
    correctIndex: 1,
  },
  {
    id: "ux-res-3",
    field: "UX/UI Design",
    topic: "Design Process & Research",
    question: "What does 'information architecture' primarily deal with?",
    options: [
      "Server database schemas",
      "Organizing and structuring content so users can find things intuitively",
      "The color palette of an app",
      "Backend API design",
    ],
    correctIndex: 1,
  },
  // ---- UX/UI Design: Prototyping & Tools ----
  {
    id: "ux-proto-1",
    field: "UX/UI Design",
    topic: "Prototyping & Tools",
    question: "What is the main difference between a low-fidelity and high-fidelity prototype?",
    options: [
      "Low-fidelity is always built in code; high-fidelity is always paper",
      "Low-fidelity is a rough, quick representation; high-fidelity closely resembles the final product",
      "There is no meaningful difference",
      "High-fidelity prototypes can't be tested with users",
    ],
    correctIndex: 1,
  },
  {
    id: "ux-proto-2",
    field: "UX/UI Design",
    topic: "Prototyping & Tools",
    question: "In Figma, what is a 'component' primarily used for?",
    options: [
      "Writing backend logic",
      "Creating a reusable design element that stays in sync across instances",
      "Hosting the final website",
      "Running automated tests",
    ],
    correctIndex: 1,
  },
  {
    id: "ux-proto-3",
    field: "UX/UI Design",
    topic: "Prototyping & Tools",
    question: "What is the purpose of a wireframe in the design process?",
    options: [
      "To finalize pixel-perfect visual design",
      "To outline layout and structure before visual design begins",
      "To write the production codebase",
      "To measure page load speed",
    ],
    correctIndex: 1,
  },
  // ---- UX/UI Design: Systems & Accessibility ----
  {
    id: "ux-sys-1",
    field: "UX/UI Design",
    topic: "Systems & Accessibility",
    question: "What is the primary benefit of a design system?",
    options: [
      "It replaces the need for developers",
      "It ensures visual and interaction consistency across a product at scale",
      "It only matters for marketing sites",
      "It eliminates the need for user testing",
    ],
    correctIndex: 1,
  },
  {
    id: "ux-sys-2",
    field: "UX/UI Design",
    topic: "Systems & Accessibility",
    question: "What does WCAG contrast ratio guidance primarily help ensure?",
    options: [
      "Faster page load times",
      "Text is readable for users with low vision or color blindness",
      "Smaller file sizes",
      "Better SEO rankings",
    ],
    correctIndex: 1,
  },
  {
    id: "ux-sys-3",
    field: "UX/UI Design",
    topic: "Systems & Accessibility",
    question: "Why is keyboard navigability important for accessibility?",
    options: [
      "It's only relevant for gaming interfaces",
      "Many users with motor or visual impairments rely on keyboards instead of a mouse",
      "It reduces server load",
      "It's a legal requirement only in one country",
    ],
    correctIndex: 1,
  },
];
