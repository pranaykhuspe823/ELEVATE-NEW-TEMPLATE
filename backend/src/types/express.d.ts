declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "STUDENT" | "FACULTY" | "COLLEGE_ADMIN" };
    }
  }
}

export {};
