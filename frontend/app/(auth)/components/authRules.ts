export const USERNAME_RULES = {
  required: "Username is required.",
  minLength: {
    value: 4,
    message: "Username must be at least 4 characters.",
  },
  maxLength: {
    value: 32,
    message: "Username must be at most 32 characters.",
  },
  pattern: {
    value: /^[a-zA-Z0-9_-]+$/,
    message:
      "Username can only contain letters, numbers, underscores, and hyphens.",
  },
} as const;

export const PASSWORD_RULES = {
  required: "Password is required.",
  minLength: {
    value: 8,
    message: "Password must be at least 8 characters.",
  },
  maxLength: {
    value: 64,
    message: "Password must be at most 64 characters.",
  },
} as const;
