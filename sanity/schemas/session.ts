import { defineType } from "sanity";

export default defineType({
  name: "session",
  title: "Session",
  type: "document",
  fields: [
    {
      name: "userId",
      title: "User ID",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "jti",
      title: "Session ID",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "valid",
      title: "Valid",
      type: "boolean",
      initialValue: true,
    },
    {
      name: "expiresAt",
      title: "Expires At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "userAgent",
      title: "User Agent",
      type: "string",
    },
    {
      name: "createdAt",
      title: "Created At",
      type: "datetime",
    },
  ],
  preview: {
    select: {
      title: "userId",
    },
  },
});