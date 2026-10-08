// AI for Educational Leadership: lesson content for principals, heads and owners.
export default [
  /* Module 1: Foundations and prompting */
  [
    {
      min: 13,
      goals: ['Explain generative AI to staff and governors in plain words', 'Identify where it fails and why', 'Decide where leaders should and should not rely on it'],
      slides: [
        ["What leaders need to know", "Generative AI produces text, images and analysis by predicting likely output from patterns in huge datasets. For leaders, the key point is that it is fast and fluent, but not automatically accurate, fair or private.", ['Fast and fluent', 'Not automatically accurate', 'Not automatically fair or private']],
        ["Where it fails", "It can invent facts and sources, misread numbers, reflect bias, and lack knowledge of your institution, recent regulations or local context.", ['Invented facts and sources', 'Number and bias errors', 'No knowledge of your context']],
        ["Where leaders gain most", "Drafting communications, summarising long documents, analysing anonymised data, preparing presentations and exploring options. All with a human check before anything goes out.", ['Drafting and summarising', 'Analysing anonymised data', 'Human check before release']],
        ["Leadership responsibility", "Decisions about people, admissions, discipline and finance remain human decisions. AI can inform them, but a named person must own each decision.", ['Humans own decisions', 'AI informs, not decides', 'Named accountability']],
      ],
      read: [
        ['A one-paragraph explanation for staff', "‘Generative AI tools like Gemini and ChatGPT write and analyse by predicting likely output. They save time on drafts and summaries, but they make mistakes and can reflect bias. We use them as assistants: staff check everything, protect personal data, and stay responsible for decisions.’"],
        ['Typical failure examples', "- Quoting a government circular that does not exist.\n- Miscounting rows in a pasted table.\n- Suggesting job criteria that disadvantage some groups.\n- Giving outdated regulatory information."],
        ['Your stance as a leader', "Model careful, transparent use. Share how you use AI, what you check, and what you never do. Staff follow what leaders do more than what they say."],
      ],
      ex: ['Example: the non-existent circular', "A vice-principal asked a chatbot about a board rule and received a confident answer citing a circular number. The board website showed no such circular. The school added ‘verify regulatory claims at the source’ to its staff AI guidelines."],
      try: ['Write your own one-paragraph explanation of AI for staff.', 'List three leadership tasks where AI could help and two where it must not decide.', 'Ask a chatbot about one regulation you know well and check its accuracy.'],
      keys: ['AI is fast and fluent, not automatically right.', 'Leaders gain most in drafting, summarising and analysis.', 'Named humans own decisions.'],
      quiz: [
        ['Which decision should remain a human decision?', ['Drafting a newsletter', 'Choosing which teacher to hire', 'Summarising a circular', 'Formatting a timetable'], 1, 'People decisions need human accountability.'],
        ['A chatbot cites a regulation. You should:', ['Act on it', 'Verify it at the official source', 'Forward it to staff', 'Ignore all regulations'], 1, 'Regulatory claims must be checked.'],
      ],
    },
    {
      min: 13,
      goals: ['Use prompting frameworks for analysis and drafting', 'Ask AI to show reasoning and assumptions', 'Build a leadership prompt library'],
      slides: [
        ["Prompts for leaders", "Leaders use AI for analysis and decisions, so prompts need more structure than for simple drafts. Two frameworks help: role–context–task–format for drafting, and question–data–criteria–output for analysis.", ['Drafting: role, context, task, format', 'Analysis: question, data, criteria, output', 'Structure improves quality']],
        ["Drafting prompts", "Specify your role, audience, purpose, key points, tone and length. For example, a parent letter about a fee change needs a clear reason, dates and a respectful tone.", ['Audience and purpose', 'Key points and tone', 'Length and format']],
        ["Analysis prompts", "State the question, provide anonymised data, name the criteria for judgement, and specify the output, such as a table of options with pros, cons and risks.", ['Clear question', 'Anonymised data', 'Criteria and output table']],
        ["Ask for assumptions", "Ask the AI to list its assumptions and what information is missing. This exposes weak reasoning before you rely on it.", ['List assumptions', 'Identify missing information', 'Challenge weak reasoning']],
      ],
      read: [
        ['An analysis prompt', "‘Question: should we move Class 9–10 to a 7:45 start? Data: [anonymised attendance and bus times]. Criteria: student wellbeing, attendance, staff workload, transport cost. Output: a table of two options with pros, cons, risks and missing information. List your assumptions.’"],
        ['Devil’s advocate', "Follow up with: ‘Argue against your recommendation as a sceptical parent, a teacher and a finance officer.’ This surfaces objections you will hear later."],
        ['Building a library', "Keep tested prompts in a shared leadership Doc: parent letters, staff circulars, data summaries, meeting agendas, and option analyses."],
      ],
      ex: ['Example: the start-time decision', "A principal used an analysis prompt with anonymised attendance data. The AI’s list of assumptions revealed it had ignored bus routes. Adding transport data changed the recommendation, and the final decision was discussed with staff using the table."],
      try: ['Write one drafting and one analysis prompt for a real issue.', 'Ask for assumptions and missing information.', 'Run a devil’s-advocate follow-up.'],
      keys: ['Use structured prompts for analysis.', 'Always ask for assumptions and gaps.', 'Use devil’s-advocate prompts to test decisions.'],
      quiz: [
        ['Why ask AI to list its assumptions?', ['To make output longer', 'To expose weak or missing reasoning', 'It is required', 'To impress staff'], 1, 'Assumptions reveal gaps.'],
        ['In an analysis prompt, data should be:', ['Full student records', 'Anonymised', 'Made up', 'Left out'], 1, 'Protect personal data.'],
      ],
    },
    {
      min: 12,
      goals: ['Evaluate AI tools for institutional use', 'Compare plans, privacy and integration', 'Create an approved-tools list'],
      slides: [
        ["Choosing for an institution", "Choosing AI tools for a school is different from choosing for yourself. You need data protection, admin control, budget fit and support for many users.", ['Data protection', 'Admin control', 'Budget and support']],
        ["Ecosystem first", "If your school runs on Google Workspace, Gemini’s education offering integrates naturally; if on Microsoft 365, Copilot does. Fitting the existing ecosystem reduces training and risk.", ['Google Workspace and Gemini', 'Microsoft 365 and Copilot', 'Less training, less risk']],
        ["Evaluation criteria", "Assess: data use and storage, age and consent rules, admin controls, accessibility, language support, cost per user, and evidence of value.", ['Data use and storage', 'Age, consent and admin controls', 'Cost and evidence']],
        ["An approved-tools list", "Publish a short list of approved tools, what each may be used for, and by whom. Review it each term. Staff then know what is safe.", ['Short approved list', 'Uses and users', 'Review each term']],
      ],
      read: [
        ['Questions for vendors', "- Is our data used to train your models?\n- Where is data stored and for how long?\n- Do you support education terms and parental consent?\n- What admin controls and audit logs exist?\n- What does it cost per user, and what happens at renewal?"],
        ['Free versus education plans', "Free consumer accounts are convenient but may have different data terms. Education or enterprise plans usually offer stronger protections and admin control. Check current terms for each product."],
        ['Sample approved-tools table', "Tool | Approved use | Users | Data allowed. For example: Gemini (school accounts) | drafting, summarising | staff | no student personal data."],
      ],
      ex: ['Example: one list, less confusion', "A school with staff using eight different chatbots on personal accounts published a three-tool approved list with a one-page guide. Within a month most staff used the approved tools, and data concerns dropped."],
      try: ['List the AI tools staff currently use.', 'Evaluate one against the criteria and vendor questions.', 'Draft a three-row approved-tools table.'],
      keys: ['Institutional choice needs data protection and admin control.', 'Fit your existing ecosystem.', 'Publish and review an approved-tools list.'],
      quiz: [
        ['A key question for an AI vendor is:', ['What colour is the logo?', 'Is our data used to train your models?', 'How many emojis are supported?', 'Who is the CEO?'], 1, 'Data use is critical for schools.'],
        ['An approved-tools list should state:', ['Only tool names', 'Approved uses, users and data rules', 'Staff salaries', 'Nothing'], 1, 'Clarity makes safe use easy.'],
      ],
    },
  ],

  /* Module 2: Strategy and readiness */
  [
    {
      min: 13,
      goals: ['Audit current processes and pain points', 'Map where time and errors occur', 'Prioritise areas for AI support'],
      slides: [
        ["Start with problems", "AI strategy should start from your institution’s real problems, not from tools. An audit finds where staff lose time, where errors happen, and where communication fails.", ['Problems before tools', 'Time, errors, communication', 'Evidence-based']],
        ["Gather evidence", "Use a short staff survey, conversations with office and academic teams, and simple time logs for one week. Ask: what repetitive task takes most of your time?", ['Staff survey', 'Team conversations', 'One-week time logs']],
        ["Map the processes", "For key processes such as admissions, timetabling, report cards and parent communication, list the steps, who does them, time taken and common errors.", ['Steps and owners', 'Time taken', 'Common errors']],
        ["Prioritise", "Score each pain point on impact, frequency and feasibility. High-impact, frequent, feasible tasks become your first candidates.", ['Impact', 'Frequency', 'Feasibility']],
      ],
      read: [
        ['Survey questions', "- Which three tasks take most of your non-teaching time?\n- Which tasks feel repetitive?\n- Where do errors or rework happen most?\n- What would you do with two extra hours a week?"],
        ['A prioritisation matrix', "Create a Sheet with columns: process, pain point, hours per month, number of staff affected, risk if automated, feasibility (1–5). Sort by hours and feasibility."],
        ['Involving staff', "Share audit results openly. When staff see their pain points recognised, they support the changes that follow."],
      ],
      ex: ['Example: the report-card burden', "An audit at a K–12 school showed teachers spent about twelve hours each term on report comments. That single finding became the first pilot, because it was frequent, painful and low-risk with anonymised notes."],
      try: ['Run a four-question staff survey in Google Forms.', 'Map one key process step by step.', 'Build a prioritisation matrix with five pain points.'],
      keys: ['Audit problems before choosing tools.', 'Use surveys, conversations and time logs.', 'Prioritise by impact, frequency and feasibility.'],
      quiz: [
        ['An AI strategy should start from:', ['The newest tool', 'Your institution’s real problems', 'A competitor’s website', 'A vendor demo'], 1, 'Problems define value.'],
        ['Which task is the best first candidate?', ['Rare and high-risk', 'Frequent, high-impact and feasible', 'Already efficient', 'Legally sensitive'], 1, 'Quick, safe wins build momentum.'],
      ],
    },
    {
      min: 12,
      goals: ['Select first pilots wisely', 'Design pilots with clear scope and safeguards', 'Choose pilot teams'],
      slides: [
        ["Pilots reduce risk", "A pilot tests an idea with a small group for a fixed time, so you learn before committing the whole institution.", ['Small group', 'Fixed time', 'Learn before scaling']],
        ["Good first pilots", "Choose low-risk, high-visibility tasks: drafting circulars, summarising meetings, differentiated worksheets, or report-comment drafts from teacher notes.", ['Low risk', 'High visibility', 'Clear time savings']],
        ["Scope and safeguards", "Define what is in and out of scope, which tools, which data is allowed, and who checks outputs. Write it on one page.", ['In and out of scope', 'Tools and data rules', 'Who checks output']],
        ["The pilot team", "Choose a mix: enthusiasts, careful sceptics and at least one person from the office team. Sceptics improve the design.", ['Enthusiasts', 'Careful sceptics', 'Office staff too']],
      ],
      read: [
        ['A one-page pilot charter', "- Goal: e.g., reduce time on circular drafting by half.\n- Scope: English circulars only, staff-facing and parent-facing.\n- Tools: approved school accounts.\n- Data: no personal data.\n- Checks: deputy head reviews before release.\n- Team: five staff.\n- Duration: six weeks.\n- Measures: time logs and quality review."],
        ['What to avoid', "Avoid first pilots involving admissions decisions, discipline, high-stakes assessment or sensitive personal data."],
        ['Communicating the pilot', "Tell all staff what is being piloted, why, and when results will be shared. Transparency prevents rumours."],
      ],
      ex: ['Example: two pilots, one month', "A school ran two four-week pilots: AI-drafted circulars in the office and AI-differentiated worksheets in Class 6 science. Both had one-page charters, and both reported time savings with no quality complaints."],
      try: ['Choose two candidate pilots from your audit.', 'Write a one-page charter for one.', 'Select a balanced pilot team.'],
      keys: ['Pilot small, safe and visible tasks first.', 'Write a one-page charter with safeguards.', 'Include sceptics in the team.'],
      quiz: [
        ['Which is an inappropriate first pilot?', ['Drafting circulars', 'AI-made admission decisions', 'Summarising meeting notes', 'Worksheet drafts'], 1, 'High-stakes decisions are not first pilots.'],
        ['Why include sceptics in a pilot team?', ['To slow it down', 'They improve the design by spotting problems', 'They are required by law', 'To end the pilot'], 1, 'Critical voices strengthen pilots.'],
      ],
    },
    {
      min: 12,
      goals: ['Set measurable success criteria for pilots', 'Collect simple data during pilots', 'Decide whether to scale, adjust or stop'],
      slides: [
        ["Define success first", "Before a pilot starts, define what success looks like: time saved, quality maintained, staff satisfaction, and no data incidents.", ['Time saved', 'Quality maintained', 'Satisfaction and safety']],
        ["Simple measures", "Use time logs before and during the pilot, a quality review of samples, a short staff survey, and an incident log.", ['Time logs', 'Quality sample review', 'Survey and incident log']],
        ["Baseline matters", "Measure the current state before the pilot. Without a baseline, you cannot show change.", ['Measure before', 'Measure during', 'Compare fairly']],
        ["Scale, adjust or stop", "At the end, decide: scale if goals were met safely; adjust if promising but flawed; stop if benefits were small or risks high. All three are good outcomes if evidence-based.", ['Scale', 'Adjust', 'Stop']],
      ],
      read: [
        ['Example success criteria', "- At least 40 percent reduction in drafting time.\n- No drop in quality score on a 1–5 review.\n- At least 70 percent of pilot staff want to continue.\n- Zero personal-data incidents."],
        ['Collecting data easily', "Use a Google Form for weekly time logs and feedback, linked to a Sheet with a simple dashboard."],
        ['Reporting', "Share results with all staff, including what did not work. Honest reporting builds trust for the next pilot."],
      ],
      ex: ['Example: stopping is success too', "A pilot of an AI timetable tool showed small time savings but frequent errors. The school stopped it after six weeks, documented why, and redirected effort to a more promising pilot. Staff respected the decision."],
      try: ['Write four success criteria for one pilot.', 'Build a weekly time-and-feedback Form.', 'Plan how you will measure a baseline.'],
      keys: ['Define success before starting.', 'Measure a baseline.', 'Scale, adjust or stop based on evidence.'],
      quiz: [
        ['Why measure a baseline?', ['It is optional', 'To show change compared with before', 'To slow the pilot', 'To impress vendors'], 1, 'Change needs a starting point.'],
        ['A pilot with small gains and high error rates should usually be:', ['Scaled to all staff', 'Stopped or significantly adjusted', 'Kept secret', 'Doubled'], 1, 'Evidence should guide decisions.'],
      ],
    },
  ],

  /* Module 3: Administration on autopilot */
  [
    {
      min: 13,
      goals: ['Use AI to support timetabling and substitutions', 'Draft schedules from constraints', 'Keep a human check on every schedule'],
      slides: [
        ["Scheduling is a puzzle", "Timetables, substitution plans and exam schedules involve many constraints: teacher loads, room availability, subject periods and fairness. AI can help explore options quickly.", ['Many constraints', 'Options quickly', 'Fairness matters']],
        ["List constraints clearly", "Give AI the rules: periods per subject, teacher availability, maximum consecutive periods, room limits and preferences. Clear constraints give better drafts.", ['Periods and loads', 'Availability and rooms', 'Maximum consecutive periods']],
        ["Substitutions", "For daily substitutions, give the absent teachers, free periods of others, and fairness rules, and ask for a draft plan that spreads load evenly.", ['Absent teachers', 'Free periods', 'Even load']],
        ["Check everything", "AI often makes subtle errors in schedules, such as double-booking. Use spreadsheet checks or dedicated timetabling software for final versions, and have a person verify.", ['Watch for double-booking', 'Spreadsheet checks', 'Human verification']],
      ],
      read: [
        ['A substitution prompt', "‘Absent today: T3 (periods 2, 5), T7 (periods 1, 4). Free teachers by period: [table]. Rules: nobody takes more than two substitutions; prefer same-subject teachers. Produce a table of period, class, substitute, and flag any period you cannot cover.’"],
        ['When to use dedicated tools', "Full-school timetables are complex. Dedicated timetabling software or your school ERP is usually more reliable; AI is useful for exploring options, checking clashes and drafting communication."],
        ['Fairness tracking', "Keep a running Sheet of substitutions per teacher per month and use COUNTIF to keep the load fair."],
      ],
      ex: ['Example: the 7:30 am substitution list', "A deputy head used a saved prompt with a substitution table each morning. Drafting the plan dropped from 25 minutes to 8, and a fairness Sheet ended complaints about uneven load."],
      try: ['Write your substitution rules as a prompt template.', 'Create a fairness-tracking Sheet.', 'Test the prompt on yesterday’s absences and check for clashes.'],
      keys: ['Clear constraints produce better schedules.', 'AI explores options; people verify.', 'Track fairness over time.'],
      quiz: [
        ['A common AI scheduling error to check for is:', ['Too many colours', 'Double-booking a teacher or room', 'Using tables', 'Short names'], 1, 'Clashes are easy to miss.'],
        ['For a full-school timetable, AI is best used to:', ['Replace all software and checks', 'Explore options and check clashes alongside proper tools', 'Decide alone', 'Avoid constraints'], 1, 'Combine AI with reliable tools and checks.'],
      ],
    },
    {
      min: 12,
      goals: ['Draft circulars and notices quickly and clearly', 'Build FAQs from repeated questions', 'Improve parent communication with AI support'],
      slides: [
        ["Clear communication saves time", "Unclear circulars create dozens of follow-up calls. AI helps draft clear, consistent messages and FAQs, reducing confusion and office load.", ['Unclear messages cost time', 'Clear drafts quickly', 'Fewer follow-up calls']],
        ["Circular structure", "A clear circular states what is happening, who it affects, when, what parents must do, and whom to contact. Ask AI to follow this structure.", ['What and who', 'When', 'Action and contact']],
        ["FAQs", "Collect the questions parents ask most, then ask AI to draft concise answers you verify. Publish them on the website or as a pinned message.", ['Collect common questions', 'Draft concise answers', 'Verify and publish']],
        ["Languages and tone", "Draft in English and other languages your families use, with a warm, respectful tone. Check translations with fluent staff before sending.", ['Multilingual drafts', 'Warm, respectful tone', 'Check translations']],
      ],
      read: [
        ['A circular prompt', "‘Draft a parent circular. Event: annual sports day, 14 December, 8 am to 1 pm, school ground. Affects: Classes 1–8. Parents must send students in house T-shirts with water bottles; parents welcome from 10 am. Contact: sports office, extension 214. Under 150 words, warm tone.’"],
        ['From questions to FAQ', "Ask office staff to log parent questions for two weeks in a Sheet. Ask AI to group them into themes and draft answers. Review with the relevant staff before publishing."],
        ['Consistency', "Create a style guide prompt: school name, signature, tone, date format. Paste it at the start of every communication prompt."],
      ],
      ex: ['Example: admission FAQ', "During admissions, the office logged 140 calls in two weeks, mostly about the same twelve questions. A verified FAQ page and WhatsApp auto-reply cut calls by half the following week."],
      try: ['Draft a circular using the five-part structure.', 'Log parent questions for a week.', 'Create a style-guide prompt for your institution.'],
      keys: ['Structure circulars: what, who, when, action, contact.', 'Turn repeated questions into verified FAQs.', 'Check translations before sending.'],
      quiz: [
        ['A clear circular must include:', ['Only the date', 'What, who, when, required action and contact', 'A long history', 'Images only'], 1, 'Complete information prevents follow-up calls.'],
        ['Before publishing AI-drafted FAQs, you should:', ['Publish immediately', 'Verify answers with the relevant staff', 'Remove contacts', 'Translate twice'], 1, 'Accuracy is essential.'],
      ],
    },
    {
      min: 11,
      goals: ['Turn meeting notes into clear summaries', 'Track actions and owners', 'Follow up consistently'],
      slides: [
        ["Meetings that lead to action", "Many meetings end with good discussion but unclear actions. AI can turn rough notes or transcripts into summaries with decisions, actions, owners and deadlines.", ['Decisions', 'Actions and owners', 'Deadlines']],
        ["Capture well", "Take brief notes or, where allowed and consented, use transcription. Mark decisions and actions as they happen.", ['Brief notes', 'Consent for transcription', 'Mark decisions live']],
        ["Summarise and assign", "Ask AI to produce a one-page summary with a table of actions, owners and due dates. Check it, then share within 24 hours.", ['One-page summary', 'Action table', 'Share within a day']],
        ["Follow up", "Track actions in a shared Sheet or task tool and review them at the start of the next meeting.", ['Shared action tracker', 'Review next meeting', 'Close the loop']],
      ],
      read: [
        ['A summary prompt', "‘Turn these notes into a meeting summary with headings: attendees, decisions, actions (table: action, owner, due date), open questions. Keep it under one page. Notes: [paste].’"],
        ['Privacy in meetings', "Do not paste confidential HR or student-welfare discussions into unapproved tools. Summarise those manually or with approved, secure tools."],
        ['Tools that help', "Google Meet and other platforms may offer note-taking and transcription features depending on your edition. Check settings and inform participants."],
      ],
      ex: ['Example: the actions table', "A principal began sending AI-assisted summaries with an action table after every leadership meeting. Within a term, the share of actions completed on time rose noticeably, because owners and dates were clear."],
      try: ['Summarise notes from a recent meeting with the prompt.', 'Create an action-tracker Sheet.', 'Review open actions at your next meeting.'],
      keys: ['Summaries should list decisions, actions, owners and dates.', 'Share within 24 hours.', 'Keep confidential discussions out of unapproved tools.'],
      quiz: [
        ['The most useful part of a meeting summary is usually:', ['Who arrived late', 'The action table with owners and dates', 'The weather', 'Long quotes'], 1, 'Clear actions drive follow-through.'],
        ['Confidential HR discussions should be:', ['Pasted into any chatbot', 'Kept out of unapproved tools', 'Shared publicly', 'Ignored'], 1, 'Sensitive data needs protection.'],
      ],
    },
  ],

  /* Module 4: Data-driven decisions */
  [
    {
      min: 13,
      goals: ['Analyse results, attendance and fee data with AI support', 'Ask the right questions of data', 'Protect personal information'],
      slides: [
        ["Data you already have", "Schools hold rich data: results, attendance, fee payments, admissions and staff records. Analysed well, it shows where to act.", ['Results and attendance', 'Fees and admissions', 'Where to act']],
        ["Start with questions", "Begin with a question: which classes have falling attendance? Which subjects show the biggest gaps between sections? Which fee categories have rising arrears?", ['Attendance trends', 'Subject and section gaps', 'Fee arrears']],
        ["AI as analyst", "With anonymised or aggregated data, AI can suggest analyses, write formulas, summarise patterns and draft charts. You verify the numbers.", ['Suggest analyses', 'Formulas and charts', 'You verify numbers']],
        ["Protect data", "Aggregate or anonymise before using general AI tools. Keep identifiable data inside approved systems.", ['Aggregate or anonymise', 'Approved systems for personal data', 'Least data necessary']],
      ],
      read: [
        ['Useful aggregate views', "- Attendance by class and month.\n- Average results by subject and section.\n- Fee collection rate by category and month.\n- Admissions enquiries versus confirmations by source."],
        ['A data prompt', "‘Here is aggregated attendance by class and month for this year. Identify the three biggest declines, suggest possible reasons to investigate, and propose a chart for the management meeting.’"],
        ['Interpreting carefully', "Correlation is not causation. A fall in attendance may relate to weather, festivals, transport or illness. Investigate before acting."],
      ],
      ex: ['Example: the Class 9 dip', "Aggregated data showed Class 9 attendance dropping every February. Conversations revealed students skipping school for coaching classes before exams. The school adjusted its revision schedule and saw a smaller dip the next year."],
      try: ['Write three questions you want your data to answer.', 'Build one aggregated table for analysis.', 'Use AI to suggest a chart and check the numbers.'],
      keys: ['Start with questions, not data dumps.', 'Aggregate or anonymise first.', 'Investigate causes before acting.'],
      quiz: [
        ['Before using a general AI tool for analysis, data should be:', ['Fully identifiable', 'Aggregated or anonymised', 'Printed', 'Deleted'], 1, 'Protect personal information.'],
        ['A correlation in school data means:', ['A proven cause', 'A pattern to investigate', 'Nothing', 'A mistake'], 1, 'Patterns need investigation.'],
      ],
    },
    {
      min: 13,
      goals: ['Forecast enrolment and costs with simple models', 'Use scenarios rather than single predictions', 'Communicate uncertainty'],
      slides: [
        ["Planning ahead", "Enrolment drives fees, staffing and space. Simple forecasts help leaders plan admissions campaigns, hiring and budgets.", ['Enrolment drives everything', 'Staffing and space', 'Budgets']],
        ["Simple models", "Use past years’ enrolment by grade, typical progression rates and new admissions to project next year. AI can help build the spreadsheet formulas.", ['Past enrolment by grade', 'Progression rates', 'New admissions']],
        ["Scenarios", "Create three scenarios: cautious, expected and optimistic. Plan for the expected, prepare for the cautious.", ['Cautious', 'Expected', 'Optimistic']],
        ["Communicate uncertainty", "Present forecasts as ranges with assumptions stated. Leaders who understand the uncertainty make better decisions.", ['Ranges, not single numbers', 'State assumptions', 'Revisit regularly']],
      ],
      read: [
        ['A cohort-progression model', "Next year’s Class 7 = this year’s Class 6 × retention rate + expected new admissions to Class 7. Repeat for each grade. Use past three years to estimate retention."],
        ['Cost forecasts', "Combine enrolment scenarios with fee rates, staff ratios and fixed costs to estimate income and expenses for each scenario."],
        ['A prompt to build it', "‘Help me build a Google Sheets model projecting enrolment by grade for next year using three years of data, retention rates and new admissions, with cautious, expected and optimistic scenarios.’"],
      ],
      ex: ['Example: the cautious scenario', "A school’s expected forecast suggested two new Class 1 sections, but the cautious scenario showed one. The school hired one permanent teacher and arranged a contingency plan for the second section. Admissions landed between the two."],
      try: ['Collect three years of enrolment by grade.', 'Build a simple cohort-progression model.', 'Create three scenarios and present them as a range.'],
      keys: ['Cohort progression gives practical forecasts.', 'Use scenarios, not single predictions.', 'State assumptions and revisit.'],
      quiz: [
        ['Why present forecasts as scenarios?', ['To confuse people', 'To show uncertainty and support planning', 'Because AI requires it', 'To avoid decisions'], 1, 'Ranges reflect real uncertainty.'],
        ['Next year’s Class 7 is roughly:', ['This year’s Class 7', 'This year’s Class 6 × retention + new admissions', 'A random guess', 'Total school size'], 1, 'Cohorts move up a grade.'],
      ],
    },
    {
      min: 12,
      goals: ['Design a simple management dashboard', 'Choose a few meaningful indicators', 'Use dashboards to drive discussion and action'],
      slides: [
        ["Few indicators, clear story", "A good management dashboard shows a few indicators that matter, with trends and targets, on one screen.", ['A few indicators', 'Trends and targets', 'One screen']],
        ["Pick indicators", "Typical choices: attendance rate, results by subject, fee collection rate, admissions pipeline, staff vacancies and parent satisfaction.", ['Attendance and results', 'Fees and admissions', 'Staffing and satisfaction']],
        ["Build in Sheets or Looker Studio", "Google Sheets charts or Looker Studio can turn live data into a dashboard that updates automatically. AI can help with formulas and layout ideas.", ['Sheets charts', 'Looker Studio', 'Automatic updates']],
        ["Use it in meetings", "Start each management meeting with the dashboard: what changed, why, and what we will do. Data then drives actions, not just reports.", ['What changed', 'Why', 'What we will do']],
      ],
      read: [
        ['Dashboard design tips', "- One page, top-left most important.\n- Show trend lines, not just this month.\n- Add a target line where useful.\n- Use consistent colours; red only for problems.\n- Label everything clearly."],
        ['Data sources', "Connect forms, ERP exports or Sheets maintained by the office. Agree who updates each source and when."],
        ['Avoid vanity metrics', "Indicators that always look good but do not change decisions waste space. Choose ones that would prompt action if they changed."],
      ],
      ex: ['Example: the monthly ten-minute review', "A principal started leadership meetings with a one-page dashboard of six indicators. Discussions became shorter and more focused, and fee follow-up improved because the trend was visible every month."],
      try: ['Choose five indicators for your dashboard.', 'Build a one-page prototype in Sheets.', 'Plan who updates each data source.'],
      keys: ['Choose a few action-driving indicators.', 'Show trends and targets on one page.', 'Start meetings with the dashboard.'],
      quiz: [
        ['A good dashboard indicator is one that:', ['Always looks good', 'Would prompt action if it changed', 'Is hard to understand', 'Changes yearly only'], 1, 'Indicators should drive decisions.'],
        ['Dashboards are most useful when:', ['Hidden in a folder', 'Discussed at the start of meetings', 'Updated once a year', 'Only colourful'], 1, 'Regular use drives action.'],
      ],
    },
  ],

  /* Module 5: People: hiring and teacher development */
  [
    {
      min: 12,
      goals: ['Draft clear, inclusive job descriptions', 'Create structured shortlisting criteria', 'Prepare competency-based interview questions'],
      slides: [
        ["Better hiring starts with clarity", "Clear job descriptions attract suitable candidates and reduce unsuitable applications. AI helps draft them quickly from your requirements.", ['Clear requirements', 'Better applicant pool', 'Faster drafting']],
        ["Job descriptions", "Include role purpose, responsibilities, essential and desirable qualifications, what you offer, and how to apply. Use inclusive, plain language.", ['Purpose and responsibilities', 'Essential vs desirable', 'Inclusive language']],
        ["Shortlisting criteria", "Turn essential requirements into a scoring rubric so every application is judged on the same criteria.", ['Criteria from essentials', 'Score each consistently', 'Document decisions']],
        ["Interview questions", "Ask AI for competency-based questions linked to each criterion, plus a demo-lesson brief and a scoring guide for the panel.", ['Linked to criteria', 'Demo-lesson brief', 'Panel scoring guide']],
      ],
      read: [
        ['A JD prompt', "‘Draft a job description for a CBSE TGT English teacher, Classes 6–10. Essential: B.Ed, subject degree, two years’ experience. Desirable: debate coaching, Google Classroom skills. Include purpose, responsibilities, what we offer, and how to apply. Inclusive, plain language.’"],
        ['Inclusive language', "Avoid unnecessary requirements such as age limits or gendered wording. Ask AI to review your draft for exclusionary language, then check yourself and against applicable laws and policies."],
        ['Interview scoring', "Score each answer against criteria on a 1–4 scale with descriptors, and have panel members score independently before discussing."],
      ],
      ex: ['Example: a sharper applicant pool', "After rewriting a vague ‘teacher wanted’ advert into a clear JD with essential and desirable criteria, a school received fewer but far more relevant applications, and shortlisting took half the time."],
      try: ['Draft a JD for a role you will hire.', 'Turn the essentials into a shortlisting rubric.', 'Generate five competency-based questions and a scoring guide.'],
      keys: ['Clear JDs attract suitable candidates.', 'Rubrics make shortlisting consistent.', 'Questions should link to criteria.'],
      quiz: [
        ['Shortlisting is fairest when:', ['Each reviewer uses their own impression', 'All applications are scored on the same criteria', 'The first ten are chosen', 'Only CV design is considered'], 1, 'Consistency reduces bias.'],
        ['Competency-based questions should be linked to:', ['The candidate’s hobbies', 'The role’s criteria', 'Random topics', 'Salary only'], 1, 'Questions should test what matters.'],
      ],
    },
    {
      min: 12,
      goals: ['Recognise how AI can introduce bias into hiring', 'Keep humans in charge of decisions', 'Set safeguards for fair use'],
      slides: [
        ["Bias can be automated", "AI trained on past data can repeat past biases, for example favouring certain colleges, names or career paths. Automated bias can affect many candidates at once.", ['Learns from past data', 'Can repeat past bias', 'Affects many at once']],
        ["Do not auto-reject", "Never let an AI tool reject candidates automatically. Use it for drafting and organising, and make shortlisting decisions with people using clear criteria.", ['No automated rejection', 'AI for drafting and organising', 'People decide']],
        ["Safeguards", "Remove names and photos at first screening where practical, use structured criteria, have more than one reviewer, and record reasons for decisions.", ['Anonymised first screening', 'Structured criteria', 'Multiple reviewers, recorded reasons']],
        ["Candidate data", "Candidates’ personal data is protected. Do not paste CVs into unapproved AI tools, and handle data according to the DPDP Act and your policies.", ['CVs are personal data', 'Approved tools only', 'Follow data law']],
      ],
      read: [
        ['Checking for bias', "Ask: would this criterion exclude capable candidates for reasons unrelated to the job? Is our shortlist unusually narrow in background? Review a sample of rejected applications periodically."],
        ['Transparency', "Tell candidates how their data is used and stored. If any automated tools are used, be transparent about it and follow applicable law."],
        ['Human review', "AI suggestions are inputs; a named person signs off every decision."],
      ],
      ex: ['Example: the college filter', "A recruitment tool ranked candidates from a few colleges higher because past hires came from them. The school removed the tool from screening, switched to structured criteria and anonymised first review, and hired an excellent teacher the tool had ranked low."],
      try: ['Review your hiring process for possible bias points.', 'Design an anonymised first-screening step.', 'Write a short candidate data-use statement.'],
      keys: ['AI can automate past bias.', 'Never auto-reject candidates.', 'Use anonymised screening and multiple reviewers.'],
      quiz: [
        ['Why should AI not auto-reject candidates?', ['It is too slow', 'It can apply bias at scale without accountability', 'It is too expensive', 'It is always wrong'], 1, 'Human accountability and fairness matter.'],
        ['Which safeguard reduces hiring bias?', ['Single reviewer', 'Anonymised first screening with structured criteria', 'Hiring friends', 'Shorter JDs'], 1, 'Structure and anonymity reduce bias.'],
      ],
    },
    {
      min: 13,
      goals: ['Use evidence from lesson plans and results to plan PD', 'Identify professional development needs across staff', 'Design targeted, sustained PD'],
      slides: [
        ["Evidence-led development", "Professional development works best when it targets real needs. Lesson plans, observations, student results and teacher self-assessments show where support is needed.", ['Target real needs', 'Plans, observations, results', 'Teacher self-assessment']],
        ["Find patterns", "With anonymised or aggregated evidence, AI can help find patterns: common weaknesses in questioning, assessment design or differentiation across departments.", ['Common weaknesses', 'Across departments', 'Aggregated evidence']],
        ["Design PD", "Plan sustained PD: a session, classroom practice, coaching and a follow-up, rather than a single lecture. Group teachers by need.", ['Session plus practice', 'Coaching and follow-up', 'Groups by need']],
        ["Respect and trust", "Use evidence to support, not to judge. Share the purpose, involve teachers in planning, and celebrate improvement.", ['Support, not judgement', 'Involve teachers', 'Celebrate progress']],
      ],
      read: [
        ['A PD needs prompt', "‘From these anonymised observation notes [paste], identify the three most common development needs, suggest a six-week PD sequence for each, and propose how we measure impact.’"],
        ['Mapping needs to PD', "Questioning techniques → peer observation cycles. Assessment design → workshops on rubrics and hinge questions. Differentiation → coaching on AI-supported levelled materials."],
        ['Linking to CPD hours', "NEP 2020 expects teachers to complete 50 hours of CPD each year. Track hours and evidence per teacher in a simple Sheet."],
      ],
      ex: ['Example: questioning focus', "Observation notes across a secondary school showed most questions were recall-only. A six-week cycle of short workshops and peer observation on higher-order questions followed, and later observations showed a clear shift."],
      try: ['Collect anonymised notes from recent observations.', 'Identify the top three needs with AI support and verify them.', 'Design a six-week PD sequence for one need.'],
      keys: ['Target PD with evidence.', 'Sustained PD beats single sessions.', 'Use evidence to support, not judge.'],
      quiz: [
        ['The most effective PD is usually:', ['One long lecture', 'Sustained, practice-based and followed up', 'Optional reading', 'A video only'], 1, 'Sustained practice changes teaching.'],
        ['How should observation evidence be used?', ['To rank teachers publicly', 'To support targeted development', 'To punish', 'Not at all'], 1, 'Support builds trust.'],
      ],
    },
  ],

  /* Module 6: Admissions, marketing and brand */
  [
    {
      min: 12,
      goals: ['Plan an admissions campaign with AI support', 'Define audiences, messages and channels', 'Track the funnel from enquiry to admission'],
      slides: [
        ["Admissions is a campaign", "Successful admissions combine a clear message, the right channels, timely follow-up and a good visit experience. AI helps plan, draft and analyse each part.", ['Clear message', 'Right channels', 'Follow-up and visits']],
        ["Audiences and messages", "Define parent personas, such as first-time Class 1 parents or families moving cities, and what each cares about. Write messages for each.", ['Parent personas', 'What each cares about', 'Tailored messages']],
        ["Calendar and channels", "Plan a campaign calendar: open days, social posts, local events, search listings and referral drives. Ask AI for a draft calendar to refine.", ['Open days and events', 'Social and search', 'Referrals']],
        ["The funnel", "Track enquiries, visits, applications and admissions by source. Follow up every enquiry within 24 hours.", ['Enquiry to admission', 'By source', '24-hour follow-up']],
      ],
      read: [
        ['A campaign prompt', "‘Plan an eight-week admissions campaign for a CBSE K–12 school in a growing suburb. Audiences: first-time Class 1 parents and families relocating. Channels: Instagram, Google Business Profile, local events, referrals. Include weekly actions and messages.’"],
        ['Honest marketing', "Make only claims you can support. Results, facilities and fees must be accurate; misleading claims damage trust and may breach regulations."],
        ['Funnel tracking', "Use a Form for enquiries feeding a Sheet with status columns. A weekly pivot table by source shows what works."],
      ],
      ex: ['Example: the 24-hour rule', "A school found that enquiries answered within a day converted far more often than those answered after three days. It assigned a staff member to daily follow-up and admissions rose without extra advertising."],
      try: ['Define two parent personas and their priorities.', 'Generate an eight-week campaign calendar and refine it.', 'Set up an enquiry tracker with status and source.'],
      keys: ['Plan admissions as a campaign.', 'Tailor messages to parent personas.', 'Track the funnel and follow up fast.'],
      quiz: [
        ['Which action most improves enquiry conversion?', ['More brochures', 'Following up every enquiry within 24 hours', 'Longer forms', 'Higher fees'], 1, 'Speed of response matters.'],
        ['Marketing claims should be:', ['As bold as possible', 'Accurate and supportable', 'Copied from others', 'Vague'], 1, 'Trust depends on accuracy.'],
      ],
    },
    {
      min: 12,
      goals: ['Create website, social and event content efficiently', 'Maintain a consistent brand voice', 'Use visuals and stories responsibly'],
      slides: [
        ["Content shows your school", "Parents judge schools by their website and social media. Consistent, genuine content builds trust.", ['Website and social', 'Consistency', 'Genuine stories']],
        ["Brand voice", "Write a short brand-voice guide: values, tone, words to use and avoid. Paste it into every content prompt.", ['Values and tone', 'Words to use and avoid', 'Use in every prompt']],
        ["Content ideas", "Ask AI for monthly ideas across themes: learning in action, achievements, teacher spotlights, parent tips and events.", ['Learning in action', 'Achievements and spotlights', 'Parent tips and events']],
        ["Consent and accuracy", "Use student photos only with consent, and check facts and names before publishing. Avoid AI-generated images that misrepresent your campus.", ['Consent for photos', 'Check names and facts', 'No misleading images']],
      ],
      read: [
        ['A brand-voice guide', "‘We are warm, confident and clear. We celebrate effort and curiosity. We avoid exaggeration, jargon and comparisons with other schools. We write in short sentences and use real examples.’"],
        ['Website essentials', "Clear admissions information, fee structure or how to enquire, curriculum, facilities with real photos, contact details and updated news."],
        ['Event content', "Before an event, plan a short checklist: three photos, one short video, one quote, and a 100-word post. AI can draft the post from your notes."],
      ],
      ex: ['Example: teacher spotlights', "A school started monthly teacher spotlights with AI-drafted posts based on short interviews. They became its most engaged posts, and helped recruitment too."],
      try: ['Write a brand-voice guide for your school.', 'Generate a month of content ideas.', 'Create an event content checklist.'],
      keys: ['Consistent brand voice builds trust.', 'Real stories beat generic claims.', 'Consent and accuracy come first.'],
      quiz: [
        ['Why paste a brand-voice guide into prompts?', ['To make text longer', 'To keep content consistent', 'It is required', 'To add jargon'], 1, 'Consistency strengthens the brand.'],
        ['Using AI images that misrepresent your campus is:', ['Good marketing', 'Misleading and harmful to trust', 'Required', 'Invisible'], 1, 'Parents expect honesty.'],
      ],
    },
    {
      min: 12,
      goals: ['Draft speeches and presentations for school events', 'Adapt to audiences and occasions', 'Rehearse and deliver with confidence'],
      slides: [
        ["Leaders speak often", "Annual days, parent orientations, staff meetings and board presentations all need clear, memorable speeches. AI helps with structure and first drafts.", ['Annual days and orientations', 'Staff and board meetings', 'Structure and drafts']],
        ["Know the audience", "Tell AI who is listening, how long you have, and the one message they should remember. Everything in the speech should support that message.", ['Who is listening', 'How long', 'One key message']],
        ["Structure", "A simple structure: a story or striking fact, the key message, two or three supporting points with examples, and a clear close or call to action.", ['Opening story', 'Key message and points', 'Strong close']],
        ["Make it yours", "Replace generic lines with real school stories and names (with permission). Rehearse aloud and cut anything that does not sound like you.", ['Real stories', 'Rehearse aloud', 'Your own voice']],
      ],
      read: [
        ['A speech prompt', "‘Draft a five-minute annual-day address for a principal. Audience: parents, students, staff. Key message: curiosity grows when we let children ask questions. Include an opening story placeholder, three achievements placeholders, and a warm close.’"],
        ['Presentations', "For board or management presentations, use few slides: the question, the evidence, the options, the recommendation and the ask."],
        ['Delivery tips', "Practise with a timer, mark pauses, and look at different parts of the audience. Shorter speeches are remembered better."],
      ],
      ex: ['Example: one message', "A principal’s annual-day speech used to list every achievement. With AI help she built it around one message and one student story. Parents quoted it to her for weeks."],
      try: ['Draft a five-minute speech for your next event.', 'Replace generic lines with real stories.', 'Rehearse aloud with a timer.'],
      keys: ['Build speeches around one key message.', 'Use real stories, not generic lines.', 'Rehearse and keep it short.'],
      quiz: [
        ['A memorable speech is usually built around:', ['Every achievement', 'One clear message', 'Long quotations', 'Statistics only'], 1, 'One message is remembered.'],
        ['Before delivering an AI-drafted speech, you should:', ['Read it once', 'Personalise it and rehearse aloud', 'Make it longer', 'Add more slides'], 1, 'Your voice and stories make it real.'],
      ],
    },
  ],

  /* Module 7: Finance, budgets and events */
  [
    {
      min: 12,
      goals: ['Analyse past spending with AI support', 'Categorise and compare expenditure', 'Identify savings and risks'],
      slides: [
        ["Know where money goes", "Before planning budgets, understand past spending by category, month and department. Patterns reveal savings and risks.", ['By category and month', 'By department', 'Savings and risks']],
        ["Clean categories", "Expense data is often messy. AI can suggest consistent categories and formulas to group transactions, which you then check.", ['Consistent categories', 'Grouping formulas', 'Check results']],
        ["Compare and question", "Compare year on year and against enrolment. Ask: which costs grew faster than students? Which are seasonal? Which contracts renew soon?", ['Year on year', 'Per student', 'Renewals and seasonality']],
        ["Confidentiality", "Financial data is sensitive. Use aggregated figures or approved tools, and restrict access to those who need it.", ['Aggregated figures', 'Approved tools', 'Restricted access']],
      ],
      read: [
        ['Useful analyses', "- Pivot table of spend by category and month.\n- Cost per student by category, year on year.\n- Top ten suppliers by spend.\n- Contracts and renewal dates."],
        ['A prompt', "‘Here is aggregated spending by category for three years and student numbers. Calculate cost per student by category, highlight the three fastest-growing costs, and suggest questions to investigate.’"],
        ['Checking numbers', "Always reconcile totals with your accounts. AI can misread or miscalculate; spreadsheet formulas you can inspect are safer for final figures."],
      ],
      ex: ['Example: the printing surprise', "A spending analysis showed printing costs per student had doubled in three years. Moving circulars and worksheets to Classroom and email cut them substantially the next year."],
      try: ['Build a pivot table of last year’s spend by category.', 'Calculate cost per student by category.', 'List three costs to investigate.'],
      keys: ['Analyse past spending before budgeting.', 'Compare per student and year on year.', 'Reconcile all figures with accounts.'],
      quiz: [
        ['Why calculate cost per student?', ['It looks impressive', 'To compare costs fairly as enrolment changes', 'It is required by law', 'To raise fees automatically'], 1, 'Normalising reveals real growth.'],
        ['Final financial figures should be:', ['Taken directly from AI', 'Reconciled with accounts using inspectable formulas', 'Estimated', 'Rounded heavily'], 1, 'Accuracy is essential.'],
      ],
    },
    {
      min: 12,
      goals: ['Build budget forecasts with scenarios', 'Allocate resources to priorities', 'Explain budgets clearly to stakeholders'],
      slides: [
        ["Budgets express priorities", "A budget shows what the institution values. Link spending to your strategic priorities, such as teacher development or technology.", ['Spending shows values', 'Link to priorities', 'Explain choices']],
        ["Forecast with scenarios", "Combine enrolment scenarios with fee income, salaries, fixed costs and planned projects to create cautious, expected and optimistic budgets.", ['Income scenarios', 'Salaries and fixed costs', 'Planned projects']],
        ["Allocate resources", "Use criteria to compare proposals: impact on learning, number of students affected, cost, risk and alignment with priorities. AI can draft a comparison table.", ['Impact and reach', 'Cost and risk', 'Alignment']],
        ["Communicate", "Present budgets with a clear summary, main changes and reasons. Governors and staff support budgets they understand.", ['Clear summary', 'Main changes', 'Reasons']],
      ],
      read: [
        ['A comparison prompt', "‘Compare these four funding proposals [summaries] using criteria: learning impact, students affected, cost, risk, alignment with our three priorities [list]. Output a scored table and a short recommendation, and list assumptions.’"],
        ['Contingency', "Keep a contingency line, often a small percentage of expenditure, for unexpected costs."],
        ['Transparency', "Share appropriate summaries with staff and parents. Explaining why money goes where it does builds trust."],
      ],
      ex: ['Example: choosing between projects', "A school compared a new smart-board purchase with a teacher-coaching programme using a scored table. The coaching programme scored higher on impact per rupee, and the board purchase was phased over two years."],
      try: ['Link your three priorities to budget lines.', 'Build cautious, expected and optimistic income scenarios.', 'Score two proposals against criteria.'],
      keys: ['Budgets should express priorities.', 'Use scenarios and contingency.', 'Compare proposals with clear criteria.'],
      quiz: [
        ['A contingency line is for:', ['Staff parties', 'Unexpected costs', 'Marketing only', 'Nothing'], 1, 'It absorbs surprises.'],
        ['Proposals are best compared by:', ['Who shouts loudest', 'Clear criteria such as impact, cost and risk', 'Alphabetical order', 'Random choice'], 1, 'Criteria make decisions fair.'],
      ],
    },
    {
      min: 12,
      goals: ['Plan school events with AI-drafted plans and checklists', 'Build event budget sheets', 'Manage risks and roles'],
      slides: [
        ["Events need systems", "Annual days, sports meets and exhibitions involve many people and tasks. A clear plan, checklist and budget prevent last-minute chaos.", ['Plan', 'Checklist', 'Budget']],
        ["Plan and timeline", "Ask AI for a backward timeline from the event date: committees, tasks, owners and deadlines, which you then adapt.", ['Backward timeline', 'Committees and owners', 'Deadlines']],
        ["Checklists", "Generate checklists for venue, safety, sound, seating, refreshments, transport and communication. Assign each item to a person.", ['Venue and safety', 'Logistics', 'Assigned owners']],
        ["Budget and risk", "Build an event budget sheet with estimates and actuals, and a simple risk list: weather, power, crowd, medical. Plan a response for each.", ['Estimates and actuals', 'Risk list', 'Response plans']],
      ],
      read: [
        ['An event prompt', "‘Create a six-week backward plan for an annual day for 1,200 students and 2,000 guests on 20 December. Include committees, tasks, owners (as roles), deadlines, a safety checklist and a budget template with categories.’"],
        ['Safety first', "Confirm fire safety, first aid, crowd management, child supervision ratios and emergency contacts. Follow local regulations."],
        ['After the event', "Hold a short review: what went well, what to change, actual versus budget. Save the plan as a template for next year."],
      ],
      ex: ['Example: the reusable template', "After using an AI-drafted plan and checklist for its science exhibition, a school saved them as templates. The next year’s planning took half the time, and fewer items were forgotten."],
      try: ['Draft a backward plan for an upcoming event.', 'Create a safety and logistics checklist with owners.', 'Build an estimates-versus-actuals budget sheet.'],
      keys: ['Backward planning keeps events on track.', 'Checklists with owners prevent gaps.', 'Plan for risks and review afterwards.'],
      quiz: [
        ['A backward timeline starts from:', ['Today', 'The event date', 'Last year’s event', 'The budget'], 1, 'Plan back from the deadline.'],
        ['After an event, saving the plan as a template:', ['Wastes time', 'Speeds up next year’s planning', 'Is not allowed', 'Increases costs'], 1, 'Templates capture learning.'],
      ],
    },
  ],

  /* Module 8: Policy, privacy and your 90-day plan */
  [
    {
      min: 14,
      goals: ['Draft an AI policy for staff and students', 'Cover permitted uses, data rules and integrity', 'Consult stakeholders and review regularly'],
      slides: [
        ["Why a policy", "An AI policy gives staff and students clarity: what is allowed, what is not, and why. It protects students, staff and the institution.", ['Clarity for everyone', 'Protection', 'Consistency']],
        ["Core sections", "Purpose and principles, approved tools, permitted and prohibited uses, data protection, academic integrity, staff responsibilities, training, and review.", ['Purpose and principles', 'Tools and uses', 'Data, integrity and review']],
        ["Students and integrity", "Include assignment-level rules, such as a traffic-light system, disclosure expectations, and a fair process for suspected misuse that does not rely on AI detectors alone.", ['Assignment-level rules', 'Disclosure', 'Fair process']],
        ["Consult and review", "Draft with AI help, then consult teachers, students, parents and governors. Review at least yearly, because tools and laws change.", ['Consult widely', 'Approve formally', 'Review yearly']],
      ],
      read: [
        ['A policy prompt', "‘Draft an AI acceptable-use policy for a CBSE K–12 school in India. Sections: purpose, principles, approved tools, staff uses, student uses by age group, prohibited uses, data protection (DPDP Act 2023), academic integrity with a traffic-light system, training, incident reporting, review. Plain language, under four pages.’"],
        ['Principles to include', "- Human responsibility for decisions.\n- Transparency about AI use.\n- Protection of personal data.\n- Fairness and inclusion.\n- Learning first: AI supports, not replaces, student thinking."],
        ['Age considerations', "Many AI tools have minimum ages in their terms. Your policy should specify which tools students of each age may use, under what supervision, and with what consent."],
      ],
      ex: ['Example: a policy that worked', "A school drafted a three-page policy with AI help, held two consultation sessions, and revised it based on student feedback about disclosure. Because students helped shape the rules, they followed them more willingly."],
      try: ['Draft an AI policy using the prompt and edit it to your context.', 'Plan consultations with staff, students and parents.', 'Set a review date.'],
      keys: ['A policy brings clarity and protection.', 'Include integrity rules and fair processes.', 'Consult widely and review yearly.'],
      quiz: [
        ['A strong AI policy should include:', ['Only a ban', 'Permitted uses, data rules, integrity and review', 'Vendor adverts', 'Staff salaries'], 1, 'Comprehensive but clear.'],
        ['Why review the AI policy regularly?', ['To change logos', 'Tools and laws change', 'It is fun', 'To remove rules'], 1, 'Policy must keep up.'],
      ],
    },
    {
      min: 14,
      goals: ['Understand key DPDP Act 2023 obligations for schools', 'Apply them to AI and edtech use', 'Set practical data-protection steps'],
      slides: [
        ["The DPDP Act in brief", "India’s Digital Personal Data Protection Act, 2023 governs how organisations process digital personal data. A school processing student, parent or staff data acts as a data fiduciary with legal duties.", ['Governs digital personal data', 'Schools are data fiduciaries', 'Legal duties apply']],
        ["Consent and purpose", "Process personal data for a clear, lawful purpose, generally with notice and consent, and collect only what is necessary.", ['Clear purpose', 'Notice and consent', 'Data minimisation']],
        ["Children’s data", "For children (under 18), the Act requires verifiable parental consent, and prohibits processing likely to harm children, as well as tracking, behavioural monitoring and targeted advertising directed at them, subject to exemptions notified by the government.", ['Verifiable parental consent', 'No harmful processing', 'No tracking or targeted ads']],
        ["Security and breaches", "Take reasonable security safeguards, ensure vendors protect data too, and report personal data breaches as required. Penalties for failures can be very large.", ['Reasonable safeguards', 'Vendor responsibility', 'Breach reporting']],
      ],
      read: [
        ['Practical steps for schools', "- Map what personal data you hold and where.\n- Review consent forms and privacy notices for clarity.\n- Check every AI and edtech vendor’s data terms.\n- Restrict access to those who need it.\n- Train staff on data handling and AI use.\n- Prepare a breach response plan.\n- Assign a person responsible for data protection."],
        ['AI-specific rules', "Do not enter identifiable student data into AI tools without a lawful basis, appropriate consent and vendor terms that protect it. Prefer anonymised or aggregated data."],
        ['Stay current', "The DPDP Rules set out detailed procedures and timelines, and further guidance may follow. Check the latest official notifications and seek legal advice for specific questions. This lesson is an overview, not legal advice."],
      ],
      ex: ['Example: the edtech audit', "A school listed every app teachers used with students and found eleven with unclear data terms. It kept five with clear education terms, replaced the rest, and updated its parent consent form to name approved tools."],
      try: ['Map the personal data your institution holds.', 'Audit three edtech or AI vendors’ data terms.', 'Draft a one-page breach response checklist.'],
      keys: ['Schools are data fiduciaries under the DPDP Act.', 'Children’s data needs verifiable parental consent and extra care.', 'Audit vendors and train staff.'],
      quiz: [
        ['Under the DPDP Act, children’s data generally requires:', ['No consent', 'Verifiable parental consent', 'Public sharing', 'Only teacher approval'], 1, 'Parental consent is required for children.'],
        ['A practical first step for DPDP readiness is:', ['Buying new computers', 'Mapping what personal data you hold and where', 'Deleting all records', 'Ignoring vendors'], 1, 'You cannot protect what you have not mapped.'],
      ],
    },
    {
      min: 16,
      goals: ['Create a 90-day AI adoption plan for your institution', 'Sequence quick wins, pilots and policy', 'Present it for approval'],
      slides: [
        ["Your capstone", "Bring everything together in a practical 90-day plan. Ninety days is long enough to show results and short enough to keep focus.", ['90 days', 'Results and focus', 'Practical and specific']],
        ["Days 1 to 30: foundations", "Audit pain points, publish an interim approved-tools list and data rules, form a small working group, and run one staff awareness session.", ['Audit and tools list', 'Working group', 'Awareness session']],
        ["Days 31 to 60: pilots", "Run two small pilots with charters, baselines and measures. Draft the full AI policy and consult stakeholders.", ['Two pilots', 'Baselines and measures', 'Policy consultation']],
        ["Days 61 to 90: decide and scale", "Review pilot evidence, decide to scale, adjust or stop, approve the policy, plan training for the next term, and report to stakeholders.", ['Review evidence', 'Approve policy', 'Plan next term']],
      ],
      read: [
        ['Plan template', "- Vision: one sentence on why AI matters for your institution.\n- Days 1–30 actions, owners, outputs.\n- Days 31–60 actions, owners, outputs.\n- Days 61–90 actions, owners, outputs.\n- Measures of success.\n- Risks and mitigations.\n- Communication plan for staff, students and parents."],
        ['A drafting prompt', "‘Using these notes [paste], write a 90-day AI adoption plan for a school with the template headings. Practical, specific, two pages, for presentation to the management committee.’"],
        ['Presenting it', "Prepare five slides: the problem, the plan, the safeguards, the measures, and the decision you need. Keep it to ten minutes."],
      ],
      ex: ['Example: a plan approved in one meeting', "A principal presented a 90-day plan with two low-risk pilots, a data-protection checklist and clear measures. The management committee approved it in one meeting, because it was specific, safe and time-bound."],
      try: ['Fill in the 90-day plan template for your institution.', 'Draft the full plan with AI and edit it.', 'Prepare a five-slide presentation for approval.'],
      keys: ['Foundations, pilots, then decisions.', 'Make every action owned and measurable.', 'Present a short, specific plan for approval.'],
      quiz: [
        ['In a 90-day plan, pilots usually run during:', ['Days 1–30 before any foundations', 'Days 31–60 after foundations', 'Never', 'Only after a year'], 1, 'Foundations come first.'],
        ['A plan is most likely to be approved when it is:', ['Long and general', 'Specific, safe, measurable and time-bound', 'Secret', 'Unfunded and vague'], 1, 'Clarity and safeguards win support.'],
      ],
    },
  ],
];
