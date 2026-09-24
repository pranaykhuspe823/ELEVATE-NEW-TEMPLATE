export interface CourseResource {
  platform: string;
  type: string;
  url: string;
}

// Mirrors backend/src/services/coursePlanGeneration.ts's buildResources() --
// search-result links only (never a specific course/article URL we can't
// verify exists), so weak topics always have somewhere to go learn, without
// waiting on a faculty-assigned course or an AI course-plan round trip.
export function buildCourseResources(query: string): CourseResource[] {
  const q = encodeURIComponent(query);
  return [
    { platform: "YouTube", type: "video", url: `https://www.youtube.com/results?search_query=${q}` },
    { platform: "Udemy", type: "course", url: `https://www.udemy.com/courses/search/?q=${q}` },
    { platform: "Coursera", type: "course", url: `https://www.coursera.org/search?query=${q}` },
    { platform: "Google", type: "article", url: `https://www.google.com/search?q=${q}` },
  ];
}
