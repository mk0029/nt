import { defineType } from "sanity";

export default defineType({
  name: "user",
  title: "User",
  type: "document",
  fields: [
    {
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.required().unique(),
    },
    {
      name: "passwordHash",
      title: "Password Hash",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "securityState",
      title: "Security State",
      type: "string",
      options: {
        list: [
          { title: "Active", value: "active" },
          { title: "Locked", value: "locked" },
          { title: "Forgot", value: "forgot" },
        ],
      },
      initialValue: "active",
    },
    {
      name: "lockPinHash",
      title: "Screen Lock PIN Hash",
      type: "string",
    },
    {
      name: "lockFailedAttempts",
      title: "Lock Failed Attempts",
      type: "number",
      initialValue: 0,
    },
    {
      name: "lockLastFailedAt",
      title: "Last Failed Lock Attempt",
      type: "datetime",
    },
    {
      name: "lockCooldownUntil",
      title: "Lock Cooldown Until",
      type: "datetime",
    },
    {
      name: "lastLockedAt",
      title: "Last Locked At",
      type: "datetime",
    },
    {
      name: "lastUnlockedAt",
      title: "Last Unlocked At",
      type: "datetime",
    },
    {
      name: "createdAt",
      title: "Created At",
      type: "datetime",
    },
  ],
  preview: {
    select: {
      title: "email",
    },
  },
});