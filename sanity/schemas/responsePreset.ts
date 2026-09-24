import { defineType } from "sanity";

export default defineType({
  name: "responsePreset",
  title: "Response Preset",
  type: "document",
  fields: [
    {
      name: "userId",
      title: "User ID",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "text",
      title: "Short Response",
      type: "string",
      validation: (Rule) => Rule.required().max(200),
    },
  ],
  preview: {
    select: {
      title: "text",
    },
  },
});