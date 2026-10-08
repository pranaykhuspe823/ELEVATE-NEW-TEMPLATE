// Advanced AI for Educators, modules 1–7. Tool names, plans and limits change often; lessons say so where it matters.
export default [
  /* Module 1: AI in education: the basics */
  [
    {
      min: 12,
      goals: ['Describe what today’s AI tools can do well in a school', 'Name the tasks AI should not do on its own', 'Set a sensible first use for your own work'],
      slides: [
        ["A powerful assistant, not a teacher", "Generative AI can draft, summarise, rewrite, translate and brainstorm in seconds. It cannot know your students, take responsibility for decisions, or be trusted without checking. Think of it as a fast assistant that needs supervision.", ['Drafts, summarises, rewrites', 'Does not know your students', 'Needs your supervision']],
        ["Where AI helps teachers", "The biggest time savings come from preparation: first drafts of lesson plans, worksheets at several levels, question banks, rubrics, parent letters and report comments.", ['First drafts of plans and worksheets', 'Differentiated versions', 'Questions, rubrics, letters']],
        ["Where AI should not decide", "AI should not grade high-stakes work alone, make decisions about individual students, or handle sensitive personal data in unapproved tools. Human judgement stays in charge.", ['No unsupervised high-stakes grading', 'No decisions about individuals', 'No sensitive data in unapproved tools']],
        ["The 80 percent rule", "A useful habit: let AI produce about 80 percent of a draft quickly, then spend your time on the 20 percent that needs a teacher: accuracy, level, context and care.", ['AI drafts the first 80%', 'You perfect the last 20%', 'Accuracy, level, context']],
      ],
      read: [
        ['Good first uses', "- Rewrite a reading passage at two levels.\n- Generate ten practice questions with answers, then check them.\n- Draft a polite parent email from your bullet points.\n- Brainstorm three hooks for a lesson opening."],
        ['Not good uses', "- Writing final report comments without reading them.\n- Pasting student names, marks or health details into a public chatbot.\n- Accepting facts, dates or citations without checking.\n- Replacing feedback conversations with students."],
        ['Your school’s policy', "Many schools now have AI guidelines. Check which tools are approved and what data may be used. If there is no policy yet, apply the cautious defaults in this course."],
      ],
      ex: ['Example: Sunday evening saved', "Mr Singh used to spend two hours making three versions of a comprehension worksheet. With a chatbot he now gets drafts in ten minutes and spends twenty more checking and adjusting them. He gets his Sunday evening back."],
      try: ['List five repetitive preparation tasks you do every week.', 'Mark which ones AI could draft and which need you alone.', 'Choose one task to try with AI this week.'],
      keys: ['AI is a fast assistant that needs supervision.', 'Biggest gains are in preparation.', 'Humans decide about students and grades.'],
      quiz: [
        ['Which is an appropriate first use of AI for a teacher?', ['Grading final exams alone', 'Drafting a worksheet at two reading levels', 'Deciding a student’s stream', 'Sharing student medical data'], 1, 'Drafting materials is low-risk and saves time.'],
        ['The “80 percent rule” means:', ['AI is right 80% of the time', 'AI drafts most of the work; you perfect the rest', 'Only use AI for 80 minutes', 'Students use AI 80% of the time'], 1, 'Your expertise goes into the final 20%.'],
      ],
    },
    {
      min: 13,
      goals: ['Explain machine learning in plain words', 'Explain how generative AI produces text and images', 'Use simple analogies with students and parents'],
      slides: [
        ["Machine learning in one sentence", "Machine learning means a computer learns patterns from many examples instead of following hand-written rules. Show it thousands of labelled cat photos, and it learns to recognise cats.", ['Learns patterns from examples', 'Not hand-written rules', 'More data, better patterns']],
        ["Generative AI", "Generative AI goes further: it learns patterns in huge amounts of text, images or audio and then produces new content that follows those patterns.", ['Learns from huge datasets', 'Produces new content', 'Text, images, audio, video']],
        ["Predicting the next word", "Large language models work by predicting the most likely next piece of text, again and again. This is why they sound fluent, and also why they can confidently say things that are not true.", ['Predicts the next word', 'Fluent by design', 'Fluent is not the same as correct']],
        ["An analogy for students", "It is like a student who has read millions of books and is very good at guessing how a sentence usually continues, but who has never checked whether the sentence is true.", ['Read millions of books', 'Great at guessing continuations', 'Never checks the facts']],
      ],
      read: [
        ['Key terms', "- Model: the trained system that produces output.\n- Training data: the examples it learned from.\n- Prompt: what you ask it.\n- Output: what it produces.\n- Large language model (LLM): a model trained on large amounts of text, such as those behind Gemini, ChatGPT and Claude."],
        ['Why it can be wrong', "Because the model predicts likely text, it can produce plausible but false statements, especially about specific facts, numbers, recent events or niche topics. This is often called a hallucination."],
        ['Explaining it to parents', "‘It is a very advanced autocomplete. It is useful for drafts and ideas, but your child still needs to think, check and write in their own words.’"],
      ],
      ex: ['Example: a Class 8 demonstration', "Ms Iyer typed ‘The capital of Australia is’ and asked students to predict the next word before showing the AI’s answer. Many students said Sydney. The discussion about why a likely-sounding answer can be wrong taught them more than a lecture."],
      try: ['Write a two-sentence explanation of generative AI for your students.', 'Ask a chatbot a question in your subject and check one fact in its answer.', 'Prepare the next-word prediction activity for a class.'],
      keys: ['Machine learning learns patterns from examples.', 'Language models predict the next word.', 'Fluent output can still be wrong.'],
      quiz: [
        ['A large language model produces text by:', ['Looking up a database of facts', 'Predicting likely next words', 'Copying one website', 'Asking a human'], 1, 'It generates text by prediction.'],
        ['Why can AI state false facts confidently?', ['It is designed to lie', 'It predicts plausible text without checking truth', 'The internet is slow', 'It is always outdated'], 1, 'Plausible is not the same as true.'],
      ],
    },
    {
      min: 12,
      goals: ['Recognise hallucinations and how to check for them', 'Identify bias in AI output', 'Understand limits such as knowledge cut-offs and context length'],
      slides: [
        ["Three limits to remember", "Every teacher using AI should remember three limits: it can invent things, it can reflect bias, and it does not automatically know recent events or your local context.", ['It can invent things', 'It can reflect bias', 'It may not know recent or local facts']],
        ["Hallucinations", "AI may invent quotes, statistics, book titles or references that look real. Check any fact you will teach against a trusted source, especially numbers, dates and citations.", ['Invented quotes and references', 'Check numbers, dates, citations', 'Use trusted sources']],
        ["Bias", "AI learns from human-written data, so it can repeat stereotypes about gender, caste, region or ability. Read output for who is shown, how, and who is missing.", ['Learned from human data', 'Can repeat stereotypes', 'Check who is shown and missing']],
        ["Context and currency", "Some tools search the web; others rely only on training data with a cut-off date. Board syllabus changes, local examples and Indian context may need you to supply the details.", ['Some tools search, some do not', 'Training data has a cut-off', 'Supply local context yourself']],
      ],
      read: [
        ['A three-step check', "- Verify facts: compare with the textbook, an official site or a reliable reference.\n- Read for bias: are examples diverse and respectful?\n- Check fit: is it right for your board, level and students?"],
        ['Bias in images', "Ask an image generator for ‘a doctor’ or ‘an engineer’ and look at who appears. Use this with students to discuss representation, and add specific descriptions to your own prompts for balanced images."],
        ['When to avoid AI', "For legal, medical or safety guidance, or for high-stakes decisions about students, use official sources and professional judgement instead."],
      ],
      ex: ['Example: the invented study', "A teacher asked for research on homework and got a convincing summary citing a ‘2019 Delhi University study’. She could not find it anywhere. She now asks tools to list sources and checks every one before using it."],
      try: ['Ask a chatbot for three statistics on a topic you teach and verify each.', 'Generate an image of “a scientist” and note any bias.', 'Write your own three-step check on a sticky note for your desk.'],
      keys: ['Verify facts, especially numbers and citations.', 'Read output for bias and missing voices.', 'Supply local and current context yourself.'],
      quiz: [
        ['An AI tool cites a study you cannot find. You should:', ['Use it anyway', 'Treat it as possibly invented and not use it unverified', 'Ask the AI if it is real and trust the answer', 'Cite the AI'], 1, 'Unverifiable citations may be hallucinated.'],
        ['Why can AI output show stereotypes?', ['It is programmed to', 'It learned from human data that contains them', 'Teachers add them', 'It never does'], 1, 'Bias in data can appear in output.'],
      ],
    },
    {
      min: 10,
      goals: ['Describe the main directions AI in education is moving', 'Separate real trends from hype', 'Plan how to keep your skills current'],
      slides: [
        ["What is changing", "AI is moving into the tools teachers already use, becoming more multimodal (text, images, voice, video), and becoming able to act on tasks across apps. Expect AI inside Workspace, learning platforms and phones.", ['AI inside familiar tools', 'Text, image, voice and video', 'Agents that complete tasks']],
        ["What stays the same", "Relationships, judgement, curriculum knowledge and care for students remain the teacher’s job. The most valuable teachers will combine those strengths with AI fluency.", ['Relationships and judgement', 'Subject expertise', 'AI fluency on top']],
        ["Separating hype from reality", "Ask three questions of any new claim: Is there evidence it improves learning? Does it protect student data? Does it save real teacher time? If not, wait and watch.", ['Evidence of learning gains?', 'Protects student data?', 'Saves real time?']],
        ["Staying current", "Spend twenty minutes a month trying one new feature, follow one reliable newsletter or community, and share what works with colleagues.", ['20 minutes a month', 'One reliable source', 'Share with colleagues']],
      ],
      read: [
        ['Trends to watch', "- AI assistants built into Docs, Gmail, Classroom and other platforms.\n- Tutoring tools that adapt to each student.\n- Voice and image input in local languages.\n- Policy and regulation, including data protection laws such as India’s DPDP Act."],
        ['Guarding against hype', "Many products add ‘AI’ to their name. Look for independent reviews, pilot with a small group first, and measure whether it actually helps."],
        ['A personal plan', "Pick two tools to master this term instead of trying ten. Depth beats breadth."],
      ],
      ex: ['Example: a careful pilot', "A school was offered an ‘AI tutor’ for all classes. They piloted it with two Class 7 sections for six weeks, compared quiz results and student feedback, and decided to use it only for homework practice."],
      try: ['Write the three hype-check questions where you will see them.', 'Choose two AI tools to master this term.', 'Pick one reliable source to follow for updates.'],
      keys: ['AI is moving inside everyday tools.', 'Teacher judgement and relationships stay central.', 'Test claims with evidence, data and time saved.'],
      quiz: [
        ['Which question best tests an AI product claim?', ['Is the logo modern?', 'Is there evidence it improves learning?', 'Is it popular online?', 'Is it new?'], 1, 'Learning evidence matters most.'],
        ['The best way to keep current is:', ['Try every new tool', 'Small, regular practice with a few tools', 'Wait for training', 'Ignore updates'], 1, 'Steady, focused practice builds fluency.'],
      ],
    },
  ],

  /* Module 2: Chatbots and prompt writing */
  [
    {
      min: 13,
      goals: ['Write prompts with role, context, task and format', 'Add constraints and examples for better output', 'Reuse prompts as templates'],
      slides: [
        ["Why prompts matter", "The quality of AI output depends heavily on the quality of your request. Vague prompts get generic answers. Specific prompts get useful drafts.", ['Vague in, generic out', 'Specific in, useful out', 'Prompting is a teachable skill']],
        ["Role, context, task, format", "A reliable structure: Role, who should the AI act as. Context, who are your students and what do they know. Task, exactly what you want. Format, length, structure and style.", ['Role', 'Context', 'Task', 'Format']],
        ["Add constraints and examples", "Constraints sharpen output: word limits, reading level, Indian examples, avoid jargon. An example of what you want, even one line, guides tone and structure.", ['Word limits and level', 'Local examples', 'Show one example']],
        ["Save your best prompts", "Keep a prompt library in a Google Doc with templates and blanks to fill, such as [class], [topic] and [level]. Reusing a good prompt saves time every week.", ['Prompt library Doc', 'Templates with blanks', 'Share with colleagues']],
      ],
      read: [
        ['A full example', "‘You are an experienced Class 6 science teacher in India (role). My students are mixed-ability, some learning English as a second language (context). Create a 250-word explanation of the water cycle with a daily-life Indian example, and five multiple-choice questions with answers (task). Use short sentences, a heading, and bold the key terms (format).’"],
        ['Useful constraints', "- ‘At a Class 4 reading level.’\n- ‘Use examples from Indian daily life.’\n- ‘No more than 150 words.’\n- ‘Present as a table with three columns.’\n- ‘Ask me three questions before you start.’"],
        ['Template library starters', "Lesson plan, worksheet at two levels, ten MCQs with explanations, rubric for [task], parent email about [issue], report comment from [notes]."],
      ],
      ex: ['Example: before and after', "‘Make a quiz on fractions’ produced ten generic questions. ‘You are a Class 5 maths teacher. Create 8 word problems on comparing fractions using Indian contexts like rotis and cricket overs, with answers and one-line explanations, easy to hard’ produced a set Ms Das used straight away after checking."],
      try: ['Rewrite a vague prompt you have used using role, context, task and format.', 'Compare the two outputs.', 'Start a prompt library Doc with three templates.'],
      keys: ['Role, context, task, format.', 'Constraints and examples improve output.', 'Save and reuse good prompts.'],
      quiz: [
        ['Which part of a prompt describes your students?', ['Role', 'Context', 'Format', 'Signature'], 1, 'Context tells the AI who the output is for.'],
        ['A simple way to guide tone and structure is:', ['Typing in capitals', 'Giving one example of what you want', 'Using more emojis', 'Making the prompt shorter'], 1, 'Examples show the AI the target.'],
      ],
    },
    {
      min: 12,
      goals: ['Compare popular chatbots for teaching tasks', 'Choose a tool by task, privacy and access', 'Avoid relying on a single tool’s answer'],
      slides: [
        ["Many chatbots, similar core", "Gemini, ChatGPT, Claude, Copilot and Meta AI all handle drafting, explaining and rewriting well. Differences show up in integrations, file handling, web access, limits and privacy terms, all of which change often.", ['Similar core abilities', 'Different integrations and limits', 'Features change often']],
        ["Integration matters", "Gemini works closely with Google Workspace, Copilot with Microsoft 365, and Meta AI inside WhatsApp and Instagram. Choose the one that fits where your work already lives, within your school’s approved list.", ['Gemini and Google Workspace', 'Copilot and Microsoft 365', 'Meta AI in WhatsApp']],
        ["Compare on your task", "The best way to choose is to give two or three tools the same prompt and compare: accuracy, level, tone and usefulness for your students.", ['Same prompt, several tools', 'Compare accuracy and level', 'Pick by results']],
        ["Privacy and accounts", "School accounts with education terms usually give better data protection than personal free accounts. Check your school’s guidance before using any tool with school material.", ['Prefer school-approved accounts', 'Read the data terms', 'No student personal data']],
      ],
      read: [
        ['A comparison you can run', "Give the same prompt to two tools: ‘Explain photosynthesis to a Class 7 student in 150 words with an Indian example, and give three check questions.’ Score each from 1 to 5 on accuracy, clarity, level and usefulness."],
        ['Free plans and limits', "Free plans often have daily limits, fewer features or older models. Paid or school plans may add file uploads, longer documents and stronger privacy terms. Check the current terms; they change frequently."],
        ['Second opinions', "For important facts, ask a second tool or, better, a trusted source. Agreement between two chatbots is not proof; both can repeat the same error."],
      ],
      ex: ['Example: a department test', "The English department ran the same five prompts through three chatbots and rated the results together. They chose one as their main tool and kept another for second opinions."],
      try: ['Run the photosynthesis (or a subject-specific) prompt through two tools.', 'Score them on accuracy, clarity, level and usefulness.', 'Check which tools your school has approved.'],
      keys: ['Core abilities are similar; integrations differ.', 'Compare tools on your real tasks.', 'Prefer approved school accounts for privacy.'],
      quiz: [
        ['The most reliable way to pick a chatbot for your work is:', ['Choose the most advertised', 'Test the same prompt on several and compare', 'Ask students', 'Use the newest one'], 1, 'Your tasks decide what works best.'],
        ['Two chatbots give the same fact. This means:', ['It is definitely true', 'It still needs checking with a trusted source', 'It is false', 'You should cite both'], 1, 'Agreement is not verification.'],
      ],
    },
    {
      min: 11,
      goals: ['Improve output with follow-up prompts', 'Ask AI to critique and check its own work', 'Apply a final human check before using output'],
      slides: [
        ["The first answer is a draft", "Treat the first response as a starting point. Follow-up prompts refine level, length, tone and accuracy in seconds.", ['First answer = draft', 'Refine with follow-ups', 'Seconds, not hours']],
        ["Useful follow-ups", "Try: make it simpler; shorten to 100 words; add an Indian example; turn it into a table; give answers separately; make the distractors more plausible.", ['Simpler, shorter, local', 'Table or list', 'Better distractors']],
        ["Ask for self-critique", "Ask the AI to review its own output: ‘Check these questions for errors and ambiguity’ or ‘What might a Class 6 student misunderstand here?’ It often finds problems, though not all.", ['Check for errors and ambiguity', 'What could students misunderstand?', 'Helpful, not complete']],
        ["The final human check", "Before sharing anything with students, read it fully. Check facts, level, tone, inclusion and fit with your syllabus. You are accountable for what you use.", ['Read it fully', 'Facts, level, tone', 'You are accountable']],
      ],
      read: [
        ['A follow-up chain', "1. Draft: ‘Create 10 MCQs on the French Revolution for Class 9.’\n2. Refine: ‘Make 3 easy, 4 medium and 3 hard.’\n3. Improve: ‘Make wrong options plausible, based on common misconceptions.’\n4. Check: ‘List any question that could have two correct answers.’\n5. Format: ‘Give the answer key with one-line explanations separately.’"],
        ['Checking checklist', "- Facts and dates correct.\n- Language at the right level.\n- Examples respectful and relevant.\n- Matches the syllabus and learning objective.\n- No copied text from copyrighted sources presented as your own."],
        ['Know when to stop', "If the output is still poor after three follow-ups, rewrite your original prompt with clearer context, or do that part yourself."],
      ],
      ex: ['Example: fixing ambiguous questions', "After asking a chatbot to check its own quiz, Mr Kumar learnt that two questions had more than one defensible answer. He fixed them before his class found out the hard way."],
      try: ['Generate a ten-question quiz and improve it with four follow-ups.', 'Ask the AI to find ambiguous questions.', 'Do your final human check with the checklist.'],
      keys: ['Refine first answers with follow-ups.', 'Ask AI to critique its own output.', 'Always do a final human check.'],
      quiz: [
        ['After a weak first answer, the best next step is:', ['Give up on AI', 'Use a specific follow-up prompt', 'Copy it anyway', 'Ask the same question again'], 1, 'Follow-ups refine output quickly.'],
        ['Who is accountable for AI-made material you give students?', ['The AI company', 'You, the teacher', 'The students', 'Nobody'], 1, 'You choose what to use.'],
      ],
    },
  ],

  /* Module 3: AI inside the tools you already use */
  [
    {
      min: 12,
      goals: ['Find AI features inside Docs, Slides, Sheets and Forms', 'Use them for drafting, images, formulas and questions', 'Check outputs as with any AI tool'],
      slides: [
        ["AI where you already work", "Google Workspace now includes Gemini features in many editions, so you can draft, summarise and create without switching apps. Availability depends on your school’s edition and settings.", ['Gemini inside Workspace', 'No app switching', 'Depends on edition']],
        ["Docs and Gmail", "In Docs, AI can draft a first version, rewrite for tone or length, and summarise long documents. In Gmail it can draft replies and summarise threads.", ['Draft and rewrite in Docs', 'Summaries of long documents', 'Draft replies in Gmail']],
        ["Slides and images", "In Slides, AI can generate images and help create slide content. Always check generated images for accuracy and bias before using them with students.", ['Generate slide images', 'Draft slide content', 'Check images carefully']],
        ["Sheets and Forms", "In Sheets, AI can help create tables, formulas and summaries of data. In Forms, it can suggest questions. Test any formula on a few rows you can check by hand.", ['Tables and formulas in Sheets', 'Question ideas in Forms', 'Test formulas by hand']],
      ],
      read: [
        ['Where to find them', "Look for the Gemini or ‘Help me…’ options in the side panel or toolbar of each app. If you cannot see them, your edition or administrator settings may not include them; Gemini in its own app may still be available."],
        ['Good classroom uses', "- Summarise a long circular into five bullet points.\n- Rewrite instructions at a simpler level.\n- Generate an illustration for a story starter.\n- Create a formula that labels marks as Pass or Retry."],
        ['Privacy inside Workspace', "Workspace for Education terms usually govern how data in AI features is handled for school accounts. Your administrator controls what is switched on. Follow your school’s guidance."],
      ],
      ex: ['Example: the twelve-page circular', "A board circular ran to twelve pages. Ms Rao asked Gemini in Docs to summarise what changed for Class 10 science, then checked the summary against the original before sharing it with her department."],
      try: ['Find the Gemini options in Docs and Sheets in your account.', 'Summarise a long document and check the summary.', 'Ask for a formula in Sheets and test it on three rows.'],
      keys: ['Workspace AI features save app switching.', 'Availability depends on edition and settings.', 'Check summaries, images and formulas.'],
      quiz: [
        ['You cannot see Gemini options in Docs. The likely reason is:', ['Your internet is slow', 'Your edition or admin settings', 'Docs is broken', 'You need a new laptop'], 1, 'Features depend on edition and admin settings.'],
        ['Before using an AI-made formula across a class sheet, you should:', ['Trust it', 'Test it on a few rows you can check', 'Delete the data', 'Share it immediately'], 1, 'Testing catches errors early.'],
      ],
    },
    {
      min: 12,
      goals: ['Use Canva’s AI tools to make classroom visuals', 'Keep visuals clear, accurate and inclusive', 'Know what is free on an education account'],
      slides: [
        ["Visuals in minutes", "Canva includes AI tools that generate images, write text, resize designs and remove backgrounds. Teachers can use them for posters, worksheets, slides and infographics.", ['Generate images and text', 'Resize and remove backgrounds', 'Posters, worksheets, slides']],
        ["Canva for Education", "Canva offers a free Canva for Education plan to eligible teachers and students. Check eligibility and current features on Canva’s site; plans and AI limits change.", ['Free plan for eligible teachers', 'Classes and assignments', 'Check current features']],
        ["Design for learning", "Good classroom visuals have one message, readable text, high contrast and accurate content. AI can produce attractive designs that are too busy; simplify them.", ['One message per visual', 'Readable, high contrast', 'Simplify busy designs']],
        ["Check images", "Generated images may show errors, such as wrong numbers of fingers or wrong map shapes, or stereotypes. Check before you print, especially maps, diagrams and people.", ['Check maps and diagrams', 'Check people and stereotypes', 'Fix before printing']],
      ],
      read: [
        ['Quick wins', "- A classroom rules poster in your school colours.\n- An infographic summarising a chapter.\n- Flashcards with generated illustrations.\n- A certificate template for class achievements."],
        ['Accessibility', "Use at least 24-point text on posters, dark text on light backgrounds, and alt text for digital images. Avoid red–green colour combinations for important information."],
        ['Copyright and credit', "Use Canva’s licensed elements according to its terms, and do not upload copyrighted images you do not have rights to. Credit sources on information graphics."],
      ],
      ex: ['Example: the chapter infographic', "Ms Kaur asked Canva’s AI for a ‘water conservation’ infographic. The first draft had six fonts and tiny text. She kept two icons, one font and four facts she verified, and the result was clear enough to read from the back of the room."],
      try: ['Create a one-message poster for your classroom in Canva.', 'Generate one image and check it for errors.', 'Check your eligibility for Canva for Education.'],
      keys: ['Canva’s AI speeds up classroom visuals.', 'Simplify: one message, readable text.', 'Check generated images before use.'],
      quiz: [
        ['A generated map image should be:', ['Used immediately', 'Checked for accuracy before use', 'Made bigger', 'Coloured red'], 1, 'Generated maps and diagrams can be wrong.'],
        ['Good classroom visuals usually have:', ['Many fonts and colours', 'One clear message and readable text', 'Lots of small text', 'No contrast'], 1, 'Clarity supports learning.'],
      ],
    },
    {
      min: 13,
      goals: ['Create differentiated versions of material with AI', 'Support language learners and students with additional needs', 'Keep personalisation respectful and private'],
      slides: [
        ["One lesson, many learners", "Every class has students at different reading levels, languages and needs. AI makes it practical to create several versions of the same material without hours of extra work.", ['Different levels and needs', 'Several versions quickly', 'Same learning goal']],
        ["Levelled text", "Ask for the same passage at two or three reading levels, keeping key vocabulary. Tools such as Diffit are designed for this, and general chatbots can do it too.", ['Two or three levels', 'Keep key vocabulary', 'Same content, different access']],
        ["Language support", "Provide glossaries with home-language translations, bilingual summaries, or simplified instructions. Check translations with a fluent speaker when possible.", ['Glossaries and translations', 'Bilingual summaries', 'Check with fluent speakers']],
        ["Scaffolds and extensions", "Generate sentence starters, worked examples and graphic organisers for students who need support, and challenge questions for those ready to go further.", ['Sentence starters', 'Worked examples and organisers', 'Challenge questions']],
      ],
      read: [
        ['Prompt pattern', "‘Here is a passage for Class 7. Rewrite it at three levels: (1) simplified for students reading two years below grade, (2) at grade level, (3) extended with one extra challenging idea. Keep these key words: [list]. Add a five-word glossary with Hindi translations for level 1.’"],
        ['Keeping it respectful', "Do not label versions publicly as ‘easy’ or ‘weak’. Use neutral names like A, B, C, or let students choose. Assign versions privately in Classroom."],
        ['Privacy', "Personalise by describing needs in general terms (‘a student who reads two years below grade’), never by entering names, diagnoses or personal details into AI tools."],
      ],
      ex: ['Example: a history source for everyone', "For a Class 8 lesson on the 1857 uprising, Mr Ali created three versions of a source extract and a Hindi glossary. Every student could take part in the same discussion, and two students who usually stayed silent contributed."],
      try: ['Create three levels of one passage you will teach.', 'Add a glossary with home-language translations.', 'Plan how you will assign versions without labels.'],
      keys: ['AI makes differentiation practical.', 'Keep the same learning goal across versions.', 'Personalise respectfully and without personal data.'],
      quiz: [
        ['When personalising with AI, you should describe a student’s needs:', ['With their full name and diagnosis', 'In general terms without personal details', 'By sharing their report card', 'Not at all'], 1, 'General descriptions protect privacy.'],
        ['Levelled versions of a passage should:', ['Have different learning goals', 'Share the same goal and key vocabulary', 'Be labelled “weak” and “strong”', 'Use different topics'], 1, 'Same goal, different access.'],
      ],
    },
  ],

  /* Module 4: Lesson planning and teaching models */
  [
    {
      min: 12,
      goals: ['Use free AI tools to draft lesson and unit plans', 'Align plans to objectives and your syllabus', 'Turn a draft plan into one you can teach'],
      slides: [
        ["From blank page to draft", "AI can produce a complete lesson plan draft in under a minute: objectives, starter, activities, assessment and homework. Your job is to make it fit your class.", ['Objectives to homework', 'Under a minute', 'You make it fit']],
        ["Tools to try", "General chatbots work well with a good prompt. Teacher-focused tools such as MagicSchool and Brisk offer templates for plans, rubrics and more. Free plans and features change, so check current terms.", ['Chatbots with good prompts', 'Teacher tools with templates', 'Free plans vary']],
        ["Give the right inputs", "Include class, subject, board, topic, period length, prior knowledge, resources available and the learning objective. The more specific the inputs, the more usable the plan.", ['Class, board, topic', 'Period length and resources', 'Learning objective']],
        ["Make it yours", "Check timings, replace generic examples with local ones, cut activities that need resources you do not have, and add the questions you know your students will ask.", ['Check timings', 'Local examples', 'Add your expertise']],
      ],
      read: [
        ['A lesson-plan prompt', "‘Create a 40-minute lesson plan for CBSE Class 8 science on friction. Students know about forces. We have a projector and basic lab items but no internet for students. Objective: students can explain two ways friction helps and two ways it is a problem. Include a 5-minute starter, an activity in groups of four, an exit question and homework.’"],
        ['Unit plans', "Ask for a unit overview first (lessons, objectives, assessments), then ask for each lesson separately. Long plans in one request tend to become thin."],
        ['Check against the syllabus', "Paste the relevant syllabus learning outcomes into your prompt and ask the AI to show which activity covers which outcome. Then verify yourself."],
      ],
      ex: ['Example: friction in forty minutes', "Using the prompt above, Ms George got a plan with a rubber-sole sliding starter. She swapped one activity for a version using classroom books and coins, adjusted timings, and taught it the next day."],
      try: ['Write a lesson-plan prompt with all the key inputs for your next lesson.', 'Generate a draft and mark every change you need to make.', 'Map each activity to a syllabus outcome.'],
      keys: ['Specific inputs give usable plans.', 'Plan units in steps, not one huge request.', 'Adapt drafts to your class and resources.'],
      quiz: [
        ['Which input most improves an AI lesson plan?', ['A longer title', 'Class, board, resources and the learning objective', 'Using capital letters', 'Asking politely'], 1, 'Specific context shapes a usable plan.'],
        ['For a full unit, it is best to:', ['Ask for everything at once', 'Ask for an overview, then each lesson', 'Avoid AI', 'Copy last year’s plan'], 1, 'Step-by-step requests give richer detail.'],
      ],
    },
    {
      min: 14,
      goals: ['Plan 5E lessons with AI support', 'Design flipped lessons with AI-made pre-work', 'Create game-based learning activities'],
      slides: [
        ["Teaching models give structure", "Models like 5E, flipped classroom and game-based learning give lessons a proven shape. AI can fill that shape with ideas quickly.", ['Proven lesson shapes', 'AI fills in ideas', 'You choose what fits']],
        ["The 5E model", "Engage, Explore, Explain, Elaborate, Evaluate. Ask AI for one activity per phase for your topic, then choose and adapt the strongest ideas.", ['Engage and Explore', 'Explain and Elaborate', 'Evaluate']],
        ["Flipped with AI", "Use AI to create short pre-work: a summary, a video script you record, or five check questions. Class time then becomes practice, discussion and problem-solving.", ['AI-made pre-work', 'Short video scripts', 'Class time for practice']],
        ["Game-based learning", "AI can design quiz games, escape-room puzzles, role-play scenarios and board-game rules linked to your objectives. Keep the learning goal central, not just the fun.", ['Quiz games and escape rooms', 'Role-plays and board games', 'Learning goal first']],
      ],
      read: [
        ['A 5E prompt', "‘Using the 5E model, suggest two activity options per phase for a Class 6 lesson on states of matter. Use low-cost materials. Mark which options take under 10 minutes.’"],
        ['Escape-room design', "Ask for four puzzles that each require applying a concept (for example, solving equations to get a lock code), a storyline, and answers. Test the puzzles yourself first."],
        ['Measuring success', "Whatever the model, end with an evaluation that checks the learning objective, not just enjoyment."],
      ],
      ex: ['Example: the fractions escape room', "Mr Paul used AI to build a five-puzzle fractions escape room with a ‘lost treasure of Hampi’ story. He checked every answer, printed the clues, and students worked in teams. The exit quiz showed strong gains on equivalent fractions."],
      try: ['Generate 5E options for one topic and choose one per phase.', 'Write a flipped pre-work task with five check questions.', 'Design a four-puzzle escape room and test the answers.'],
      keys: ['Models give shape; AI supplies ideas.', 'Flipped pre-work can be AI-drafted.', 'Games must serve the learning goal.'],
      quiz: [
        ['Which is the correct 5E order?', ['Explain, Engage, Explore, Evaluate, Elaborate', 'Engage, Explore, Explain, Elaborate, Evaluate', 'Explore, Engage, Explain, Evaluate, Elaborate', 'Evaluate first'], 1, 'Engage, Explore, Explain, Elaborate, Evaluate.'],
        ['In a flipped lesson, class time is mainly for:', ['First exposure to content', 'Practice and discussion', 'Silent reading', 'Watching videos'], 1, 'Content moves to pre-work.'],
      ],
    },
    {
      min: 12,
      goals: ['Design interdisciplinary lessons with AI', 'Connect subjects through real-world themes', 'Plan shared assessment across subjects'],
      slides: [
        ["Learning that crosses subjects", "Real problems do not stay inside one subject. Interdisciplinary lessons connect, for example, maths, science and social science around a theme like water, health or the local market.", ['Real problems cross subjects', 'One theme, several subjects', 'Encouraged by NEP 2020']],
        ["AI as a connector", "Give AI a theme and two or three subjects and ask for connections, activities and a final product. It is quick at spotting links teachers might miss.", ['Theme plus subjects', 'Connections and activities', 'A shared final product']],
        ["Shared outcomes", "Agree on outcomes from each subject and one shared product, such as a report, a model or a presentation. Use one rubric with criteria from each subject.", ['Outcomes per subject', 'One shared product', 'One rubric']],
        ["Coordinate with colleagues", "Interdisciplinary work needs planning time with other teachers. Use a shared Doc for the plan and a shared calendar for deadlines.", ['Plan together', 'Shared Doc', 'Shared deadlines']],
      ],
      read: [
        ['Prompt pattern', "‘Design a two-week interdisciplinary project for Class 9 on “the water in our neighbourhood”, combining maths (data handling), science (water quality) and social science (local governance). Include outcomes per subject, weekly activities, and a final product with a rubric.’"],
        ['Theme ideas', "Local market economics, a school energy audit, festivals and food science, monsoon and disaster preparedness, traffic and road safety."],
        ['Keeping it manageable', "Start with a one-week mini-project between two subjects before attempting larger ones."],
      ],
      ex: ['Example: the school energy audit', "Class 8 measured electricity use in classrooms (maths), studied energy conversion (science) and wrote a proposal to the principal (English). AI helped the teachers draft the plan and rubric in one meeting."],
      try: ['Choose a theme relevant to your students.', 'Generate an interdisciplinary plan for two subjects.', 'Draft a shared rubric with one criterion from each subject.'],
      keys: ['Interdisciplinary work mirrors real problems.', 'AI quickly finds connections across subjects.', 'Start small and plan with colleagues.'],
      quiz: [
        ['A strong interdisciplinary project has:', ['Separate unrelated tasks', 'A shared theme and a shared final product', 'Only one subject', 'No assessment'], 1, 'A theme and shared product connect subjects.'],
        ['A manageable first step is:', ['A full-term five-subject project', 'A one-week project between two subjects', 'No planning', 'Letting AI run it'], 1, 'Small pilots build confidence.'],
      ],
    },
  ],

  /* Module 5: Content creation and student engagement */
  [
    {
      min: 12,
      goals: ['Create flashcards, mind maps and worksheets quickly', 'Make infographics and comic strips for engagement', 'Check content quality before use'],
      slides: [
        ["Engaging formats, fast", "Students engage differently with different formats. AI makes it quick to turn one topic into flashcards, a mind map, an infographic, a comic strip or a worksheet.", ['Many formats from one topic', 'Quick to produce', 'Matches different learners']],
        ["Flashcards and mind maps", "Ask for term–definition pairs in a table to import into a flashcard tool, or for a topic hierarchy you can turn into a mind map.", ['Term–definition tables', 'Topic hierarchies', 'Import into tools']],
        ["Comics and infographics", "Ask AI for a four-panel comic script explaining a concept, then build it in Canva or a comic tool. Infographics work well for processes and comparisons.", ['Four-panel comic scripts', 'Processes and comparisons', 'Build in Canva']],
        ["Worksheets with purpose", "A worksheet should practise a specific skill with a clear progression. Ask for easy-to-hard questions and an answer key, then cut anything off-target.", ['One clear skill', 'Easy to hard', 'Answer key included']],
      ],
      read: [
        ['Prompts to try', "- ‘Make 15 flashcards for Class 10 chemistry: acids, bases and salts. Table: term, definition, example.’\n- ‘Create a mind-map outline of the Indian Constitution’s key features for Class 8.’\n- ‘Write a four-panel comic script where a raindrop explains the water cycle.’"],
        ['Quality checks', "Verify definitions against your textbook, check that comics do not oversimplify into errors, and make sure worksheets match what you actually taught."],
        ['Student creation', "Let students use these formats too: groups can produce flashcards or comics to teach each other, with your checklist for accuracy."],
      ],
      ex: ['Example: the raindrop comic', "Ms Fernandes’s Class 5 students read a four-panel comic about a raindrop’s journey before a water-cycle lesson. Asked to retell the journey, almost every student used the right terms."],
      try: ['Generate 15 flashcards for a topic and import them into a flashcard tool.', 'Write a comic script for one concept.', 'Create an easy-to-hard worksheet and check the answers.'],
      keys: ['One topic can become many engaging formats.', 'Worksheets should target one skill with progression.', 'Verify content before students see it.'],
      quiz: [
        ['A good worksheet should:', ['Cover many unrelated skills', 'Practise one skill from easy to hard', 'Have no answers', 'Be as long as possible'], 1, 'Focus and progression support learning.'],
        ['Before using AI flashcards, you should:', ['Print them immediately', 'Verify definitions against your textbook', 'Add more emojis', 'Translate them all'], 1, 'Definitions can be inaccurate.'],
      ],
    },
    {
      min: 13,
      goals: ['Create short videos and audio with AI support', 'Build presentations quickly with tools like Gamma or Slides', 'Keep media accurate, accessible and ethical'],
      slides: [
        ["Media without a studio", "AI can draft video scripts, generate presentation decks, create narration and add captions. A teacher with a phone can now produce clear media for flipped lessons and revision.", ['Scripts and decks', 'Narration and captions', 'A phone is enough']],
        ["Presentations", "Tools like Gamma, and Gemini in Google Slides, generate a first deck from a prompt or a document. Edit hard: cut text, check facts, and keep one idea per slide.", ['Generate a first deck', 'Cut text, check facts', 'One idea per slide']],
        ["Video and audio", "Write a 90-second script with AI, record it yourself on a phone, and add auto-captions. Your own voice builds connection that synthetic voices cannot.", ['90-second scripts', 'Record in your own voice', 'Add captions']],
        ["Ethics of synthetic media", "Do not create realistic fake videos or voices of real people, and label AI-generated media where it matters. Model honest use for students.", ['No fakes of real people', 'Label AI media', 'Model honesty']],
      ],
      read: [
        ['A short-video recipe', "- Ask AI for a 90-second script with a hook, three key points and a question.\n- Edit it into your own words.\n- Record on your phone in a quiet room with good light.\n- Upload as unlisted on YouTube or to Drive, and turn on captions.\n- Attach to Classroom with two check questions."],
        ['Audio overviews', "NotebookLM can create a podcast-style audio overview from your sources. Listen to it fully before sharing; it can still misstate details."],
        ['Accessibility', "Captions help students with hearing difficulties, students learning English, and anyone in a noisy home. Always correct auto-captions for key terms."],
      ],
      ex: ['Example: revision in your own voice', "Before exams, Mr Rao recorded ten 90-second revision videos from AI-drafted scripts he edited. Students watched them on their phones on the bus. Views were highest the night before each paper."],
      try: ['Generate a five-slide deck and edit it to one idea per slide.', 'Write and record a 90-second explainer.', 'Add and correct captions.'],
      keys: ['AI drafts scripts and decks; you edit and voice them.', 'Captions make media accessible.', 'Never fake real people; label AI media.'],
      quiz: [
        ['Why record explainers in your own voice?', ['It is required by law', 'It builds connection with your students', 'AI voices are illegal', 'It is faster'], 1, 'Students respond to their teacher’s voice.'],
        ['Which is an unethical use of AI media?', ['Captioning a video', 'Creating a realistic fake video of a real person', 'Drafting a script', 'Generating a diagram'], 1, 'Deepfakes of real people mislead and harm.'],
      ],
    },
    {
      min: 12,
      goals: ['Align AI-made content to CBSE, ICSE, IGCSE and state boards', 'Use syllabus outcomes in prompts', 'Check terminology and exam style'],
      slides: [
        ["Boards differ", "CBSE, ICSE, IGCSE and state boards differ in content order, depth, terminology and exam style. Generic AI content may not match your board without guidance.", ['Different depth and order', 'Different terms and exam styles', 'Generic content may not match']],
        ["Put the syllabus in the prompt", "Paste the exact learning outcomes or syllabus lines into your prompt and ask the AI to stay within them. This keeps material on target.", ['Paste learning outcomes', 'Stay within scope', 'Ask for outcome mapping']],
        ["Match the exam style", "Ask for question types your board uses, such as case-based questions, assertion–reason, or structured questions, and give one sample question as a model.", ['Case-based and assertion–reason', 'Structured questions', 'Give a sample model']],
        ["Check terminology", "Boards and textbooks sometimes use different terms or spellings for the same idea. Check that output uses your textbook’s terms so students are not confused.", ['Use textbook terms', 'Check spellings and units', 'Avoid confusion']],
      ],
      read: [
        ['A board-aligned prompt', "‘For CBSE Class 10 science, using only these learning outcomes: [paste], create three case-based questions in the style of this example: [paste one]. Include marking points.’"],
        ['Using official resources', "Board websites publish syllabi, sample papers and marking schemes. Use them as sources in NotebookLM or paste extracts into prompts. Verify that you are using the current year’s documents."],
        ['A final alignment check', "For each item, ask: is it in my syllabus, at the right depth, in my board’s style, using my textbook’s terms?"],
      ],
      ex: ['Example: assertion–reason questions', "Ms Jain gave a chatbot two official CBSE assertion–reason examples and the chapter outcomes. The ten questions it produced needed only minor edits, compared with the generic questions she got before."],
      try: ['Find the current syllabus outcomes for one chapter you teach.', 'Generate questions in your board’s style using an official example.', 'Run the four-part alignment check.'],
      keys: ['Put syllabus outcomes into prompts.', 'Match your board’s question styles with a model.', 'Use your textbook’s terminology.'],
      quiz: [
        ['The best way to keep AI content on-syllabus is to:', ['Mention the board name only', 'Paste the specific learning outcomes into the prompt', 'Ask for more content', 'Use a longer prompt about anything'], 1, 'Specific outcomes keep scope tight.'],
        ['To get questions in your board’s exam style, give the AI:', ['A sample question as a model', 'Your password', 'A blank page', 'Only the chapter title'], 0, 'Examples guide style.'],
      ],
    },
  ],

  /* Module 6: Assessment and feedback */
  [
    {
      min: 12,
      goals: ['Generate formative and summative assessment ideas', 'Match assessment type to purpose', 'Use AI to vary assessment formats'],
      slides: [
        ["Two purposes", "Formative assessment checks learning during teaching so you can adjust. Summative assessment measures learning at the end of a unit. AI can help with both, in different ways.", ['Formative: during, to adjust', 'Summative: end, to measure', 'Different designs']],
        ["Formative ideas", "Exit tickets, hinge questions, mini-whiteboard checks, one-minute papers and peer explanations. Ask AI for quick checks tied to the misconception you expect.", ['Exit tickets and hinge questions', 'One-minute papers', 'Target misconceptions']],
        ["Summative ideas", "Tests, projects, presentations and portfolios. AI can draft papers to a blueprint, with marks per section and difficulty spread, which you then review.", ['Tests to a blueprint', 'Projects and portfolios', 'Review every item']],
        ["Vary the format", "Different formats reveal different understanding. Ask AI for alternatives: a diagram to label, a scenario to analyse, an error to correct, a explanation for a younger student.", ['Label a diagram', 'Analyse a scenario', 'Correct an error']],
      ],
      read: [
        ['Hinge questions', "A hinge question is a single multiple-choice question where each wrong answer reveals a specific misconception. Ask: ‘Write a hinge question on [concept] where each wrong option matches a common misconception, and name each misconception.’"],
        ['Blueprints', "A blueprint lists topics, marks, question types and difficulty. Give it to the AI and ask for a paper that follows it exactly, then check the total marks and coverage yourself."],
        ['Keeping it valid', "An assessment is valid if it measures what you taught and intended. Remove any AI-made item that tests something else, such as reading speed instead of science understanding."],
      ],
      ex: ['Example: one hinge question', "Before moving on from electric circuits, Mr Shah asked one hinge question with four options, each matching a misconception. Half the class chose the ‘current is used up’ option, so he spent ten more minutes on it."],
      try: ['Generate a hinge question for your current topic.', 'Write a blueprint for a unit test and ask AI to draft it.', 'Ask for two alternative assessment formats for one objective.'],
      keys: ['Formative adjusts teaching; summative measures it.', 'Hinge questions reveal misconceptions.', 'Blueprints keep AI-made tests valid.'],
      quiz: [
        ['An exit ticket is mainly:', ['Summative', 'Formative', 'A punishment', 'A report card'], 1, 'It informs the next lesson.'],
        ['In a good hinge question, each wrong option:', ['Is random', 'Matches a specific misconception', 'Is obviously wrong', 'Is the same'], 1, 'Wrong answers diagnose thinking.'],
      ],
    },
    {
      min: 12,
      goals: ['Generate assignments with clear success criteria', 'Draft analytic and holistic rubrics', 'Use rubrics for feedback and self-assessment'],
      slides: [
        ["Clear tasks, fair marking", "Students do better work when they know exactly what is expected. AI can draft task instructions and rubrics in minutes, giving you time to refine them.", ['Clear expectations', 'Drafts in minutes', 'Time to refine']],
        ["Assignment design", "Ask for an assignment with a purpose, an audience, steps, a product and a deadline. Authentic tasks, like writing to a real audience, motivate more.", ['Purpose and audience', 'Steps and product', 'Authentic tasks']],
        ["Rubrics", "Analytic rubrics score each criterion separately; holistic rubrics give one overall level. Ask for three to five criteria with observable descriptions at each level.", ['Analytic or holistic', '3–5 criteria', 'Observable descriptions']],
        ["Rubrics for learning", "Share the rubric before the task, use it for self- and peer-assessment, and attach it in Classroom for quick marking.", ['Share before the task', 'Self and peer assessment', 'Attach in Classroom']],
      ],
      read: [
        ['A rubric prompt', "‘Create an analytic rubric for a Class 9 persuasive essay with four criteria: argument, evidence, organisation, language. Four levels each. Describe each level with observable features, not vague words like good or excellent.’"],
        ['Improving descriptions', "Replace vague words: instead of ‘good evidence’ write ‘uses at least two relevant facts or quotes, each explained’. Ask AI to rewrite vague descriptors."],
        ['Student-friendly version', "Ask for a ‘student version’ of the rubric in simple ‘I can’ statements, for self-assessment."],
      ],
      ex: ['Example: a letter to the municipality', "Instead of a generic essay, Ms Banerjee’s class wrote letters to the municipality about a local problem, with an AI-drafted rubric she refined. Three letters received replies, and students saw writing as real."],
      try: ['Generate an authentic assignment for your subject.', 'Draft an analytic rubric and fix any vague descriptors.', 'Create a student ‘I can’ version.'],
      keys: ['Authentic tasks with clear criteria motivate students.', 'Rubric descriptors must be observable.', 'Use rubrics for self-assessment too.'],
      quiz: [
        ['Which rubric descriptor is observable?', ['Good work', 'Uses at least two relevant facts, each explained', 'Excellent effort', 'Nice writing'], 1, 'Observable descriptors make marking fair.'],
        ['An analytic rubric:', ['Gives one overall score', 'Scores each criterion separately', 'Has no criteria', 'Is only for teachers'], 1, 'Separate criteria show strengths and gaps.'],
      ],
    },
    {
      min: 14,
      goals: ['Design assignments that resist AI shortcuts', 'Understand why AI detectors are unreliable', 'Respond fairly to suspected misuse'],
      slides: [
        ["Design beats detection", "Students can ask AI to write essays. The most effective response is redesigning assignments so that real learning is required and visible, not relying on detection software.", ['Redesign assignments', 'Make learning visible', 'Do not rely on detectors']],
        ["AI-resistant features", "Use local and personal contexts, in-class drafting, process evidence such as notes and drafts, oral explanations, and reflections on choices made.", ['Local and personal context', 'In-class drafting', 'Process evidence and oral checks']],
        ["Why detectors fail", "AI-text detectors give false positives, especially for students writing in a second language, and are easy to fool. Their scores should never be the sole basis for an accusation.", ['False positives happen', 'Second-language writers flagged', 'Never the only evidence']],
        ["Responding fairly", "If you suspect misuse, talk with the student. Ask them to explain their work and process. Use your school’s policy, and focus on learning rather than punishment.", ['Talk first', 'Ask them to explain', 'Follow school policy']],
      ],
      read: [
        ['Redesign examples', "- Instead of ‘Write about pollution’, ask ‘Interview two neighbours about pollution on your street and analyse their views.’\n- Collect a draft in class before the final.\n- Add a two-minute viva: ‘Explain your strongest paragraph.’\n- Ask for a reflection: ‘Which source changed your mind and why?’"],
        ['Using version history', "When students write in Google Docs, version history shows how the work developed over time. A whole essay appearing in one paste is a reason for a conversation, not proof."],
        ['Allowing AI openly', "Sometimes the best design allows AI for parts of a task, for example brainstorming, and asks students to show and critique what the AI gave them."],
      ],
      ex: ['Example: the local history project', "Instead of a general essay on independence, Mr Nair asked students to find and interview someone who remembered local events from the 1970s or 80s and connect it to the textbook. AI could not do the interview, and the work was far more personal."],
      try: ['Redesign one existing assignment using two AI-resistant features.', 'Plan a two-minute viva question for it.', 'Read your school’s policy on suspected AI misuse.'],
      keys: ['Assignment design is the best safeguard.', 'Detector scores are unreliable evidence.', 'Respond with conversation and policy, not accusation.'],
      quiz: [
        ['An AI detector flags a student essay. The best next step is:', ['Give zero marks', 'Talk with the student and look at their process', 'Report them to the principal immediately', 'Ignore it'], 1, 'Detectors are unreliable; evidence and conversation matter.'],
        ['Which feature makes an assignment more AI-resistant?', ['A generic topic', 'An interview with a local person', 'A longer word count', 'Typed submission only'], 1, 'Personal, local evidence requires real work.'],
      ],
    },
  ],

  /* Module 7: Data analysis */
  [
    {
      min: 13,
      goals: ['Clean marks data with AI help', 'Write spreadsheet formulas from plain-language requests', 'Protect student data while doing so'],
      slides: [
        ["Messy data is normal", "Marks from different teachers come with different formats, blank cells, spelling variations and merged cells. Cleaning comes before any analysis.", ['Different formats', 'Blanks and spelling variations', 'Clean before analysing']],
        ["Formulas in plain language", "Describe what you want, for example ‘label each mark A if 90 or above, B if 75 or above, otherwise C’, and ask AI for a Google Sheets formula. Test it on rows you can check.", ['Describe in plain words', 'Get the formula', 'Test on known rows']],
        ["Common cleaning tasks", "Trim spaces, standardise names, split full names into columns, convert text to numbers and remove duplicates. Sheets has built-in tools for most of these, and AI can explain them.", ['Trim and standardise', 'Split and convert', 'Remove duplicates']],
        ["Anonymise first", "Before pasting data into a general AI tool, replace names with roll numbers or codes. Better still, ask for the formula only, and apply it in your own sheet.", ['Use codes, not names', 'Ask for formulas, not analysis of real data', 'Keep data in school accounts']],
      ],
      read: [
        ['Useful formulas', "- IFS(B2>=90,\"A\",B2>=75,\"B\",TRUE,\"C\") for grade bands.\n- TRIM and PROPER to tidy names.\n- SPLIT(A2,\" \") to split names.\n- VALUE to convert text to numbers.\n- UNIQUE to list distinct entries.\n- Data → Data cleanup → Remove duplicates."],
        ['Prompt pattern', "‘In Google Sheets, column B has marks out of 80 and column C out of 20. Write a formula for column D with the total out of 100 and column E with the percentage rounded to one decimal place.’"],
        ['Documenting steps', "Keep a short note in the sheet of what you cleaned and how, so colleagues can repeat it next term."],
      ],
      ex: ['Example: five teachers, one sheet', "Combining Class 9 marks from five teachers, Ms Thomas had names in three formats. With AI-suggested TRIM, PROPER and a lookup by roll number, the merged sheet was ready in fifteen minutes instead of an afternoon."],
      try: ['Take a sample marks sheet with roll numbers instead of names.', 'Ask AI for a grade-band formula and test it.', 'Use Data cleanup to remove duplicates.'],
      keys: ['Clean data before analysing.', 'Describe formulas in plain words and test them.', 'Anonymise or keep data in your own sheet.'],
      quiz: [
        ['Before pasting marks into a general AI tool, you should:', ['Add phone numbers', 'Replace names with codes or ask for formulas only', 'Share the whole school database', 'Nothing'], 1, 'Protect student data.'],
        ['After AI writes a formula, you should:', ['Apply it to all rows without checking', 'Test it on rows you can verify', 'Delete it', 'Email it'], 1, 'Testing catches mistakes.'],
      ],
    },
    {
      min: 13,
      goals: ['Spot trends across tests and sections', 'Identify students at risk early', 'Turn findings into support plans'],
      slides: [
        ["Patterns over time", "One test is a snapshot. Several tests show a trend. Look for students whose marks are falling, topics that are weak across sections, and gaps between groups.", ['Trends need several data points', 'Falling marks', 'Weak topics and gaps']],
        ["Early warning signs", "Combine marks with attendance and missing work. A student with falling marks, more absences and missing homework needs a conversation now, not after the term exam.", ['Marks plus attendance', 'Missing work', 'Act early']],
        ["AI-assisted analysis", "With anonymised data, AI can suggest which charts to make, summarise patterns, and draft questions to explore. Your knowledge of the students explains the why.", ['Suggest charts', 'Summarise patterns', 'You explain the why']],
        ["From data to action", "For each at-risk student, plan one small action: a check-in, a peer buddy, a parent call or extra practice. Review after two weeks.", ['One action per student', 'Check-ins and buddies', 'Review in two weeks']],
      ],
      read: [
        ['Simple at-risk rule', "Flag students meeting two of three conditions: average down more than 10 marks since the last test, attendance below 80 percent, two or more missing assignments. Use conditional formatting to highlight them."],
        ['Charts that help', "Line charts per student for trends, column charts per topic for weaknesses, and a pivot table of averages by section."],
        ['Careful interpretation', "Data shows what, not why. A drop could reflect illness, family problems or a hard test. Talk to students before deciding anything."],
      ],
      ex: ['Example: three quiet students', "Mr Verma’s at-risk rule flagged three students nobody had worried about: they were polite and quiet but slipping. Short check-ins revealed one had stopped wearing his glasses. Two weeks later his marks recovered."],
      try: ['Build the at-risk rule with conditional formatting on sample data.', 'Make a line chart for one student’s trend.', 'Plan one action for each flagged student.'],
      keys: ['Trends need several data points.', 'Combine marks, attendance and missing work.', 'Data shows what; conversations reveal why.'],
      quiz: [
        ['Which combination best signals a student at risk?', ['One low quiz', 'Falling marks plus absences and missing work', 'A neat notebook', 'High attendance'], 1, 'Several signals together are more reliable.'],
        ['Data analysis tells you:', ['Why a student struggles', 'What is happening; you find out why', 'Nothing useful', 'Exact future marks'], 1, 'Conversations explain causes.'],
      ],
    },
    {
      min: 12,
      goals: ['Plan a small action-research project', 'Use AI to design data collection and analysis', 'Share findings with colleagues'],
      slides: [
        ["Teacher as researcher", "Action research is a small, practical investigation into your own teaching: try a change, collect evidence, and decide whether it worked.", ['Try a change', 'Collect evidence', 'Decide and share']],
        ["A clear question", "Start with one focused question, such as ‘Do weekly five-question quizzes improve Class 7 recall of key terms?’ Avoid questions too broad to answer in a term.", ['One focused question', 'Answerable in a term', 'About your class']],
        ["Design with AI help", "AI can suggest a simple design: what to measure before and after, how to collect it, and how to analyse it. Keep it small and ethical.", ['Before and after measures', 'Collection plan', 'Simple analysis']],
        ["Share what you learn", "Present a one-page summary to colleagues: question, what you did, results, and what you will do next. Small studies add up across a school.", ['One-page summary', 'Honest results', 'Next steps']],
      ],
      read: [
        ['A four-step cycle', "Plan (question and design), Act (make the change), Observe (collect data), Reflect (analyse and decide). Repeat with improvements."],
        ['Ethics', "Make sure all students still receive good teaching, keep data anonymous when sharing, and inform your school leadership."],
        ['Prompt pattern', "‘I want to test whether [change] improves [outcome] in my Class [x] over six weeks. Suggest a simple before/after design, a data collection plan using Google Forms and Sheets, and how to analyse the results.’"],
      ],
      ex: ['Example: retrieval quizzes', "Ms Pinto tested weekly five-question retrieval quizzes for six weeks. Average term-test marks on key terms rose compared with the previous unit. She shared her one-page summary and three colleagues adopted the routine."],
      try: ['Write one focused action-research question.', 'Generate a simple design with AI and adapt it.', 'Set up a Forms + Sheets data collection.'],
      keys: ['Action research tests one change in your own class.', 'Keep the question focused and the design simple.', 'Share findings honestly.'],
      quiz: [
        ['A good action-research question is:', ['How can education improve?', 'Do weekly five-question quizzes improve recall in my Class 7?', 'What is learning?', 'Is AI good?'], 1, 'Focused and answerable in a term.'],
        ['The action-research cycle is:', ['Plan, Act, Observe, Reflect', 'Read, Write, Test', 'Teach, Test, Forget', 'Ask, Wait, Hope'], 0, 'Plan, Act, Observe, Reflect.'],
      ],
    },
  ],
];
