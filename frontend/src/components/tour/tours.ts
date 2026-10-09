import type { AuthUser } from "../../lib/auth";

export interface TourStep {
  /** Matches a `data-tour` attribute on the page. Without one (or if that
   * element isn't on screen, e.g. the nav on a phone) the card is centred. */
  target?: string;
  /** Leave the step out when its element isn't on the page (rather than
   * showing it centred). For sections that only exist in some states. */
  optional?: boolean;
  title: string;
  body: string;
}

export interface Tour {
  /** The page the tour runs on. */
  home: string;
  steps: TourStep[];
}

export const TOURS: Record<AuthUser["role"], Tour> = {
  STUDENT: {
    home: "/upload",
    steps: [
      {
        title: "Welcome to Elevate 👋",
        body: "A quick tour of how Elevate gets you placement-ready. It takes under a minute, and you can skip any time.",
      },
      {
        target: "upload-dropzone",
        title: "Start with your resume",
        body: "Drop a PDF or DOCX here. In a minute or two you get an ATS score out of 100, the field your resume points to, and the keywords it's missing.",
      },
      {
        target: "upload-outcomes",
        title: "What you get back",
        body: "Fix suggestions for weak bullet points, a skill test built from your own resume, and an AI mock interview.",
      },
      {
        target: "faculty-link",
        optional: true,
        title: "Link your faculty",
        body: "Enter your faculty's share code so they can see your scores, assign you courses and track your progress.",
      },
      {
        target: "nav:/assignments",
        title: "Your courses",
        body: "After the skill test you get recommended courses, each showing how much it can raise your ATS score. Start them, update your progress here, and your faculty sees it too.",
      },
      {
        target: "nav:/drives",
        title: "Campus drives",
        body: "Companies visiting your college, and how well your resume fits each one.",
      },
      {
        target: "account-menu",
        title: "Your account",
        body: "Your profile lives here, and so does this tour. Open it again any time from \"Take the tour\".",
      },
    ],
  },
  FACULTY: {
    home: "/faculty",
    steps: [
      {
        title: "Welcome to your faculty dashboard 👋",
        body: "A quick tour of how you track and support your students. It takes under a minute.",
      },
      {
        target: "share-code",
        title: "Your share code",
        body: "Give this code to your students. When they enter it, they appear on your dashboard.",
      },
      {
        target: "faculty-stats",
        title: "At a glance",
        body: "How many students you have, their average ATS score, who needs attention and how many courses are still open.",
      },
      {
        target: "faculty-roster",
        title: "Your students",
        body: "Each student's field, ATS score, weak topics and average course progress. Open a student to see their full picture, assign courses and review plagiarism flags.",
      },
      {
        target: "nav:/drives",
        title: "Campus drives",
        body: "Upcoming company drives, and which of your students fit each one.",
      },
      {
        target: "account-menu",
        title: "Your account",
        body: "Your profile and password are here, and so is this tour. Open it again any time from \"Take the tour\".",
      },
    ],
  },
  COLLEGE_ADMIN: {
    home: "/college",
    steps: [
      {
        title: "Welcome to your college dashboard 👋",
        body: "A quick tour of how you run Elevate for your college. It takes under a minute.",
      },
      {
        target: "college-overview",
        title: "Your college at a glance",
        body: "Your college's details, plan and how many faculty seats are in use.",
      },
      {
        target: "college-plan",
        optional: true,
        title: "Your plan",
        body: "Trial and renewal dates live here. Faculty keep access as long as the plan is active.",
      },
      {
        target: "college-add-faculty",
        title: "Add your faculty",
        body: "Add faculty by email. They set a password and then share their own code with their students.",
      },
      {
        target: "college-faculty",
        title: "Your faculty",
        body: "Everyone you've added, and whether they've signed in yet.",
      },
      {
        target: "nav:/drives",
        title: "Campus drives",
        body: "Post companies visiting campus with their job description. Elevate matches every student's resume against it.",
      },
      {
        target: "account-menu",
        title: "Your account",
        body: "Your profile is here, and so is this tour. Open it again any time from \"Take the tour\".",
      },
    ],
  },
};
