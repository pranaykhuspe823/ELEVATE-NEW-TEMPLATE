// Brand and contact details in one place. Replace the placeholders before going live.
export const site = {
  name: 'Core5Campus',
  company: 'Core5 Systems and Services',
  email: 'core5campus@core5.co.in',
  phone: '',                            // TODO: add the real number; phone links stay hidden while this is empty
  city: 'Mumbai, India',
  // Social profile links for the footer. Leave a link empty to hide it; with none set, the footer shows an Explore column instead.
  social: { facebook: '', linkedin: '', instagram: '', youtube: '' },
  cpdGoal: 50, // annual CPD hours a teacher is expected to complete under NEP 2020
};

export const ROLES = ['Teacher', 'Principal or head', 'Institution owner', 'College faculty', 'Tutor', 'Student teacher', 'Other'];

// Total lesson time, e.g. 290 → "5 hours", 45 → "45 min"
export const fmtHours = (min) => (!min ? '' : min < 60 ? `${min} min` : `${Math.round(min / 30) / 2} hours`);
export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', opts) : '';
export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';

// Card colour and blurb for each catalogue category (keyed by category slug).
export const CATEGORY_INFO = {
  'technology-ai': { swatch: 'green', blurb: 'Google Workspace, Gemini and classroom AI, with certification at the end of every course.' },
};
